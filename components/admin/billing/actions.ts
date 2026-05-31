'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import {
  DEFAULT_DUE_DAYS,
  generateMonthSchema,
  markPaidSchema,
  updateSaasPlanSchema,
  updateTaxRuleSchema,
} from '@/lib/validations/billing'

async function requireSuperAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Acción reservada al super admin')
  }
  return session.user
}

function firstDayOfNextMonth(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(y!, m!, 1) // m es 1..12, new Date(y, m) = primer día mes siguiente
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Generación mensual: crea Settlements + SaasInvoices para el período
 * indicado. Las Invoice catering→empresa ya existen (generadas en el
 * flujo A existente), aquí solo se agregan.
 */
export async function generateMonthBillingAction(input: {
  period: string
  dryRun?: boolean
}) {
  const actor = await requireSuperAdmin()
  const { period, dryRun } = generateMonthSchema.parse(input)

  // ── Settlements (comisión catering → Plati) ────────────────────
  const caterings = await prisma.tenant.findMany({
    where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null },
    include: {
      restaurants: { select: { commission: true } },
    },
  })

  const dueBy = new Date(firstDayOfNextMonth(period))
  dueBy.setDate(dueBy.getDate() + DEFAULT_DUE_DAYS)

  let settlementsCreated = 0
  let settlementsSkipped = 0

  for (const c of caterings) {
    const existing = await prisma.settlement.findUnique({
      where: { tenantCatering_period: { tenantCatering: c.id, period } },
    })
    if (existing) {
      settlementsSkipped++
      continue
    }

    const invoicesAgg = await prisma.invoice.aggregate({
      where: { tenantCatering: c.id, period },
      _sum: { total: true },
    })
    const gross = Number(invoicesAgg._sum.total ?? 0)

    const commissionRate = c.restaurants[0]
      ? Number(c.restaurants[0].commission)
      : 0.05

    const commissionAmount = Math.round(gross * commissionRate * 100) / 100

    const penaltiesAgg = await prisma.penalty.aggregate({
      where: {
        tenantCatering: c.id,
        status: 'APPLIED',
        appliedAt: {
          gte: new Date(`${period}-01T00:00:00.000Z`),
          lt: firstDayOfNextMonth(period),
        },
      },
      _sum: { amount: true },
    })
    const penalties = Number(penaltiesAgg._sum.amount ?? 0)

    const netOwed = Math.max(0, commissionAmount - penalties)

    if (dryRun) {
      settlementsCreated++
      continue
    }

    const created = await prisma.settlement.create({
      data: {
        tenantCatering: c.id,
        period,
        grossAmount: gross,
        commissionRate,
        commissionAmount,
        penalties,
        netOwed,
        status: 'ISSUED',
        issuedAt: new Date(),
        dueBy,
        integrityHash: sha256(
          `${c.id}|${period}|${gross}|${commissionAmount}|${penalties}|${netOwed}`
        ),
      },
    })

    await logAudit({
      tenantId: c.id,
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Settlement',
      entityId: created.id,
      diff: {
        before: null,
        after: {
          period,
          gross,
          commissionAmount,
          penalties,
          netOwed,
        },
      },
    })

    settlementsCreated++
  }

  // ── SaasInvoices (plan Plati → empresa) ────────────────────────
  const companies = await prisma.company.findMany({
    where: {
      tenant: { status: 'ACTIVE', deletedAt: null },
    },
    select: { tenantId: true, legalName: true, plan: true },
  })

  const plans = await prisma.saasPlan.findMany({ where: { active: true } })
  const planByCode = new Map(plans.map((p) => [p.code, p]))

  const taxRule = await prisma.taxRule.findFirst({
    where: { code: 'IVA_GENERAL', active: true },
  })
  const taxRate = taxRule ? Number(taxRule.rate) : 21

  // Último correlativo del año
  const yearPrefix = `SAAS-${period.slice(0, 4)}-`
  const lastInvoice = await prisma.saasInvoice.findFirst({
    where: { number: { startsWith: yearPrefix } },
    orderBy: { number: 'desc' },
  })
  let counter = lastInvoice
    ? parseInt(lastInvoice.number.slice(yearPrefix.length), 10) + 1
    : 1

  let saasCreated = 0
  let saasSkipped = 0

  for (const c of companies) {
    const plan = planByCode.get(c.plan)
    if (!plan) {
      saasSkipped++
      continue
    }

    const existing = await prisma.saasInvoice.findUnique({
      where: { tenantEmpresa_period: { tenantEmpresa: c.tenantId, period } },
    })
    if (existing) {
      saasSkipped++
      continue
    }

    const subtotal = Number(plan.monthlyPrice)
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = subtotal + taxAmount

    const number = `${yearPrefix}${String(counter).padStart(4, '0')}`
    counter++

    if (dryRun) {
      saasCreated++
      continue
    }

    const created = await prisma.saasInvoice.create({
      data: {
        tenantEmpresa: c.tenantId,
        period,
        planCode: plan.code,
        planName: plan.name,
        number,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: 'ISSUED',
        issuedAt: new Date(),
        dueBy,
        integrityHash: sha256(
          `${c.tenantId}|${period}|${plan.code}|${total}|${number}`
        ),
      },
    })

    await logAudit({
      tenantId: c.tenantId,
      actorId: actor.id,
      action: 'CREATE',
      entity: 'SaasInvoice',
      entityId: created.id,
      diff: {
        before: null,
        after: { period, plan: plan.code, total, number },
      },
    })

    saasCreated++
  }

  if (!dryRun) {
    revalidatePath('/admin/billing')
    revalidatePath('/admin/billing/settlements')
    revalidatePath('/admin/billing/saas-invoices')
  }

  return {
    dryRun: !!dryRun,
    period,
    settlementsCreated,
    settlementsSkipped,
    saasCreated,
    saasSkipped,
  }
}

