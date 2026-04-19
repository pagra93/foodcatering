import { z } from 'zod'

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser hex de 6 dígitos (ej: #3B82F6)')

export const updateBrandingSchema = z.object({
  primaryColor: hexColor.nullable().optional(),
  secondaryColor: hexColor.nullable().optional(),
  logoUrl: z.string().url('URL del logo inválida').nullable().optional(),
  faviconUrl: z.string().url('URL del favicon inválida').nullable().optional(),
})
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>

export const updateSystemSettingsSchema = z.object({
  defaultPrimaryColor: hexColor,
  defaultSecondaryColor: hexColor.nullable().optional(),
  defaultLogoUrl: z.string().url().nullable().optional(),
  defaultFaviconUrl: z.string().url().nullable().optional(),
  brandName: z.string().min(2).max(100),
})

export const overrideTenantBrandingSchema = updateBrandingSchema.extend({
  tenantId: z.string().uuid(),
})
