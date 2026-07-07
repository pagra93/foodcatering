'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { Prisma, type InvoiceStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import {
  DEFAULT_DUE_DAYS,
  generateMonthSchema,
  markPaidSchema,
  updateTaxRuleSchema,
} from '@/lib/validations/billing'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new Error('No tienes permiso para esta acción')
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
  const actor = await requireSuperAdmin('settlement:create')
  const { period, dryRun } = generateMonthSchema.parse(input)

  // ── Settlements (comisión catering → Plati) ────────────────────
  const caterings = await prisma.tenant.findMany({
    where: { type: 'CATERING', status: 'ACTIVE', deletedAt: null },
    include: {
      restaurants: {
        select: {
          saasPlan: {
            select: { pricingModel: true, commissionPct: true, flatMonthlyFee: true },
          },
        },
      },
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

    // La comisión se calcula sobre la BASE IMPONIBLE (subtotal, sin IVA): el IVA
    // lo recauda el catering para Hacienda, no forma parte de su facturación.
    // Base de la comisión: SOLO facturas realmente emitidas. Excluir borradores
    // (DRAFT) y anuladas (CANCELLED/VOID) — antes se sumaban y el catering pagaba
    // comisión de más.
    const invoiceBilled: InvoiceStatus[] = ['ISSUED', 'SENT', 'PAID', 'OVERDUE']
    const invoicesAgg = await prisma.invoice.aggregate({
      where: { tenantCatering: c.id, period, status: { in: invoiceBilled } },
      _sum: { subtotal: true },
    })
    const gross = Number(invoicesAgg._sum.subtotal ?? 0)

    // El cobro sale del PLAN del catering (Restaurant.saasPlan):
    //  · COMMISSION → comisión = base × commissionPct  (rate = commissionPct)
    //  · FIXED      → comisión = flatMonthlyFee         (rate = 0)
    // Sin plan asignado → no se cobra (rate 0). El alta siempre asigna plan.
    const restaurant = c.restaurants[0]
    const plan = restaurant?.saasPlan
    let commissionRate: number
    let commissionAmount: number
    if (plan?.pricingModel === 'FIXED') {
      commissionRate = 0
      commissionAmount = Number(plan.flatMonthlyFee ?? 0)
    } else if (plan?.pricingModel === 'COMMISSION') {
      commissionRate = Number(plan.commissionPct ?? 0)
      commissionAmount = Math.round(gross * commissionRate * 100) / 100
    } else {
      commissionRate = 0
      commissionAmount = 0
    }

    // Se descuentan las penalizaciones que se APLICARON (settledAt) durante el
    // mes liquidado — no las creadas (appliedAt). Así una penalización creada un
    // mes y aplicada al siguiente se descuenta en el mes correcto, sin perderse.
    const penaltiesAgg = await prisma.penalty.aggregate({
      where: {
        tenantCatering: c.id,
        status: 'APPLIED',
        settledAt: {
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
    select: { tenantId: true, legalName: true, saasPlanId: true },
  })

  const plans = await prisma.saasPlan.findMany({ where: { active: true } })
  const planById = new Map(plans.map((p) => [p.id, p]))

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
    const plan = c.saasPlanId ? planById.get(c.saasPlanId) : undefined
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
    // M3: no emitir facturas de 0€ (p.ej. un plan con precio anual y monthlyPrice=0).
    // La facturación de planes ANUALES por mes de aniversario (opción elegida) se
    // implementará como feature cuando se ofrezcan planes anuales — hoy todos los
    // planes en uso son mensuales, así que no hay nada mal facturado por esto.
    if (subtotal <= 0) {
      saasSkipped++
      continue
    }
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = subtotal + taxAmount

    if (dryRun) {
      saasCreated++
      continue
    }

    // Correlativo robusto: si otro proceso tomó el mismo número (unique [number]),
    // recomputar el siguiente y reintentar. Si ya existe para (empresa, período),
    // saltar. Evita numeración duplicada en ejecuciones concurrentes.
    let created: Awaited<ReturnType<typeof prisma.saasInvoice.create>> | null = null
    let skipDup = false
    for (let attempt = 0; attempt < 6 && !created && !skipDup; attempt++) {
      const number = `${yearPrefix}${String(counter).padStart(4, '0')}`
      try {
        created = await prisma.saasInvoice.create({
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
        counter++
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          const dup = await prisma.saasInvoice.findUnique({
            where: { tenantEmpresa_period: { tenantEmpresa: c.tenantId, period } },
          })
          if (dup) {
            skipDup = true
            break
          }
          const last = await prisma.saasInvoice.findFirst({
            where: { number: { startsWith: yearPrefix } },
            orderBy: { number: 'desc' },
          })
          counter = last
            ? parseInt(last.number.slice(yearPrefix.length), 10) + 1
            : 1
          continue
        }
        throw e
      }
    }
    if (!created) {
      saasSkipped++
      continue
    }

    await logAudit({
      tenantId: c.tenantId,
      actorId: actor.id,
      action: 'CREATE',
      entity: 'SaasInvoice',
      entityId: created.id,
      diff: {
        before: null,
        after: { period, plan: plan.code, total, number: created.number },
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
  const actor = await requireSuperAdmin('settlement:create')
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
  const actor = await requireSuperAdmin('settlement:create')
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

// (Retirado) updateSaasPlanAction: sustituido por components/admin/billing/plan-actions.ts
// (createPlan/updatePlan/deletePlan), que gestiona features + límites + planes a medida.

export async function upsertTaxRuleAction(
  input: Parameters<typeof updateTaxRuleSchema.parse>[0]
) {
  const actor = await requireSuperAdmin('tax:edit')
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