export async function markSettlementPaidAction(input: {
  id: string
  paymentRef?: string
  paymentMethod?: string
}) {
  const actor = await requireSuperAdmin()
  const data = markPaidSchema.parse(input)

  const current = await prisma.settlement.findUnique({ where: { id: data.id } })
  if (!current) throw new Error('Liquidación no encontrada')
  if (current.status === 'PAID') {
    throw new Error('Ya está pagada')
  }

  const updated = await prisma.settlement.update({
    where: { id: data.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentRef: data.paymentRef,
    },
  })

  await logAudit({
    tenantId: current.tenantCatering,
    actorId: actor.id,
    action: 'INVOICE_PAID',
    entity: 'Settlement',
    entityId: updated.id,
    diff: {
      before: { status: current.status },
      after: { status: 'PAID', paymentRef: data.paymentRef },
    },
  })

  revalidatePath('/admin/billing/settlements')
  revalidatePath('/catering/facturacion')
  return { id: updated.id }
}

export async function markSaasInvoicePaidAction(input: {
  id: string
  paymentRef?: string
  paymentMethod?: string
}) {
  const actor = await requireSuperAdmin()
  const data = markPaidSchema.parse(input)

  const current = await prisma.saasInvoice.findUnique({ where: { id: data.id } })
  if (!current) throw new Error('Factura no encontrada')
  if (current.status === 'PAID') throw new Error('Ya está pagada')

  const updated = await prisma.saasInvoice.update({
    where: { id: data.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentRef: data.paymentRef,
      paymentMethod: data.paymentMethod,
    },
  })

  await logAudit({
    tenantId: current.tenantEmpresa,
    actorId: actor.id,
    action: 'INVOICE_PAID',
    entity: 'SaasInvoice',
    entityId: updated.id,
    diff: {
      before: { status: current.status },
      after: { status: 'PAID' },
    },
  })

  revalidatePath('/admin/billing/saas-invoices')
  revalidatePath('/empresa/facturacion')
  return { id: updated.id }
}

export async function updateSaasPlanAction(
  input: Parameters<typeof updateSaasPlanSchema.parse>[0]
) {
  const actor = await requireSuperAdmin()
  const data = updateSaasPlanSchema.parse(input)

  const updated = await prisma.saasPlan.upsert({
    where: { code: data.code },
    update: {
      name: data.name,
      description: data.description,
      monthlyPrice: data.monthlyPrice,
      yearlyPrice: data.yearlyPrice,
      maxEmployees: data.maxEmployees,
      maxOrdersMonth: data.maxOrdersMonth,
      supportLevel: data.supportLevel,
      active: data.active,
    },
    create: {
      code: data.code,
      name: data.name,
      description: data.description,
      monthlyPrice: data.monthlyPrice,
      yearlyPrice: data.yearlyPrice,
      maxEmployees: data.maxEmployees,
      maxOrdersMonth: data.maxOrdersMonth,
      supportLevel: data.supportLevel,
      active: data.active,
    },
  })

  await logAudit({
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'SaasPlan',
    entityId: updated.id,
    diff: { before: null, after: { code: data.code, monthlyPrice: data.monthlyPrice } },
  })

  revalidatePath('/admin/billing/plans')
  return { id: updated.id }
}

export async function upsertTaxRuleAction(
  input: Parameters<typeof updateTaxRuleSchema.parse>[0]
) {
  const actor = await requireSuperAdmin()
  const data = updateTaxRuleSchema.parse(input)

  const rule = data.id
    ? await prisma.taxRule.update({
        where: { id: data.id },
        data: {
          code: data.code,
          name: data.name,
          rate: data.rate,
          category: data.category,
          region: data.region,
          validFrom: data.validFrom,
          validTo: data.validTo,
          active: data.active,
        },
      })
    : await prisma.taxRule.create({
        data: {
          code: data.code,
          name: data.name,
          rate: data.rate,
          category: data.category,
          region: data.region,
          validFrom: data.validFrom,
          validTo: data.validTo,
          active: data.active,
        },
      })

  await logAudit({
    actorId: actor.id,
    action: data.id ? 'UPDATE' : 'CREATE',
    entity: 'TaxRule',
    entityId: rule.id,
    diff: { before: null, after: { code: data.code, rate: data.rate } },
  })

  revalidatePath('/admin/billing/taxes')
  return { id: rule.id }
}
