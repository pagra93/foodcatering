'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import {
  overrideTenantBrandingSchema,
  updateBrandingSchema,
  updateSystemSettingsSchema,
  type UpdateBrandingInput,
} from '@/lib/validations/branding'

async function requireActor() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  return session.user
}

async function requireSuperAdmin(permission: string) {
  const actor = await requireActor()
  if (!permittedAction(actor.permissions, actor.role, permission, ['SUPER_ADMIN'])) {
    throw new Error('Acción reservada al super admin')
  }
  return actor
}

/**
 * Empresa / Catering edita su propio branding.
 * Permitido: ADMIN_EMPRESA (si tenant es EMPRESA), ADMIN_CATERING (si CATERING),
 * o SUPER_ADMIN.
 */
export async function updateOwnBrandingAction(input: UpdateBrandingInput) {
  const actor = await requireActor()
  const data = updateBrandingSchema.parse(input)

  if (!actor.tenantId) throw new Error('Tenant no resuelto')

  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { type: true },
  })
  if (!tenant) throw new Error('Tenant no encontrado')

  // Permiso de branding según el portal del tenant; roles legacy como fallback.
  const brandingPerm =
    tenant.type === 'CATERING'
      ? 'cat-config-branding:edit'
      : 'emp-config-branding:edit'
  const legacyRoles =
    tenant.type === 'CATERING'
      ? ['SUPER_ADMIN', 'ADMIN_CATERING']
      : ['SUPER_ADMIN', 'ADMIN_EMPRESA']
  if (!permittedAction(actor.permissions, actor.role, brandingPerm, legacyRoles)) {
    throw new Error('No tienes permisos para editar el branding')
  }

  const updated = await prisma.tenant.update({
    where: { id: actor.tenantId },
    data: {
      primaryColor: data.primaryColor ?? null,
      secondaryColor: data.secondaryColor ?? null,
      logoUrl: data.logoUrl ?? null,
      faviconUrl: data.faviconUrl ?? null,
    },
  })

  await logAudit({
    tenantId: actor.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'Tenant',
    entityId: updated.id,
    diff: {
      before: null,
      after: {
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
      },
    },
  })

  revalidatePath('/empresa/configuracion/branding')
  revalidatePath('/catering/configuracion/branding')
  revalidatePath('/empresa', 'layout')
  revalidatePath('/catering', 'layout')
  revalidatePath('/empleado', 'layout')

  return { id: updated.id }
}

/**
 * SUPER_ADMIN puede editar el branding de CUALQUIER tenant.
 */
export async function overrideTenantBrandingAction(
  input: Parameters<typeof overrideTenantBrandingSchema.parse>[0]
) {
  const actor = await requireSuperAdmin('template-branding:edit')
  const data = overrideTenantBrandingSchema.parse(input)

  const updated = await prisma.tenant.update({
    where: { id: data.tenantId },
    data: {
      primaryColor: data.primaryColor ?? null,
      secondaryColor: data.secondaryColor ?? null,
      logoUrl: data.logoUrl ?? null,
      faviconUrl: data.faviconUrl ?? null,
    },
  })

  await logAudit({
    tenantId: data.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'Tenant',
    entityId: updated.id,
    diff: {
      before: null,
      after: {
        primaryColor: data.primaryColor,
        override: true,
      },
    },
  })

  revalidatePath('/admin/templates/branding')
  revalidatePath('/empresa', 'layout')
  revalidatePath('/catering', 'layout')
  revalidatePath('/empleado', 'layout')

  return { id: updated.id }
}

/**
 * SUPER_ADMIN edita los defaults del sistema.
 */
export async function updateSystemSettingsAction(
  input: Parameters<typeof updateSystemSettingsSchema.parse>[0]
) {
  const actor = await requireSuperAdmin('template-branding:edit')
  const data = updateSystemSettingsSchema.parse(input)

  const updated = await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {
      defaultPrimaryColor: data.defaultPrimaryColor,
      defaultSecondaryColor: data.defaultSecondaryColor ?? null,
      defaultLogoUrl: data.defaultLogoUrl ?? null,
      defaultFaviconUrl: data.defaultFaviconUrl ?? null,
      brandName: data.brandName,
      updatedBy: actor.id,
    },
    create: {
      id: 'singleton',
      defaultPrimaryColor: data.defaultPrimaryColor,
      defaultSecondaryColor: data.defaultSecondaryColor ?? null,
      defaultLogoUrl: data.defaultLogoUrl ?? null,
      defaultFaviconUrl: data.defaultFaviconUrl ?? null,
      brandName: data.brandName,
      updatedBy: actor.id,
    },
  })

  await logAudit({
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'SystemSettings',
    entityId: updated.id,
    diff: {
      before: null,
      after: {
        defaultPrimaryColor: data.defaultPrimaryColor,
        brandName: data.brandName,
      },
    },
  })

  revalidatePath('/admin/templates/branding')
  revalidatePath('/', 'layout')

  return { id: updated.id }
}
