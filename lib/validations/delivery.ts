/**
 * Validaciones Zod para Rutas y Entregas
 * 
 * Schemas para gestionar rutas de reparto, asignación de repartidores,
 * confirmación de entregas e incidencias
 */

import { z } from 'zod'

/**
 * Schema para crear una ruta
 */
export const createRouteSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres'),
  
  date: z.coerce.date({
    required_error: 'La fecha es obligatoria',
    invalid_type_error: 'Fecha inválida',
  }),
  
  deliveryUserId: z
    .string()
    .uuid('ID de repartidor inválido')
    .optional()
    .nullable(),
  
  companySiteIds: z
    .array(z.string().uuid('ID de sede inválido'))
    .min(1, 'Debe seleccionar al menos una sede')
    .max(20, 'Máximo 20 sedes por ruta'),
  
  estimatedDuration: z
    .number()
    .int('La duración debe ser un número entero')
    .min(15, 'Duración mínima: 15 minutos')
    .max(480, 'Duración máxima: 8 horas')
    .optional()
    .nullable(),
  
  notes: z
    .string()
    .max(500, 'Las notas no pueden superar 500 caracteres')
    .optional()
    .nullable(),
})

/**
 * Schema para actualizar una ruta
 */
export const updateRouteSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres')
    .optional(),
  
  deliveryUserId: z
    .string()
    .uuid('ID de repartidor inválido')
    .optional()
    .nullable(),
  
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .optional(),
  
  estimatedDuration: z
    .number()
    .int()
    .min(15)
    .max(480)
    .optional()
    .nullable(),
  
  notes: z
    .string()
    .max(500)
    .optional()
    .nullable(),
})

/**
 * Schema para asignar repartidor a una ruta
 */
export const assignDriverSchema = z.object({
  deliveryUserId: z.string().uuid('ID de repartidor inválido'),
})

/**
 * Schema para iniciar una ruta
 */
export const startRouteSchema = z.object({
  startedAt: z.coerce.date().optional(),
})

/**
 * Schema para finalizar una ruta
 */
export const completeRouteSchema = z.object({
  completedAt: z.coerce.date().optional(),
  notes: z.string().max(500).optional().nullable(),
})

/**
 * Schema para confirmar entrega individual
 */
export const confirmDeliverySchema = z.object({
  orderId: z.string().uuid('ID de pedido inválido'),
  
  deliveredAt: z.coerce.date({
    required_error: 'La fecha de entrega es obligatoria',
  }),
  
  proofType: z.enum(['PHOTO', 'SIGNATURE', 'NONE'], {
    required_error: 'El tipo de prueba es obligatorio',
  }),
  
  proofUrl: z
    .string()
    .url('URL inválida')
    .optional()
    .nullable(),
  
  recipientName: z
    .string()
    .min(2, 'El nombre del receptor debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres')
    .optional()
    .nullable(),
  
  notes: z
    .string()
    .max(500, 'Las notas no pueden superar 500 caracteres')
    .optional()
    .nullable(),
  
  latitude: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida')
    .optional()
    .nullable(),
  
  longitude: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida')
    .optional()
    .nullable(),
})

/**
 * Schema para reportar incidencia en entrega
 */
export const reportIncidentSchema = z.object({
  orderId: z.string().uuid('ID de pedido inválido'),
  
  type: z.enum([
    'ADDRESS_NOT_FOUND',
    'RECIPIENT_NOT_AVAILABLE',
    'ACCESS_DENIED',
    'DAMAGED_PRODUCT',
    'WRONG_ORDER',
    'OTHER',
  ], {
    required_error: 'El tipo de incidencia es obligatorio',
  }),
  
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'La descripción no puede superar 1000 caracteres'),
  
  photoUrl: z
    .string()
    .url('URL inválida')
    .optional()
    .nullable(),
  
  reportedAt: z.coerce.date().optional(),
  
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
})

/**
 * Schema para actualizar el tracking de una ruta
 */
export const updateRouteTrackingSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida'),
  
  longitude: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida'),
  
  timestamp: z.coerce.date().optional(),
})

/**
 * Tipos inferidos
 */
export type CreateRouteInput = z.infer<typeof createRouteSchema>
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>
export type AssignDriverInput = z.infer<typeof assignDriverSchema>
export type StartRouteInput = z.infer<typeof startRouteSchema>
export type CompleteRouteInput = z.infer<typeof completeRouteSchema>
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>
export type ReportIncidentInput = z.infer<typeof reportIncidentSchema>
export type UpdateRouteTrackingInput = z.infer<typeof updateRouteTrackingSchema>

/**
 * Tipos de incidencias con labels en español
 */
export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ADDRESS_NOT_FOUND: 'Dirección no encontrada',
  RECIPIENT_NOT_AVAILABLE: 'Destinatario no disponible',
  ACCESS_DENIED: 'Acceso denegado',
  DAMAGED_PRODUCT: 'Producto dañado',
  WRONG_ORDER: 'Pedido incorrecto',
  OTHER: 'Otro',
}

/**
 * Estados de ruta con labels
 */
export const ROUTE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

/**
 * Colores de estados de ruta
 */
export const ROUTE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-800' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
}

/**
 * Helper: Calcular tiempo estimado basado en número de paradas
 */
export function estimateRouteDuration(numberOfStops: number): number {
  // Tiempo base: 10 min por parada + 5 min de tránsito entre paradas
  const baseTimePerStop = 10
  const transitTimePerStop = 5
  
  return numberOfStops * (baseTimePerStop + transitTimePerStop)
}

/**
 * Helper: Validar que la ruta puede iniciarse
 */
export function canStartRoute(route: {
  status: string
  deliveryUserId: string | null
  orders: any[]
}): { valid: boolean; reason?: string } {
  if (route.status !== 'PENDING') {
    return { valid: false, reason: 'La ruta ya está en curso o completada' }
  }
  
  if (!route.deliveryUserId) {
    return { valid: false, reason: 'No hay repartidor asignado' }
  }
  
  if (!route.orders || route.orders.length === 0) {
    return { valid: false, reason: 'No hay pedidos en la ruta' }
  }
  
  return { valid: true }
}

/**
 * Helper: Validar que la ruta puede completarse
 */
export function canCompleteRoute(route: {
  status: string
  orders: Array<{ status: string }>
}): { valid: boolean; reason?: string } {
  if (route.status !== 'IN_PROGRESS') {
    return { valid: false, reason: 'La ruta no está en curso' }
  }
  
  const allDelivered = route.orders.every(
    (order) => order.status === 'DELIVERED' || order.status === 'ISSUE_REPORTED'
  )
  
  if (!allDelivered) {
    return {
      valid: false,
      reason: 'Aún hay pedidos sin entregar',
    }
  }
  
  return { valid: true }
}

