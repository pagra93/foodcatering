'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import {
  upsertMenuTemplateSchema,
  upsertDeliveryZoneSchema,
} from '@/lib/validations/catalogs'

const CATALOG_ADMIN_ROLES = ['ADMIN_CATERING', 'CHEF', 'SUPER_ADMIN'] as const

async function requireCateringAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  const tenantId = session.user.tenantId
  if (!tenantId) throw new DomainError('Tenant no resuelto', 403)
  if (
    session.user.role !== 'ADMIN_CATERING' &&
    session.user.role !== 'CHEF' &&
    session.user.role !== 'SUPER_ADMIN'
  ) {
    throw new DomainError(
      'Solo el admin del catering puede gestionar catálogos',
      403
    )
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { type: true },
  })
  if (tenant?.type !== 'CATERING' && session.user.role !== 'SUPER_ADMIN') {
    throw new DomainError('Tu tenant no es de tipo CATERING', 403)
  }
  return { ...session.user, tenantId }
}

// ─── Menu Templates ────────────────────────────────────────────────────

export async function upsertMenuTemplateAction(
  input: Parameters<typeof upsertMenuTemplateSchema.parse>[0]
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const actor = await requireCateringAdmin()
    const data = upsertMenuTemplateSchema.parse(input)
    const tenantCatering = actor.tenantId

    const templatePermission = data.id
      ? 'cat-config-template:edit'
      : 'cat-config-template:create'
    if (
      !permittedAction(actor.permissions, actor.role, templatePermission, [
        ...CATALOG_ADMIN_ROLES,
      ])
    ) {
      throw new DomainError(
        'No tienes permiso para gestionar plantillas de menú',
        403
      )
    }

    if (data.id) {
      const before = await prisma.menuTemplate.findUnique({
        where: { id: data.id },
      })
      if (!before) throw new DomainError('Plantilla no encontrada', 404)
      if (before.tenantCatering !== tenantCatering) {
        throw new DomainError('Esta plantilla no pertenece a tu catering', 403)
      }
      const updated = await prisma.menuTemplate.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description ?? null,
          structure: data.structure,
          active: data.active,
        },
      })
      await logAudit({
        tenantId: tenantCatering,
        actorId: actor.id,
        action: 'UPDATE',
        entity: 'MenuTemplate',
        entityId: updated.id,
        diff: { before: { name: before.name }, after: { name: data.name } },
      })
    } else {
      const created = await prisma.menuTemplate.create({
        data: {
          tenantCatering,
          name: data.name,
          description: data.description ?? null,
          structure: data.structure,
          active: data.active,
          createdBy: actor.id,
        },
      })
      await logAudit({
        tenantId: tenantCatering,
        actorId: actor.id,
        action: 'CREATE',
        entity: 'MenuTemplate',
        entityId: created.id,
        diff: { before: null, after: { name: created.name } },
      })
    }

    revalidatePath('/catering/configuracion/menu-templates')
  })
}

export async function toggleMenuTemplateAction(input: {
  id: string
  active: boolean
}): Promise<ActionResult<void>> {
  return withAction(async () => {
    const actor = await requireCateringAdmin()
    const tenantCatering = actor.tenantId

    const current = await prisma.menuTemplate.findUnique({
      where: { id: input.id },
    })
    if (!current) throw new DomainError('Plantilla no encontrada', 404)
    if (current.tenantCatering !== tenantCatering) {
      throw new DomainError('Esta plantilla no pertenece a tu catering', 403)
    }

    if (
      !permittedAction(actor.permissions, actor.role, 'cat-config-template:edit', [
        ...CATALOG_ADMIN_ROLES,
      ])
    ) {
      throw new DomainError(
        'No tienes permiso para gestionar plantillas de menú',
        403
      )
    }

    await prisma.menuTemplate.update({
      where: { id: input.id },
      data: { active: input.active },
    })

    await logAudit({
      tenantId: tenantCatering,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'MenuTemplate',
      entityId: input.id,
      diff: { before: { active: current.active }, after: { active: input.active } },
    })

    revalidatePath('/catering/configuracion/menu-templates')
  })
}

export async function deleteMenuTemplateAction(input: {
  id: string
}): Promise<ActionResult<void>> {
  return withAction(async () => {
    const actor = await requireCateringAdmin()
    const tenantCatering = actor.tenantId

    const current = await prisma.menuTemplate.findUnique({
      where: { id: input.id },
    })
    if (!current) throw new DomainError('Plantilla no encontrada', 404)
    if (current.tenantCatering !== tenantCatering) {
      throw new DomainError('Esta plantilla no pertenece a tu catering', 403)
    }

    if (
      !permittedAction(actor.permissions, actor.role, 'cat-config-template:delete', [
        ...CATALOG_ADMIN_ROLES,
      ])
    ) {
      throw new DomainError(
        'No tienes permiso para eliminar plantillas de menú',
        403
      )
    }

    await prisma.menuTemplate.delete({ where: { id: input.id } })

    await logAudit({
      tenantId: tenantCatering,
      actorId: actor.id,
      action: 'DELETE',
      entity: 'MenuTemplate',
      entityId: input.id,
      diff: { before: { name: current.name }, after: null },
    })

    revalidatePath('/catering/configuracion/menu-templates')
  })
}

