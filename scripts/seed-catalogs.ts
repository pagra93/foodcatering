/**
 * Seed idempotente de catálogos:
 * - 14 alérgenos oficiales EU
 * - Festivos nacionales ES 2026-2027
 * - Motivos de incidencia del sistema
 *
 * Ejecutable: npx tsx scripts/seed-catalogs.ts
 */

import { PrismaClient } from '@prisma/client'
import type { AllergenCategory } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Alérgenos EU (Reglamento UE 1169/2011) ────────────────────────────

const ALLERGENS: Array<{
  code: string
  name: string
  category: AllergenCategory
  description: string
}> = [
  { code: 'gluten', name: 'Cereales con gluten', category: 'CEREALS_WITH_GLUTEN', description: 'Trigo, centeno, cebada, avena, espelta, kamut' },
  { code: 'crustaceans', name: 'Crustáceos', category: 'CRUSTACEANS', description: 'Gambas, langostinos, cangrejos, bogavante…' },
  { code: 'eggs', name: 'Huevos', category: 'EGGS', description: 'Huevo y derivados' },
  { code: 'fish', name: 'Pescado', category: 'FISH', description: 'Cualquier tipo de pescado' },
  { code: 'peanuts', name: 'Cacahuetes', category: 'PEANUTS', description: 'Cacahuete y derivados' },
  { code: 'soy', name: 'Soja', category: 'SOYBEANS', description: 'Soja y productos a base de soja' },
  { code: 'lactose', name: 'Leche y lácteos (lactosa)', category: 'MILK', description: 'Leche y derivados incluida la lactosa' },
  { code: 'tree_nuts', name: 'Frutos de cáscara', category: 'TREE_NUTS', description: 'Almendras, avellanas, nueces, anacardos…' },
  { code: 'celery', name: 'Apio', category: 'CELERY', description: 'Apio y productos derivados' },
  { code: 'mustard', name: 'Mostaza', category: 'MUSTARD', description: 'Mostaza y productos a base de mostaza' },
  { code: 'sesame', name: 'Sésamo', category: 'SESAME', description: 'Granos de sésamo y derivados' },
  { code: 'sulphites', name: 'Sulfitos', category: 'SULPHITES', description: 'Dióxido de azufre y sulfitos >10 mg/kg' },
  { code: 'lupin', name: 'Altramuces', category: 'LUPIN', description: 'Altramuces y productos a base de altramuces' },
  { code: 'molluscs', name: 'Moluscos', category: 'MOLLUSCS', description: 'Mejillones, almejas, pulpo, calamar…' },
]

// ─── Festivos nacionales España ────────────────────────────────────────

const NATIONAL_HOLIDAYS_ES: Array<{ date: string; name: string }> = [
  // 2026
  { date: '2026-01-01', name: 'Año Nuevo' },
  { date: '2026-01-06', name: 'Reyes Magos' },
  { date: '2026-04-03', name: 'Viernes Santo' },
  { date: '2026-05-01', name: 'Día del Trabajo' },
  { date: '2026-08-15', name: 'Asunción de la Virgen' },
  { date: '2026-10-12', name: 'Fiesta Nacional de España' },
  { date: '2026-11-02', name: 'Todos los Santos (trasladado)' },
  { date: '2026-12-07', name: 'Constitución (trasladado)' },
  { date: '2026-12-08', name: 'Inmaculada Concepción' },
  { date: '2026-12-25', name: 'Navidad' },
  // 2027
  { date: '2027-01-01', name: 'Año Nuevo' },
  { date: '2027-01-06', name: 'Reyes Magos' },
  { date: '2027-03-26', name: 'Viernes Santo' },
  { date: '2027-05-01', name: 'Día del Trabajo' },
  { date: '2027-08-15', name: 'Asunción de la Virgen' },
  { date: '2027-10-12', name: 'Fiesta Nacional de España' },
  { date: '2027-11-01', name: 'Todos los Santos' },
  { date: '2027-12-06', name: 'Día de la Constitución' },
  { date: '2027-12-08', name: 'Inmaculada Concepción' },
  { date: '2027-12-25', name: 'Navidad' },
]

// ─── Motivos de incidencia estándar ────────────────────────────────────

const INCIDENT_REASONS: Array<{
  code: string
  name: string
  category: string
  defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH'
  requiresCompensation: boolean
}> = [
  { code: 'cold_food', name: 'Comida fría', category: 'quality', defaultSeverity: 'MEDIUM', requiresCompensation: true },
  { code: 'wrong_dish', name: 'Plato equivocado', category: 'delivery', defaultSeverity: 'MEDIUM', requiresCompensation: true },
  { code: 'missing_items', name: 'Artículos faltantes', category: 'delivery', defaultSeverity: 'MEDIUM', requiresCompensation: true },
  { code: 'late_delivery', name: 'Entrega tardía', category: 'delivery', defaultSeverity: 'LOW', requiresCompensation: false },
  { code: 'allergen_violation', name: 'Violación de alérgenos', category: 'safety', defaultSeverity: 'HIGH', requiresCompensation: true },
  { code: 'damaged_packaging', name: 'Embalaje dañado', category: 'delivery', defaultSeverity: 'LOW', requiresCompensation: false },
  { code: 'undelivered', name: 'Pedido no entregado', category: 'delivery', defaultSeverity: 'HIGH', requiresCompensation: true },
  { code: 'quality_low', name: 'Calidad deficiente', category: 'quality', defaultSeverity: 'MEDIUM', requiresCompensation: true },
  { code: 'hygiene_issue', name: 'Problema de higiene', category: 'safety', defaultSeverity: 'HIGH', requiresCompensation: true },
  { code: 'other', name: 'Otro motivo', category: 'other', defaultSeverity: 'LOW', requiresCompensation: false },
]

async function main() {
  // Alérgenos
  for (const a of ALLERGENS) {
    await prisma.allergen.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    })
  }
  console.log(`✓ ${ALLERGENS.length} alérgenos EU sembrados`)

  // Festivos nacionales
  for (const h of NATIONAL_HOLIDAYS_ES) {
    const existing = await prisma.holiday.findFirst({
      where: {
        date: new Date(h.date),
        scope: 'NATIONAL',
        tenantId: null,
        regionCode: null,
      },
    })
    if (!existing) {
      await prisma.holiday.create({
        data: {
          date: new Date(h.date),
          name: h.name,
          scope: 'NATIONAL',
          description: 'Festivo nacional España',
        },
      })
    }
  }
  console.log(`✓ ${NATIONAL_HOLIDAYS_ES.length} festivos nacionales ES 2026-2027 sembrados`)

  // Motivos de incidencia
  for (const r of INCIDENT_REASONS) {
    await prisma.incidentReason.upsert({
      where: { code: r.code },
      update: {},
      create: {
        ...r,
        scope: 'SYSTEM',
      },
    })
  }
  console.log(`✓ ${INCIDENT_REASONS.length} motivos de incidencia sembrados`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
