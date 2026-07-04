/**
 * Validación (Zod) para alta y edición de Caterings.
 * Valida la forma que esperan createCatering / updateCatering en
 * lib/db/queries/caterings.ts.
 */

import { z } from 'zod'

/** Convierte un nombre en un subdominio slug válido. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar acentos (combining marks)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

const zoneSchema = z.object({
  name: z.string().min(1),
  postalCodes: z.array(z.string()).default([]),
  maxDistance: z.number().nonnegative().default(0),
  operator: z.string().default(''),
})

export const createCateringSchema = z.object({
  // Tenant
  name: z.string().min(1, 'El nombre es obligatorio'),
  subdomain: z
    .string()
    .min(2, 'Subdominio inválido')
    .regex(/^[a-z0-9-]+$/, 'El subdominio solo admite minúsculas, números y guiones'),
  contactEmail: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  contactPhone: z.string().optional(),
  primaryColor: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),

  // Restaurant
  legalName: z.string().min(1, 'La razón social es obligatoria'),
  cif: z.string().min(1, 'El CIF es obligatorio'),
  billingAddress: z.string().min(1, 'La dirección de facturación es obligatoria'),
  iban: z.string().optional(),
  contactPerson: z.string().min(1, 'La persona de contacto es obligatoria'),
  restaurantContactEmail: z.string().email('Email de contacto inválido'),
  restaurantContactPhone: z.string().min(1, 'El teléfono de contacto es obligatorio'),
  dailyCapacity: z.coerce.number().int().positive('La capacidad debe ser mayor que 0'),
  cutoffTime: z.string().min(1),
  operationalDays: z.array(z.string()).min(1, 'Selecciona al menos un día operativo'),
  zones: z.array(zoneSchema).default([]),
  commission: z.coerce.number().min(0).max(1, 'La comisión es una fracción (0–1)'),

  // Regional
  timezone: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
})

export type CreateCateringInput = z.infer<typeof createCateringSchema>

export const updateCateringSchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  contactPhone: z.string().optional(),
  primaryColor: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  legalName: z.string().min(1).optional(),
  billingAddress: z.string().min(1).optional(),
  iban: z.string().optional(),
  contactPerson: z.string().min(1).optional(),
  restaurantContactEmail: z.string().email().optional(),
  restaurantContactPhone: z.string().optional(),
  dailyCapacity: z.coerce.number().int().positive().optional(),
  cutoffTime: z.string().optional(),
  operationalDays: z.array(z.string()).optional(),
  commission: z.coerce.number().min(0).max(1).optional(),
  /** Plan de catering asignado. null = sin plan. */
  saasPlanId: z.string().nullable().optional(),
})

export type UpdateCateringInput = z.infer<typeof updateCateringSchema>
