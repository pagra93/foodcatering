/**
 * Validaciones Zod para Platos
 * 
 * Schemas para crear, editar y validar platos del catering
 */

import { z } from 'zod'

/**
 * Lista de alérgenos permitidos según normativa española
 */
export const ALLERGENS = [
  'gluten',
  'crustaceos',
  'huevos',
  'pescado',
  'cacahuetes',
  'soja',
  'lactosa',
  'frutos_secos',
  'apio',
  'mostaza',
  'sesamo',
  'sulfitos',
  'altramuces',
  'moluscos',
] as const

/**
 * Lista de etiquetas nutricionales permitidas
 */
export const NUTRITION_TAGS = [
  'vegetariano',
  'vegano',
  'sin_gluten',
  'bajo_en_calorias',
  'alto_en_proteina',
  'bajo_en_grasa',
  'sin_lactosa',
  'organico',
  'menu_ligero',
] as const

/**
 * Tipos de curso (plato)
 */
export const DISH_COURSES = ['FIRST', 'SECOND', 'DESSERT'] as const

/**
 * Schema para información nutricional
 */
export const nutritionSchema = z.object({
  kcal: z.number().min(0).max(5000).optional(),
  protein: z.number().min(0).max(500).optional(), // gramos
  carbs: z.number().min(0).max(500).optional(), // gramos
  fat: z.number().min(0).max(500).optional(), // gramos
  fiber: z.number().min(0).max(100).optional(), // gramos
  salt: z.number().min(0).max(50).optional(), // gramos
})

/**
 * Schema para crear un plato
 */
export const createDishSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres')
    .trim(),

  course: z.enum(DISH_COURSES, {
    errorMap: () => ({ message: 'Tipo de plato inválido' }),
  }),

  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede superar 500 caracteres')
    .trim()
    .optional(),

  ingredients: z
    .string()
    .min(5, 'Los ingredientes deben tener al menos 5 caracteres')
    .max(1000, 'Los ingredientes no pueden superar 1000 caracteres')
    .trim(),

  allergens: z
    .array(z.enum(ALLERGENS))
    .default([])
    .refine((allergens) => new Set(allergens).size === allergens.length, {
      message: 'No puede haber alérgenos duplicados',
    }),

  tags: z
    .array(z.enum(NUTRITION_TAGS))
    .default([])
    .refine((tags) => new Set(tags).size === tags.length, {
      message: 'No puede haber etiquetas duplicadas',
    }),

  nutrition: nutritionSchema.optional(),

  basePrice: z
    .number()
    .min(0.01, 'El precio debe ser mayor a 0')
    .max(50, 'El precio no puede superar 50€')
    .multipleOf(0.01, 'El precio debe tener máximo 2 decimales'),

  imageUrl: z
    .string()
    .url('URL de imagen inválida')
    .optional()
    .or(z.literal('')),

  active: z.boolean().default(true),
})

/**
 * Schema para actualizar un plato
 * Todos los campos son opcionales excepto al menos uno debe estar presente
 */
export const updateDishSchema = createDishSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  })

/**
 * Schema para filtros de búsqueda
 */
export const dishFiltersSchema = z.object({
  search: z.string().optional(),
  course: z.enum(DISH_COURSES).optional(),
  active: z.enum(['true', 'false', 'all']).default('all'),
  allergens: z.array(z.enum(ALLERGENS)).optional(),
  tags: z.array(z.enum(NUTRITION_TAGS)).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'course', 'basePrice', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Schema para clonar un plato
 */
export const cloneDishSchema = z.object({
  newName: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres')
    .trim()
    .optional(),
})

/**
 * Tipos inferidos de los schemas
 */
export type CreateDishInput = z.infer<typeof createDishSchema>
export type UpdateDishInput = z.infer<typeof updateDishSchema>
export type DishFilters = z.infer<typeof dishFiltersSchema>
export type CloneDishInput = z.infer<typeof cloneDishSchema>
export type Allergen = (typeof ALLERGENS)[number]
export type NutritionTag = (typeof NUTRITION_TAGS)[number]
export type DishCourse = (typeof DISH_COURSES)[number]
export type Nutrition = z.infer<typeof nutritionSchema>

/**
 * Función helper para validar y formatear labels
 */
export function formatDishLabels(
  allergens: Allergen[],
  tags: NutritionTag[]
): string[] {
  return [...allergens, ...tags]
}

/**
 * Función helper para parsear labels
 */
export function parseDishLabels(labels: string[]): {
  allergens: Allergen[]
  tags: NutritionTag[]
} {
  const allergens = labels.filter((label) =>
    ALLERGENS.includes(label as Allergen)
  ) as Allergen[]

  const tags = labels.filter((label) =>
    NUTRITION_TAGS.includes(label as NutritionTag)
  ) as NutritionTag[]

  return { allergens, tags }
}

/**
 * Traducciones para la UI
 */
export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  crustaceos: 'Crustáceos',
  huevos: 'Huevos',
  pescado: 'Pescado',
  cacahuetes: 'Cacahuetes',
  soja: 'Soja',
  lactosa: 'Lactosa',
  frutos_secos: 'Frutos Secos',
  apio: 'Apio',
  mostaza: 'Mostaza',
  sesamo: 'Sésamo',
  sulfitos: 'Sulfitos',
  altramuces: 'Altramuces',
  moluscos: 'Moluscos',
}

export const NUTRITION_TAG_LABELS: Record<NutritionTag, string> = {
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  sin_gluten: 'Sin Gluten',
  bajo_en_calorias: 'Bajo en Calorías',
  alto_en_proteina: 'Alto en Proteína',
  bajo_en_grasa: 'Bajo en Grasa',
  sin_lactosa: 'Sin Lactosa',
  organico: 'Orgánico',
  menu_ligero: 'Menú Ligero',
}

export const DISH_COURSE_LABELS: Record<DishCourse, string> = {
  FIRST: 'Primer Plato',
  SECOND: 'Segundo Plato',
  DESSERT: 'Postre',
}

