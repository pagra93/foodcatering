/**
 * Fuente de verdad de alérgenos/etiquetas para los seeds.
 *
 * - `CANONICAL_ALLERGENS`: los 14 oficiales EU (code = slug español), igual que
 *   el catálogo en producción (tabla Allergen). El admin puede añadir extras.
 * - `splitEtiquetas`: separa la lista mixta histórica (alérgenos + tags, es/en)
 *   en `labels` (tags nutricionales canónicos) y `allergenCodes` (relación
 *   DishAllergen).
 * - `normalizeAllergyCodes`: normaliza las alergias de un empleado a códigos
 *   canónicos del catálogo.
 */

import type { AllergenCategory } from '@prisma/client'

export const CANONICAL_ALLERGENS: {
  code: string
  name: string
  category: AllergenCategory
}[] = [
  { code: 'gluten', name: 'Gluten', category: 'CEREALS_WITH_GLUTEN' },
  { code: 'crustaceos', name: 'Crustáceos', category: 'CRUSTACEANS' },
  { code: 'huevos', name: 'Huevos', category: 'EGGS' },
  { code: 'pescado', name: 'Pescado', category: 'FISH' },
  { code: 'cacahuetes', name: 'Cacahuetes', category: 'PEANUTS' },
  { code: 'soja', name: 'Soja', category: 'SOYBEANS' },
  { code: 'lactosa', name: 'Lácteos', category: 'MILK' },
  { code: 'frutos_secos', name: 'Frutos Secos', category: 'TREE_NUTS' },
  { code: 'apio', name: 'Apio', category: 'CELERY' },
  { code: 'mostaza', name: 'Mostaza', category: 'MUSTARD' },
  { code: 'sesamo', name: 'Sésamo', category: 'SESAME' },
  { code: 'sulfitos', name: 'Sulfitos', category: 'SULPHITES' },
  { code: 'altramuces', name: 'Altramuces', category: 'LUPIN' },
  { code: 'moluscos', name: 'Moluscos', category: 'MOLLUSCS' },
]

const ALLERGEN_CODES = new Set(CANONICAL_ALLERGENS.map((a) => a.code))

/** Cualquier etiqueta histórica (es/en) → código canónico de alérgeno. */
const ALLERGEN_LABEL_TO_CODE: Record<string, string> = {
  gluten: 'gluten', contains_gluten: 'gluten',
  crustaceos: 'crustaceos', crustaceans: 'crustaceos', contains_crustaceans: 'crustaceos',
  huevos: 'huevos', huevo: 'huevos', eggs: 'huevos', contains_egg: 'huevos', contains_eggs: 'huevos',
  pescado: 'pescado', fish: 'pescado', contains_fish: 'pescado',
  cacahuetes: 'cacahuetes', cacahuete: 'cacahuetes', peanuts: 'cacahuetes', contains_peanuts: 'cacahuetes',
  soja: 'soja', soy: 'soja', soybeans: 'soja', contains_soy: 'soja',
  lactosa: 'lactosa', lacteos: 'lactosa', milk: 'lactosa', lactose: 'lactosa', leche: 'lactosa', contains_milk: 'lactosa',
  frutos_secos: 'frutos_secos', tree_nuts: 'frutos_secos', nuts: 'frutos_secos', contains_nuts: 'frutos_secos',
  apio: 'apio', celery: 'apio', contains_celery: 'apio',
  mostaza: 'mostaza', mustard: 'mostaza', contains_mustard: 'mostaza',
  sesamo: 'sesamo', sesame: 'sesamo', contains_sesame: 'sesamo',
  sulfitos: 'sulfitos', sulphites: 'sulfitos', sulfites: 'sulfitos',
  altramuces: 'altramuces', lupin: 'altramuces',
  moluscos: 'moluscos', molluscs: 'moluscos', contains_molluscs: 'moluscos',
}

/** Etiqueta nutricional (en) → tag canónico (es). */
const TAG_ALIAS: Record<string, string> = {
  vegan: 'vegano',
  vegetarian: 'vegetariano',
  gluten_free: 'sin_gluten',
  low_calorie: 'bajo_en_calorias',
  high_protein: 'alto_en_proteina',
  low_fat: 'bajo_en_grasa',
  lactose_free: 'sin_lactosa',
  organic: 'organico',
  light: 'menu_ligero',
}
const NUTRITION_TAGS = new Set([
  'vegetariano', 'vegano', 'sin_gluten', 'bajo_en_calorias', 'alto_en_proteina',
  'bajo_en_grasa', 'sin_lactosa', 'organico', 'menu_ligero',
])

/** Separa etiquetas mixtas en tags nutricionales y códigos de alérgeno. */
export function splitEtiquetas(etiquetas: string[]): {
  labels: string[]
  allergenCodes: string[]
} {
  const labels = new Set<string>()
  const codes = new Set<string>()
  for (const raw of etiquetas) {
    const k = String(raw).toLowerCase()
    if (ALLERGEN_LABEL_TO_CODE[k]) {
      codes.add(ALLERGEN_LABEL_TO_CODE[k])
      continue
    }
    const tag = TAG_ALIAS[k] ?? k
    if (NUTRITION_TAGS.has(tag)) labels.add(tag)
  }
  return { labels: [...labels], allergenCodes: [...codes] }
}

/** Normaliza alergias de empleado (es/en) a códigos canónicos. */
export function normalizeAllergyCodes(codes: string[]): string[] {
  const out = new Set<string>()
  for (const raw of codes) {
    const k = String(raw).toLowerCase()
    const code = ALLERGEN_LABEL_TO_CODE[k] ?? (ALLERGEN_CODES.has(k) ? k : undefined)
    if (code) out.add(code)
  }
  return [...out]
}
