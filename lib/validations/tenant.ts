/**
 * Esquemas de validación Zod para Tenants
 * Incluye validación de creación y edición
 */

import { z } from 'zod'

/**
 * Schema para crear un tenant (empresa o catering)
 */
export const createTenantSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  
  type: z.enum(['EMPRESA', 'CATERING'], {
    required_error: 'El tipo es requerido',
  }),
  
  subdomain: z.string()
    .min(3, 'El subdominio debe tener al menos 3 caracteres')
    .max(63, 'El subdominio no puede tener más de 63 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El subdominio solo puede contener letras minúsculas, números y guiones')
    .regex(/^[a-z0-9]/, 'El subdominio debe empezar con letra o número')
    .regex(/[a-z0-9]$/, 'El subdominio debe terminar con letra o número'),
  
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'], {
    required_error: 'El estado es requerido',
  }).default('ACTIVE'),
  
  // Branding
  primaryColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color inválido (formato: #RRGGBB)')
    .optional(),
  
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  
  // Contacto
  contactEmail: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  
  contactPhone: z.string()
    .min(9, 'Teléfono inválido')
    .max(20, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  
  // Dirección (solo para caterings)
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().default('España'),
  
  // Configuración
  timezone: z.string().default('Europe/Madrid'),
  currency: z.string().default('EUR'),
  language: z.string().default('es'),
  
  // Notas internas
  notes: z.string().optional().or(z.literal('')),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>

/**
 * Schema para editar un tenant
 */
export const updateTenantSchema = createTenantSchema.partial().extend({
  id: z.string().uuid('ID inválido'),
})

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>

/**
 * Schema para cambiar el estado de un tenant
 */
export const updateTenantStatusSchema = z.object({
  id: z.string().uuid('ID inválido'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']),
  reason: z.string()
    .min(10, 'La razón debe tener al menos 10 caracteres')
    .optional(),
})

export type UpdateTenantStatusInput = z.infer<typeof updateTenantStatusSchema>

/**
 * Schema para filtros de búsqueda
 */
export const tenantFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['EMPRESA', 'CATERING', 'ALL']).optional().default('ALL'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE', 'ALL']).optional().default('ALL'),
  sortBy: z.enum(['name', 'createdAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
})

export type TenantFiltersInput = z.infer<typeof tenantFiltersSchema>

