/**
 * Constantes de UI de incidencias (portal EMPLEADO). Puras (sin BD) → aptas para
 * componentes cliente. Reexportadas por lib/db/queries/empleado-incidencias.ts.
 */

export const INCIDENT_TYPES: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  DELAYED_DELIVERY: { label: 'Entrega Retrasada', description: 'El pedido llegó más tarde de lo esperado', icon: '⏰' },
  MISSING_ITEM: { label: 'Producto Faltante', description: 'Falta algún plato o componente del menú', icon: '📦' },
  WRONG_ORDER: { label: 'Pedido Incorrecto', description: 'El pedido recibido no es el que solicité', icon: '❌' },
  QUALITY_ISSUE: { label: 'Problema de Calidad', description: 'La comida no está en buen estado o tiene mal sabor', icon: '⚠️' },
  ALLERGEN_ISSUE: { label: 'Alérgeno No Declarado', description: 'El plato contiene un alérgeno no indicado', icon: '🚨' },
  DAMAGED_PACKAGING: { label: 'Empaquetado Dañado', description: 'El empaque llegó dañado o abierto', icon: '📦' },
  OTHER: { label: 'Otro', description: 'Otro tipo de problema', icon: '❓' },
}

export const SEVERITY_MAP = {
  LOW: { label: 'Baja', color: 'bg-gray-100 text-gray-700' },
  MEDIUM: { label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
  HIGH: { label: 'Alta', color: 'bg-red-100 text-red-700' },
}

export const INCIDENT_STATUS_MAP = {
  OPEN: { label: 'Abierta', color: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: 'En Revisión', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Resuelta', color: 'bg-green-100 text-green-700' },
  COMPENSATED: { label: 'Compensada', color: 'bg-purple-100 text-purple-700' },
}
