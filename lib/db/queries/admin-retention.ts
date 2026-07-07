/**
 * Queries para políticas de retención.
 */

import { prisma } from '@/lib/db/prisma'
import type { RetentionEntity } from '@prisma/client'

export const RETENTION_ENTITY_LABEL: Record<RetentionEntity, string> = {
  AuditLog: 'Audit logs (actividad del sistema)',
  Order: 'Pedidos',
  Invoice: 'Facturas',
  User: 'Usuarios dados de baja',
  Notification: 'Notificaciones',
  Incident: 'Incidencias',
  OrderHistory: 'Historial de pedidos',
  DeliveryProof: 'Justificantes de entrega',
}

/**
 * Valores por defecto sugeridos, basados en obligaciones legales
 * (LOPDGDD + IRPF 5 años para facturación + 4 años para fiscal).
 */
export const RETENTION_DEFAULTS: Record<
  RetentionEntity,
  { days: number; mode: 'SOFT' | 'HARD' }
> = {
  AuditLog: { days: 730, mode: 'SOFT' }, // 2 años
  Order: { days: 1825, mode: 'SOFT' }, // 5 años fiscal
  Invoice: { days: 1825, mode: 'SOFT' }, // 5 años fiscal
  User: { days: 365, mode: 'SOFT' }, // 1 año tras baja
  Notification: { days: 90, mode: 'HARD' }, // 3 meses
  Incident: { days: 1095, mode: 'SOFT' }, // 3 años
  OrderHistory: { days: 1825, mode: 'SOFT' }, // mismo que Order
  DeliveryProof: { days: 1825, mode: 'SOFT' }, // mismo que Order
}

export async function getAllRetentionPolicies() {
  return prisma.retentionPolicy.findMany({
    orderBy: { entity: 'asc' },
  })
}
