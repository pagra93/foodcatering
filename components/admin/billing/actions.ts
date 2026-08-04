'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import type { Prisma } from '@prisma/client'
// F5: generación de facturación es admin cross-tenant → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import { auth } from '@/lib/auth'
import { logAudit, buildAuditIntegrityHash } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { generateMonthBilling } from '@/lib/billing/generate-month'
import {
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

/**
 * Generación mensual: crea Settlements + SaasInvoices para el período
 * indicado. La lógica vive en lib/billing/generate-month.ts (compartida con
 * el job `monthly-billing` de /api/cron); aquí solo authz + revalidación.
 */
export async function generateMonthBillingAction(input: {
  period: string
  dryRun?: boolean
}) {
  const actor = await requireSuperAdmin('settlement:create')
  const { period, dryRun } = generateMonthSchema.parse(input)

  const result = await generateMonthBilling({
    period,
    dryRun,
    actorId: actor.id,
  })

  if (!dryRun) {
    revalidatePath('/admin/billing')
    revalidatePath('/admin/billing/settlements')
    revalidatePath('/admin/billing/saas-invoices')
  }

  return result
}

export async function markSettlementPaidAction(input: {
  id: string
  paymentRef?: string
  paymentMethod?: string
}) {
  const actor = await requireSuperAdmin('settlement:create')
  const data = markPaidSchema.parse(input)

  const current = await prisma.settlement.findUnique({ where: { id: data.id } })
  if (!current) throw new DomainError('Liquidación no encontrada', 404)
  if (current.status === 'PAID') {
    throw new DomainError('Ya está pagada', 409)
  }

  // Cobro + auditoría en la MISMA transacción (dinero pagado nunca sin rastro)
  // y transición condicionada al estado leído (doble click: solo uno gana).
  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.settlement.updateMany({
      where: { id: data.id, status: current.status },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentRef: data.paymentRef,
      },
    })
    if (res.count !== 1) {
      throw new DomainError('La liquidación cambió de estado; recarga la página', 409)
    }
    const row = await tx.settlement.findUniqueOrThrow({ where: { id: data.id } })

    const auditBase = {
      tenantId: current.tenantCatering,
      actorId: actor.id,
      action: 'INVOICE_PAID' as const,
      entity: 'Settlement',
      entityId: row.id,
    }
    await tx.auditLog.create({
      data: {
        ...auditBase,
        impersonatorId: null,
        diff: {
          before: { status: current.status },
          after: { status: 'PAID', paymentRef: data.paymentRef ?? null },
        } as Prisma.InputJsonValue,
        hash: buildAuditIntegrityHash(auditBase),
      },
    })
    return row
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
  if (!current) throw new DomainError('Factura no encontrada', 404)
  if (current.status === 'PAID') throw new DomainError('Ya está pagada', 409)

  // Cobro + auditoría en la MISMA transacción, condicionado al estado leído.
  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.saasInvoice.updateMany({
      where: { id: data.id, status: current.status },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentRef: data.paymentRef,
        paymentMethod: data.paymentMethod,
      },
    })
    if (res.count !== 1) {
      throw new DomainError('La factura cambió de estado; recarga la página', 409)
    }
    const row = await tx.saasInvoice.findUniqueOrThrow({ where: { id: data.id } })

    const auditBase = {
      tenantId: current.tenantEmpresa,
      actorId: actor.id,
      action: 'INVOICE_PAID' as const,
      entity: 'SaasInvoice',
      entityId: row.id,
    }
    await tx.auditLog.create({
      data: {
        ...auditBase,
        impersonatorId: null,
        diff: {
          before: { status: current.status },
          after: { status: 'PAID' },
        } as Prisma.InputJsonValue,
        hash: buildAuditIntegrityHash(auditBase),
      },
    })
    return row
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
