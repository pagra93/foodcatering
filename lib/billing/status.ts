/**
 * Estado efectivo y presentación de facturas/liquidaciones.
 *
 * "Vencida" (OVERDUE) NO se persiste en BD (no hay cron): se deriva al vuelo
 * cuando una factura/liquidación emitida (o enviada) pasa su fecha de
 * vencimiento sin pagarse. Este módulo centraliza esa lógica y el mapeo
 * estado → { etiqueta, tono } para toda la app (antes duplicado en ≥4 sitios).
 */

import type { StatusTone } from '@/components/shared/StatusBadge'

/** Estados "abiertos" (emitida/enviada, sin pagar) que pueden vencer. */
const OPEN_STATES = new Set(['ISSUED', 'SENT'])

/**
 * Estado efectivo derivado por fecha: si está emitida/enviada sin pagar y su
 * vencimiento ya pasó → 'OVERDUE'. Si no, el estado tal cual.
 */
export function effectiveStatus<T extends string>(
  status: T,
  due: Date | null | undefined,
  now: Date = new Date()
): T | 'OVERDUE' {
  if (OPEN_STATES.has(status) && due && due.getTime() < now.getTime()) {
    return 'OVERDUE'
  }
  return status
}

/** ¿Cuenta como pendiente de cobro/pago? (abierta o ya vencida). */
export function isPendingStatus(status: string): boolean {
  return OPEN_STATES.has(status) || status === 'OVERDUE'
}

export type StatusMeta = { label: string; tone: StatusTone }

/** Facturas de comida (`InvoiceStatus`: DRAFT, ISSUED, SENT, PAID, OVERDUE, CANCELLED, VOID). */
export const INVOICE_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Borrador', tone: 'neutral' },
  ISSUED: { label: 'Emitida', tone: 'warning' },
  SENT: { label: 'Enviada', tone: 'info' },
  PAID: { label: 'Pagada', tone: 'success' },
  OVERDUE: { label: 'Vencida', tone: 'error' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  VOID: { label: 'Anulada', tone: 'neutral' },
}

/** Liquidaciones (`SettlementStatus`: DRAFT, ISSUED, PAID, OVERDUE, CANCELLED). */
export const SETTLEMENT_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Borrador', tone: 'neutral' },
  ISSUED: { label: 'Emitida', tone: 'warning' },
  PAID: { label: 'Pagada', tone: 'success' },
  OVERDUE: { label: 'Vencida', tone: 'error' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
}

/** Facturas SaaS (`SaasInvoiceStatus`: mismos 5 estados que Settlement). */
export const SAAS_STATUS: Record<string, StatusMeta> = SETTLEMENT_STATUS

/** Meta de un estado con fallback neutro (por si aparece un estado no mapeado). */
export function statusMeta(
  map: Record<string, StatusMeta>,
  status: string
): StatusMeta {
  return map[status] ?? { label: status, tone: 'neutral' }
}
