/**
 * Constantes de UI de incidencias (portal EMPRESA). Puras (sin BD) → aptas para
 * componentes cliente. Reexportadas por lib/db/queries/empresa-incidencias.ts.
 */

export const INCIDENT_TYPES: Record<string, { label: string; color: string }> = {
  DELAYED_DELIVERY: { label: '⏰ Entrega Retrasada', color: 'bg-yellow-100 text-yellow-800' },
  MISSING_ITEM: { label: '📦 Producto Faltante', color: 'bg-orange-100 text-orange-800' },
  WRONG_ORDER: { label: '❌ Pedido Incorrecto', color: 'bg-blue-100 text-blue-800' },
  QUALITY_ISSUE: { label: '⚠️ Problema de Calidad', color: 'bg-red-100 text-red-800' },
  ALLERGEN_ISSUE: { label: '🚨 Alérgeno No Declarado', color: 'bg-red-100 text-red-800' },
  DAMAGED_PACKAGING: { label: '📦 Empaquetado Dañado', color: 'bg-gray-100 text-gray-800' },
  OTHER: { label: '❓ Otro', color: 'bg-gray-100 text-gray-800' },
}

export const SEVERITY_MAP = {
  LOW: { label: 'Baja', variant: 'outline' as const, color: 'bg-gray-100' },
  MEDIUM: { label: 'Media', variant: 'default' as const, color: 'bg-yellow-100' },
  HIGH: { label: 'Alta', variant: 'destructive' as const, color: 'bg-red-100' },
}

export const INCIDENT_STATUS_MAP = {
  OPEN: { label: 'Abierta', variant: 'destructive' as const },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' as const },
  RESOLVED: { label: 'Resuelta', variant: 'success' as const },
  CLOSED: { label: 'Cerrada', variant: 'outline' as const },
}
