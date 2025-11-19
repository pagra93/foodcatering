/**
 * Validaciones Zod para Menús Semanales
 * 
 * Schemas para gestionar menús diarios, publicación y validaciones
 */

import { z } from 'zod'

/**
 * Schema para selección de platos de un día
 * Debe tener al menos un plato de primeros y uno de segundos
 */
export const dailyMenuSchema = z.object({
  date: z.coerce.date({
    required_error: 'La fecha es obligatoria',
    invalid_type_error: 'Fecha inválida',
  }),
  
  // Platos primeros (IDs de platos)
  firsts: z
    .array(z.string().uuid('ID de plato inválido'))
    .min(1, 'Debe seleccionar al menos un primer plato')
    .max(5, 'Máximo 5 primeros platos por día'),
  
  // Platos segundos (IDs de platos)
  seconds: z
    .array(z.string().uuid('ID de plato inválido'))
    .min(1, 'Debe seleccionar al menos un segundo plato')
    .max(5, 'Máximo 5 segundos platos por día'),
  
  // Platos postres (IDs de platos) - Opcionales
  desserts: z
    .array(z.string().uuid('ID de plato inválido'))
    .max(5, 'Máximo 5 postres por día')
    .optional()
    .default([]),
})

/**
 * Schema para publicar menús (rango de fechas)
 */
export const publishMenusSchema = z.object({
  startDate: z.coerce.date({
    required_error: 'La fecha de inicio es obligatoria',
  }),
  
  endDate: z.coerce.date({
    required_error: 'La fecha de fin es obligatoria',
  }),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  }
)

/**
 * Schema para obtener menús semanales
 */
export const weeklyMenuQuerySchema = z.object({
  startDate: z.coerce.date({
    required_error: 'La fecha de inicio es obligatoria',
  }),
  
  endDate: z.coerce.date({
    required_error: 'La fecha de fin es obligatoria',
  }),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  }
)

/**
 * Schema para actualizar stock limit de un plato en un día
 */
export const updateStockLimitSchema = z.object({
  dishScheduleId: z.string().uuid('ID inválido'),
  stockLimit: z
    .number()
    .int('El stock debe ser un número entero')
    .min(1, 'El stock mínimo es 1')
    .max(1000, 'El stock máximo es 1000')
    .optional()
    .nullable(),
})

/**
 * Schema para override de precio
 */
export const updatePriceOverrideSchema = z.object({
  dishScheduleId: z.string().uuid('ID inválido'),
  priceOverride: z
    .number()
    .min(0.01, 'El precio debe ser mayor a 0')
    .max(50, 'El precio no puede superar 50€')
    .multipleOf(0.01, 'El precio debe tener máximo 2 decimales')
    .optional()
    .nullable(),
})

/**
 * Tipos inferidos
 */
export type DailyMenuInput = z.infer<typeof dailyMenuSchema>
export type PublishMenusInput = z.infer<typeof publishMenusSchema>
export type WeeklyMenuQuery = z.infer<typeof weeklyMenuQuerySchema>
export type UpdateStockLimitInput = z.infer<typeof updateStockLimitSchema>
export type UpdatePriceOverrideInput = z.infer<typeof updatePriceOverrideSchema>

/**
 * Helper: Validar que la fecha es futura (no pasada)
 */
export function isFutureDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  
  return checkDate >= today
}

/**
 * Helper: Validar que la fecha está después del cutoff
 */
export function isAfterCutoff(date: Date, cutoffTime: string): boolean {
  const now = new Date()
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  // Si la fecha es hoy, verificar la hora de cutoff
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (targetDate.getTime() === today.getTime()) {
    // Parsear cutoffTime (formato "HH:mm")
    const [hours, minutes] = cutoffTime.split(':').map(Number)
    const cutoff = new Date()
    cutoff.setHours(hours, minutes, 0, 0)
    
    return now > cutoff
  }
  
  // Si es fecha pasada, está después del cutoff
  if (targetDate < today) {
    return true
  }
  
  // Si es fecha futura, NO está después del cutoff
  return false
}

/**
 * Helper: Obtener días de la semana para una fecha
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const current = new Date(date)
  const dayOfWeek = current.getDay()
  
  // Ajustar para que lunes sea 0 (en JS domingo es 0)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  
  const start = new Date(current)
  start.setDate(current.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * Helper: Formatear día de la semana
 */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

/**
 * Helper: Formatear día de la semana (corto)
 */
export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
}

