import { createHash } from 'node:crypto'
import { Prisma, type InvoiceStatus } from '@prisma/client'
// Generación cross-tenant (todos los caterings/empresas) → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import { buildAuditIntegrityHash, logAudit } from '@/lib/auth/audit'
import { isAnnualBillingDue } from '@/lib/billing/cycle'
import { DEFAULT_DUE_DAYS } from '@/lib/validations/billing'

export type GenerateMonthResult = {
  dryRun: boolean
  period: string
  settlementsCreated: number
  settlementsSkipped: number
  saasCreated: number
  saasSkipped: number
}

function firstDayOfNextMonth(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(y!, m!, 1) // m es 1..12, new Date(y, m) = primer día mes siguiente
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Generación mensual de la facturación propia de Plati para un período:
 * Settlements (comisión catering→Plati) + SaasInvoices (plan Plati→empresa).
 * Las Invoice catering→empresa ya existen (flujo del catering); aquí solo se
 * agregan como base de la comisión.
 *
 * - Idempotente por (tenant, período): re-ejecutar un mes no duplica.
 * - La invocan el botón de admin (generateMonthBillingAction) y el job
 *   `monthly-billing` de /api/cron (actorId = 'system').
 * - El auditLog de cada documento emitido va DENTRO de su transacción: no
 *   puede quedar dinero emitido sin rastro de auditoría.
 */
export async function generateMonthBilling(input: {
  period: string
  dryRun?: boolean
  actorId: string
}): Promise<GenerateMonthResult> {
  const { period, dryRun, actorId } = input

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

    // Settlement + auditoría en la MISMA transacción.
    await prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
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

      const auditBase = {
        tenantId: c.id,
        actorId,
        action: 'CREATE' as const,
        entity: 'Settlement',
        entityId: created.id,
      }
      await tx.auditLog.create({
        data: {
          ...auditBase,
          impersonatorId: null,
          diff: {
            before: null,
            after: { period, gross, commissionAmount, penalties, netOwed },
          } as Prisma.InputJsonValue,
          hash: buildAuditIntegrityHash(auditBase),
        },
      })
    })

    settlementsCreated++
  }

  // ── SaasInvoices (plan Plati → empresa) ────────────────────────
  const companies = await prisma.company.findMany({
    where: {
      tenant: { status: 'ACTIVE', deletedAt: null },
    },
    select: {
      tenantId: true,
      legalName: true,
      saasPlanId: true,
      billingCycle: true,
      subscriptionStartedAt: true,
    },
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

    // F3: ciclo de cobro. YEARLY cobra el precio anual UNA vez al año, en el mes
    // de aniversario del alta (subscriptionStartedAt); el resto de meses se salta.
    let subtotal: number
    if (c.billingCycle === 'YEARLY') {
      if (!isAnnualBillingDue(period, c.subscriptionStartedAt)) {
        saasSkipped++
        continue
      }
      subtotal = plan.yearlyPrice ? Number(plan.yearlyPrice) : 0
    } else {
      subtotal = Number(plan.monthlyPrice)
    }
    // No emitir facturas de 0€ (plan sin precio para el ciclo elegido).
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
    // Factura + auditoría en la MISMA transacción (el P2002 aborta ambas).
    let createdId: string | null = null
    let skipDup = false
    for (let attempt = 0; attempt < 6 && !createdId && !skipDup; attempt++) {
      const number = `${yearPrefix}${String(counter).padStart(4, '0')}`
      try {
        createdId = await prisma.$transaction(async (tx) => {
          const created = await tx.saasInvoice.create({
            data: {
              tenantEmpresa: c.tenantId,
              period,
              planCode: plan.code,
              planName: plan.name,
              number,
              cycle: c.billingCycle,
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

          const auditBase = {
            tenantId: c.tenantId,
            actorId,
            action: 'CREATE' as const,
            entity: 'SaasInvoice',
            entityId: created.id,
          }
          await tx.auditLog.create({
            data: {
              ...auditBase,
              impersonatorId: null,
              diff: {
                before: null,
                after: { period, plan: plan.code, total, number },
              } as Prisma.InputJsonValue,
              hash: buildAuditIntegrityHash(auditBase),
            },
          })

          return created.id
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
    if (!createdId) {
      saasSkipped++
      continue
    }

    saasCreated++
  }

  // Rastro agregado de la ejecución (BILLING_RUN, acción del enum que estaba
  // muerta): quién y cuándo generó el mes, con el resumen. Best-effort.
  if (!dryRun) {
    await logAudit({
      tenantId: null,
      actorId,
      action: 'BILLING_RUN',
      entity: 'BillingRun',
      entityId: period,
      diff: {
        after: {
          period,
          settlementsCreated,
          settlementsSkipped,
          saasCreated,
          saasSkipped,
        },
      },
    })
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