// ─── Delivery Zones ────────────────────────────────────────────────────

export async function upsertDeliveryZoneAction(
  input: Parameters<typeof upsertDeliveryZoneSchema.parse>[0]
): Promise<ActionResult<void>> {
  return withAction(async () => {
    const actor = await requireCateringAdmin()
    const data = upsertDeliveryZoneSchema.parse(input)
    const tenantCatering = actor.tenantId

    const zonePermission = data.id
      ? 'cat-config-zone:edit'
      : 'cat-config-zone:create'
    if (
      !permittedAction(actor.permissions, actor.role, zonePermission, [
        ...CATALOG_ADMIN_ROLES,
      ])
    ) {
      throw new DomainError(
        'No tienes permiso para gestionar zonas de reparto',
        403
      )
    }

    if (data.id) {
      const before = await prisma.deliveryZone.findUnique({
        where: { id: data.id },
      })
      if (!before) throw new DomainError('Zona no encontrada', 404)
      if (before.tenantCatering !== tenantCatering) {
        throw new DomainError('Esta zona no pertenece a tu catering', 403)
      }
      const updated = await prisma.deliveryZone.update({
        where: { id: data.id },
        data: {
          name: data.name,
          postalCodes: data.postalCodes,
          maxDistanceKm: data.maxDistanceKm ?? null,
          defaultDriver: data.defaultDriver ?? null,
          notes: data.notes ?? null,
          active: data.active,
        },
      })
      await logAudit({
        tenantId: tenantCatering,
        actorId: actor.id,
        action: 'UPDATE',
        entity: 'DeliveryZone',
        entityId: updated.id,
        diff: { before: { name: before.name }, after: { name: data.name } },
      })
    } else {
      const created = await prisma.deliveryZone.create({
        data: {
          tenantCatering,
          name: data.name,
          postalCodes: data.postalCodes,
          maxDistanceKm: data.maxDistanceKm ?? null,
          defaultDriver: data.defaultDriver ?? null,
          notes: data.notes ?? null,
          active: data.active,
        },
      })
      await logAudit({
        tenantId: tenantCatering,
        actorId: actor.id,
        action: 'CREATE',
        entity: 'DeliveryZone',
        entityId: created.id,
        diff: { before: null, after: { name: created.name } },
      })
    }

    revalidatePath('/catering/configuracion/zones')
  })
}

export async function toggleDeliveryZoneAction(input: {
  id: string
  active: boolean
}): Promise<ActionResult<void>> {
  return withAction(async () => {
    const actor = await requireCateringAdmin()
    const tenantCatering = actor.tenantId

    const current = await prisma.deliveryZone.findUnique({
      where: { id: input.id },
    })
    if (!current) throw new DomainError('Zona no encontrada', 404)
    if (current.tenantCatering !== tenantCatering) {
      throw new DomainError('Esta zona no pertenece a tu catering', 403)
    }

    if (
      !permittedAction(actor.permissions, actor.role, 'cat-config-zone:edit', [
        ...CATALOG_ADMIN_ROLES,
      ])
    ) {
      throw new DomainError(
        'No tienes permiso para gestionar zonas de reparto',
        403
      )
    }

    await prisma.deliveryZone.update({
      where: { id: input.id },
      data: { active: input.active },
    })

    await logAudit({
      tenantId: tenantCatering,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'DeliveryZone',
      entityId: input.id,
      diff: { before: { active: current.active }, after: { active: input.active } },
    })

    revalidatePath('/catering/configuracion/zones')
  })
}

export async function deleteDeliveryZoneAction(input: {
  id: string
}): Promise<ActionResult<void>> {
  return withAction(async () => {
    const actor = await requireCateringAdmin()
    const tenantCatering = actor.tenantId

    const current = await prisma.deliveryZone.findUnique({
      where: { id: input.id },
    })
    if (!current) throw new DomainError('Zona no encontrada', 404)
    if (current.tenantCatering !== tenantCatering) {
      throw new DomainError('Esta zona no pertenece a tu catering', 403)
    }

    if (
      !permittedAction(actor.permissions, actor.role, 'cat-config-zone:delete', [
        ...CATALOG_ADMIN_ROLES,
      ])
    ) {
      throw new DomainError(
        'No tienes permiso para eliminar zonas de reparto',
        403
      )
    }

    await prisma.deliveryZone.delete({ where: { id: input.id } })

    await logAudit({
      tenantId: tenantCatering,
      actorId: actor.id,
      action: 'DELETE',
      entity: 'DeliveryZone',
      entityId: input.id,
      diff: { before: { name: current.name }, after: null },
    })

    revalidatePath('/catering/configuracion/zones')
  })
}
