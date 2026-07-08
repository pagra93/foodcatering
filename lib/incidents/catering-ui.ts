/**
 * Constantes de UI de incidencias (portal CATERING). Puras (sin BD) → aptas para
 * componentes cliente. Reexportadas por lib/db/queries/catering-incidencias.ts.
 */

export const INCIDENT_TYPES: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  DELAYED_DELIVERY: { label: 'Entrega Retrasada', icon: '⏰', color: 'bg-yellow-100 text-yellow-700' },
  MISSING_ITEM: { label: 'Producto Faltante', icon: '📦', color: 'bg-orange-100 text-orange-700' },
  WRONG_ORDER: { label: 'Pedido Incorrecto', icon: '❌', color: 'bg-blue-100 text-blue-700' },
  QUALITY_ISSUE: { label: 'Problema de Calidad', icon: '⚠️', color: 'bg-red-100 text-red-700' },
  ALLERGEN_ISSUE: { label: 'Alérgeno No Declarado', icon: '🚨', color: 'bg-red-100 text-red-700' },
  DAMAGED_PACKAGING: { label: 'Empaquetado Dañado', icon: '📦', color: 'bg-gray-100 text-gray-700' },
  OTHER: { label: 'Otro', icon: '❓', color: 'bg-gray-100 text-gray-700' },
}

export const SEVERITY_MAP = {
  LOW: { label: 'Baja', color: 'bg-gray-100 text-gray-700', badgeVariant: 'outline' as const },
  MEDIUM: { label: 'Media', color: 'bg-yellow-100 text-yellow-700', badgeVariant: 'default' as const },
  HIGH: { label: 'Alta', color: 'bg-red-100 text-red-700', badgeVariant: 'destructive' as const },
}

export const INCIDENT_STATUS_MAP = {
  OPEN: { label: 'Abierta', color: 'bg-red-100 text-red-700', badgeVariant: 'destructive' as const },
  IN_PROGRESS: { label: 'En Revisión', color: 'bg-blue-100 text-blue-700', badgeVariant: 'default' as const },
  RESOLVED: { label: 'Resuelta', color: 'bg-green-100 text-green-700', badgeVariant: 'success' as const },
  COMPENSATED: { label: 'Compensada', color: 'bg-purple-100 text-purple-700', badgeVariant: 'secondary' as const },
}
