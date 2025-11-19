/**
 * Validaciones Zod para Producción Diaria
 * 
 * Schemas para consolidación, kitchen sheets, packing sheets y etiquetas
 */

import { z } from 'zod'

/**
 * Schema para obtener datos de producción de un día
 */
export const productionDaySchema = z.object({
  date: z.coerce.date({
    required_error: 'La fecha es obligatoria',
    invalid_type_error: 'Fecha inválida',
  }),
})

/**
 * Schema para filtrar kitchen display por tipo de plato
 */
export const kitchenDisplaySchema = z.object({
  date: z.coerce.date({
    required_error: 'La fecha es obligatoria',
  }),
  course: z.enum(['FIRST', 'SECOND', 'DESSERT'], {
    required_error: 'El tipo de plato es obligatorio',
  }),
})

/**
 * Schema para obtener datos de empaquetado
 */
export const packingDisplaySchema = z.object({
  date: z.coerce.date({
    required_error: 'La fecha es obligatoria',
  }),
  companyId: z.string().uuid('ID de empresa inválido').optional(),
  siteId: z.string().uuid('ID de sede inválido').optional(),
})

/**
 * Schema para generar etiquetas
 */
export const generateLabelsSchema = z.object({
  date: z.coerce.date({
    required_error: 'La fecha es obligatoria',
  }),
  companyId: z.string().uuid('ID de empresa inválido').optional(),
  siteId: z.string().uuid('ID de sede inválido').optional(),
  orderIds: z.array(z.string().uuid('ID de pedido inválido')).optional(),
})

/**
 * Schema para consolidar producción del día
 */
export const consolidateProductionSchema = z.object({
  date: z.coerce.date({
    required_error: 'La fecha es obligatoria',
  }),
})

/**
 * Tipos inferidos
 */
export type ProductionDayInput = z.infer<typeof productionDaySchema>
export type KitchenDisplayInput = z.infer<typeof kitchenDisplaySchema>
export type PackingDisplayInput = z.infer<typeof packingDisplaySchema>
export type GenerateLabelsInput = z.infer<typeof generateLabelsSchema>
export type ConsolidateProductionInput = z.infer<typeof consolidateProductionSchema>

/**
 * Helper: Formatear nombre de plato para display
 */
export function formatDishNameForDisplay(name: string, maxLength = 25): string {
  if (name.length <= maxLength) return name.toUpperCase()
  return name.substring(0, maxLength - 3).toUpperCase() + '...'
}

/**
 * Helper: Formatear nombre de empleado para etiqueta
 */
export function formatEmployeeNameForLabel(fullName: string): string {
  // Si es muy largo, mostrar solo nombre + primer apellido
  const parts = fullName.split(' ')
  if (parts.length <= 2) return fullName
  
  // "Juan García Martínez" -> "Juan García"
  return `${parts[0]} ${parts[1]}`
}

/**
 * Helper: Obtener emoji de plato según tipo
 */
export function getDishEmoji(course: 'FIRST' | 'SECOND' | 'DESSERT'): string {
  const emojis = {
    FIRST: '🥘',
    SECOND: '🍗',
    DESSERT: '🍰',
  }
  return emojis[course]
}

/**
 * Helper: Códigos de color para tipos de plato (para etiquetas)
 */
export function getDishColorCode(course: 'FIRST' | 'SECOND' | 'DESSERT'): {
  bg: string
  text: string
  label: string
} {
  const colors = {
    FIRST: {
      bg: '#FEF3C7', // yellow-100
      text: '#92400E', // yellow-800
      label: 'PRIMERO',
    },
    SECOND: {
      bg: '#DBEAFE', // blue-100
      text: '#1E40AF', // blue-800
      label: 'SEGUNDO',
    },
    DESSERT: {
      bg: '#FCE7F3', // pink-100
      text: '#9F1239', // pink-800
      label: 'POSTRE',
    },
  }
  return colors[course]
}

