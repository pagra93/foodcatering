import { z } from 'zod'

// ─── Alérgenos ─────────────────────────────────────────────────────────

export const upsertAllergenSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(50).regex(/^[a-z_]+$/, 'Solo minúsculas y _'),
  name: z.string().min(2).max(100),
  category: z.enum([
    'CEREALS_WITH_GLUTEN', 'CRUSTACEANS', 'EGGS', 'FISH', 'PEANUTS',
    'SOYBEANS', 'MILK', 'TREE_NUTS', 'CELERY', 'MUSTARD', 'SESAME',
    'SULPHITES', 'LUPIN', 'MOLLUSCS', 'OTHER',
  ]),
  description: z.string().max(500).optional(),
  icon: z.string().url().optional(),
  active: z.boolean().default(true),
})

// ─── Holiday ───────────────────────────────────────────────────────────

export const upsertOfficialHolidaySchema = z.object({
  id: z.string().uuid().optional(),
  date: z.coerce.date(),
  name: z.string().min(2).max(200),
  scope: z.enum(['NATIONAL', 'REGION']),
  regionCode: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
})

export const upsertTenantHolidaySchema = z.object({
  id: z.string().uuid().optional(),
  date: z.coerce.date(),
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
})

export const toggleHolidayOverrideSchema = z.object({
  holidayId: z.string().uuid(),
  disabled: z.boolean(),
  notes: z.string().max(500).optional(),
})

// ─── IncidentReason ────────────────────────────────────────────────────

export const upsertIncidentReasonSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  defaultSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  category: z.string().min(2).max(50),
  requiresCompensation: z.boolean().default(false),
  active: z.boolean().default(true),
})

// ─── MenuTemplate ──────────────────────────────────────────────────────

const daySchema = z.object({
  first: z.array(z.string().min(1)).default([]),
  second: z.array(z.string().min(1)).default([]),
  dessert: z.array(z.string().min(1)).default([]),
})

export const menuTemplateStructureSchema = z.object({
  monday: daySchema,
  tuesday: daySchema,
  wednesday: daySchema,
  thursday: daySchema,
  friday: daySchema,
})

export const upsertMenuTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  structure: menuTemplateStructureSchema,
  active: z.boolean().default(true),
})

// ─── DeliveryZone ──────────────────────────────────────────────────────

export const upsertDeliveryZoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  postalCodes: z.array(z.string().regex(/^\d{5}$/, 'CP español: 5 dígitos')).min(1),
  maxDistanceKm: z.number().int().positive().max(500).optional(),
  defaultDriver: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  active: z.boolean().default(true),
})
