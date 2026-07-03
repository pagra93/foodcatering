/**
 * Validaciones Zod para empresas
 * Incluye: Tenant, Company, Policy, Site inicial
 */

import { z } from 'zod'

/**
 * Schema para crear una empresa completa
 * Incluye toda la información necesaria en un solo formulario
 */
export const createCompanySchema = z.object({
  // ===== INFORMACIÓN BÁSICA (Tenant) =====
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  subdomain: z
    .string()
    .min(3, 'El subdominio debe tener al menos 3 caracteres')
    .max(20, 'El subdominio no puede tener más de 20 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'El subdominio solo puede contener letras minúsculas, números y guiones'
    ),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  contactPhone: z.string().optional(),

  // ===== BRANDING =====
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido').optional(),
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),

  // ===== INFORMACIÓN LEGAL (Company) =====
  legalName: z.string().min(2, 'La razón social debe tener al menos 2 caracteres'),
  cif: z
    .string()
    .regex(
      /^[A-Z][0-9]{8}$/,
      'CIF inválido (debe ser letra mayúscula seguida de 8 dígitos)'
    ),
  billingAddress: z.string().min(5, 'La dirección de facturación es requerida'),
  saasPlanId: z.string().uuid('Selecciona un plan').optional().nullable(),

  // ===== POLÍTICA DE SERVICIO (CompanyPolicy) =====
  policy: z.object({
    cutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida (HH:mm)'),
    daysActive: z
      .array(
        z.enum([
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ])
      )
      .min(1, 'Selecciona al menos un día'),
    limitPerDay: z.coerce
      .number()
      .min(0, 'El límite debe ser mayor o igual a 0')
      .max(20, 'El límite no puede ser mayor a 20€'),
    copayCompany: z.coerce.number().min(0, 'El copago debe ser mayor o igual a 0'),
    copayEmployee: z.coerce.number().min(0, 'El copago debe ser mayor o igual a 0'),
    noShowRule: z.enum(['CHARGE', 'NO_CHARGE', 'PARTIAL']).default('NO_CHARGE'),
  }),

  // ===== SEDE INICIAL (CompanySite) =====
  site: z.object({
    name: z.string().min(2, 'El nombre de la sede debe tener al menos 2 caracteres'),
    address: z.string().min(5, 'La dirección es requerida'),
    deliveryWindow: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido (HH:mm-HH:mm)')
      .optional()
      .or(z.literal('')),
  }),

  // ===== CONFIGURACIÓN REGIONAL =====
  timezone: z.string().default('Europe/Madrid'),
  currency: z.string().default('EUR'),
  language: z.string().default('es'),
})

export type CreateCompanyInput = z.infer<typeof createCompanySchema>

/**
 * Schema para actualizar una empresa
 * Similar al de creación pero con campos opcionales
 */
export const updateCompanySchema = createCompanySchema.partial()

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

