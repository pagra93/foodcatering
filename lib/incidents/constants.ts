/**
 * Fuente única de constantes de incidencias (Incident).
 *
 * Antes estos mapas estaban triplicados en los portales empresa/catering/empleado
 * con variaciones (y un estado fantasma `CLOSED` que no existe en el enum).
 * Centralizado aquí y alineado al enum real de Prisma.
 */

import type { IncidentSeverity, IncidentStatus } from '@prisma/client'

// ── Tipos de incidencia (catálogo del campo `type`, que es String) ──────────
export const INCIDENT_TYPES = {
  DELAYED_DELIVERY: {
    label: 'Entrega tardía',
    description: 'El pedido llegó más tarde de lo esperado.',
  },
  MISSING_ITEM: {
    label: 'Falta un artículo',
    description: 'El pedido llegó incompleto.',
  },
  WRONG_ORDER: {
    label: 'Pedido incorrecto',
    description: 'Se entregó un pedido distinto al solicitado.',
  },
  QUALITY_ISSUE: {
    label: 'Problema de calidad',
    description: 'La comida no cumplió los estándares de calidad.',
  },
  ALLERGEN_ISSUE: {
    label: 'Problema con alérgenos',
    description: 'Incidencia relacionada con alérgenos.',
  },
  DAMAGED_PACKAGING: {
    label: 'Embalaje dañado',
    description: 'El embalaje llegó dañado.',
  },
  OTHER: {
    label: 'Otro',
    description: 'Otro tipo de incidencia.',
  },
} as const

export function incidentTypeLabel(type: string): string {
  return INCIDENT_TYPES[type as keyof typeof INCIDENT_TYPES]?.label ?? type
}

export function incidentTypeDescription(type: string): string | null {
  return INCIDENT_TYPES[type as keyof typeof INCIDENT_TYPES]?.description ?? null
}

// ── Severidad (enum real: LOW / MEDIUM / HIGH) ──────────────────────────────
export const SEVERITY_META: Record<
  IncidentSeverity,
  { label: string; className: string }
> = {
  LOW: { label: 'Baja', className: 'text-gray-600 bg-gray-100 border-gray-200' },
  MEDIUM: { label: 'Media', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  HIGH: { label: 'Alta', className: 'text-red-700 bg-red-50 border-red-200' },
}

// ── Estado (enum real: OPEN / IN_PROGRESS / RESOLVED / COMPENSATED) ──────────
export const STATUS_META: Record<
  IncidentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }
> = {
  OPEN: { label: 'Abierta', variant: 'destructive' },
  IN_PROGRESS: { label: 'En curso', variant: 'outline' },
  RESOLVED: { label: 'Resuelta', variant: 'success' },
  COMPENSATED: { label: 'Compensada', variant: 'secondary' },
}

// ── Tipos de resolución (campo resolution.type, JSON) ───────────────────────
export const RESOLUTION_TYPES = {
  REPLACEMENT: 'Reposición',
  REFUND: 'Reembolso',
  DISCOUNT: 'Descuento',
  APOLOGY: 'Disculpa',
  OTHER: 'Otro',
} as const

export function resolutionTypeLabel(type?: string | null): string | null {
  if (!type) return null
  return RESOLUTION_TYPES[type as keyof typeof RESOLUTION_TYPES] ?? type
}

/** Forma esperada del JSON `Incident.resolution`. */
export type IncidentResolution = {
  type?: string
  details?: string
  amount?: number
  resolvedBy?: string
  resolvedAt?: string
}
