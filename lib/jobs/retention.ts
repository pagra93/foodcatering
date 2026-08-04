import { prismaAdmin } from '@/lib/db/prisma-admin'
import type { RetentionDeleteMode, RetentionEntity } from '@prisma/client'
import type { JobSummary } from '@/lib/jobs/run'

/**
 * Job `retention` (semanal): aplica las políticas de `RetentionPolicy`
 * (configurables en /admin/compliance/retention) y actualiza lastRun/
 * lastDeleted/nextRun — hasta ahora la tabla era pura configuración que
 * nadie ejecutaba.
 *
 * Implementación CONSERVADORA por entidad (allowlist):
 * - Notification → HARD delete (createdAt < corte).
 * - Order        → SOFT delete (serviceDate < corte): los oculta de portales,
 *                  siguen en BD para obligación fiscal.
 * - OrderHistory → HARD delete SOLO si la política es HARD (changedAt < corte).
 * - EmailLog     → purga fija a 180 días (no configurable; contiene PII
 *                  operativa).
 * - Resto (AuditLog, Invoice, User, Incident, DeliveryProof) → se reporta
 *   `skipped` con el motivo: borrarlos exige decisiones legales/de cascada
 *   que no se automatizan a ciegas.
 */

const EMAIL_LOG_RETENTION_DAYS = 180
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type EntityResult =
  | { deleted: number; mode: 'HARD' | 'SOFT' }
  | { skipped: string }

async function applyRetention(
  entity: RetentionEntity,
  mode: RetentionDeleteMode,
  cutoff: Date
): Promise<EntityResult> {
  switch (entity) {
    case 'Notification': {
      const res = await prismaAdmin.notification.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
      return { deleted: res.count, mode: 'HARD' }
    }
    case 'Order': {
      if (mode === 'HARD') {
        return { skipped: 'borrado duro de pedidos deshabilitado (fiscal); usa SOFT' }
      }
      const res = await prismaAdmin.order.updateMany({
        where: { deletedAt: null, serviceDate: { lt: cutoff } },
        data: { deletedAt: new Date() },
      })
      return { deleted: res.count, mode: 'SOFT' }
    }
    case 'OrderHistory': {
      if (mode !== 'HARD') {
        return { skipped: 'OrderHistory no tiene deletedAt; solo soporta HARD' }
      }
      const res = await prismaAdmin.orderHistory.deleteMany({
        where: { changedAt: { lt: cutoff } },
      })
      return { deleted: res.count, mode: 'HARD' }
    }
    case 'AuditLog':
      return { skipped: 'traza inmutable: la purga se decide manualmente' }
    case 'Invoice':
      return { skipped: 'documento fiscal sin deletedAt: purga manual' }
    case 'User':
      return { skipped: 'requiere anonimización RGPD (flujo GDPR), no borrado' }
    case 'Incident':
      return { skipped: 'sin deletedAt y con cascadas: purga manual' }
    case 'DeliveryProof':
      return { skipped: 'evidencia de entrega ligada a pedidos: purga manual' }
    default:
      return { skipped: 'entidad no soportada' }
  }
}

export async function retentionJob(): Promise<JobSummary> {
  const now = new Date()
  const policies = await prismaAdmin.retentionPolicy.findMany()
  const results: Record<string, EntityResult> = {}

  for (const policy of policies) {
    const cutoff = new Date(now.getTime() - policy.retentionDays * 86_400_000)
    const result = await applyRetention(policy.entity, policy.deleteMode, cutoff)
    results[policy.entity] = result

    await prismaAdmin.retentionPolicy.update({
      where: { id: policy.id },
      data: {
        lastRun: now,
        nextRun: new Date(now.getTime() + WEEK_MS),
        lastDeleted: 'deleted' in result ? result.deleted : null,
      },
    })
  }

  // Purga fija de EmailLog (PII operativa), fuera de las políticas editables.
  const emailCutoff = new Date(
    now.getTime() - EMAIL_LOG_RETENTION_DAYS * 86_400_000
  )
  const emails = await prismaAdmin.emailLog.deleteMany({
    where: { createdAt: { lt: emailCutoff } },
  })
  results['EmailLog'] = { deleted: emails.count, mode: 'HARD' }

  return { policies: policies.length, results }
}
