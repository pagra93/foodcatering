'use server'

/**
 * Server Actions para /empresa/configuracion/usuarios.
 *
 * Gestión de usuarios con ROLES DE GESTIÓN del propio tenant:
 * ADMIN_EMPRESA, RRHH, FINANZAS, MANAGER_SEDE.
 *
 * Scope: sólo usuarios del propio tenant (no cross-tenant). El
 * ADMIN_EMPRESA puede crear/editar. RRHH y FINANZAS pueden ver pero no
 * crear ADMIN_EMPRESA (solo su nivel o inferior).
 */

import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { hash as bcryptHash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import type { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { EMPRESA_MANAGEMENT_ROLES } from '@/lib/db/queries/empresa-usuarios'
import { encryptPII } from '@/lib/crypto/pii'

const CONFIG_USER_ADMIN_ROLES = ['ADMIN_EMPRESA', 'SUPER_ADMIN'] as const

async function requireEmpresaAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  const actor = session.user
  if (actor.role !== 'ADMIN_EMPRESA' && actor.role !== 'SUPER_ADMIN') {
    throw new Error('Sólo ADMIN_EMPRESA puede gestionar usuarios')
  }
  return actor
}

const userInputSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE']),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
})

export async function createEmpresaUserAction(
  input: z.infer<typeof userInputSchema>
) {
  const actor = await requireEmpresaAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'emp-config-user:create', [
      ...CONFIG_USER_ADMIN_ROLES,
    ])
  ) {
    throw new Error('No tienes permiso para crear usuarios')
  }
  const data = userInputSchema.parse(input)
  if (!actor.tenantId) throw new Error('Tenant no resuelto')

  const existing = await prisma.user.findFirst({
    where: { tenantId: actor.tenantId, email: data.email },
  })
  if (existing) throw new Error('Ya existe un usuario con ese email')

  // Resolver el rol de sistema para setear roleId (RBAC dinámico). Sin roleId el
  // usuario se quedaría con permisos del mapa estático y bloqueado del portal (H2).
  const sysRole = await prisma.role.findFirst({
    where: { baseRole: data.role as UserRole, isSystem: true, category: 'EMPRESA' },
    select: { id: true },
  })
  if (!sysRole) throw new Error(`Rol de sistema no encontrado para ${data.role}`)

  const passwordHash = await bcryptHash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      tenantId: actor.tenantId,
      email: data.email,
      nameEnc: encryptPII(data.name),
      phoneEnc: data.phone ? encryptPII(data.phone) : null,
      role: data.role as UserRole,
      roleId: sysRole.id,
      passwordHash,
      status: 'ACTIVE',
    },
  })

  await logAudit({
    tenantId: actor.tenantId,
    actorId: actor.id,
    action: 'CREATE',
    entity: 'User',
    entityId: user.id,
    diff: {
      before: null,
      after: { email: user.email, role: user.role },
    },
  })

  revalidatePath('/empresa/configuracion/usuarios')
  return { id: user.id }
}

const updateSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z
    .enum(['ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE'])
    .optional(),
})

export async function updateEmpresaUserAction(
  input: z.infer<typeof updateSchema>
) {
  const actor = await requireEmpresaAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'emp-config-user:edit', [
      ...CONFIG_USER_ADMIN_ROLES,
    ])
  ) {
    throw new Error('No tienes permiso para editar usuarios')
  }
  const data = updateSchema.parse(input)
  if (!actor.tenantId) throw new Error('Tenant no resuelto')

  const current = await prisma.user.findFirst({
    where: { id: data.userId, tenantId: actor.tenantId },
  })
  if (!current) throw new Error('Usuario no encontrado en este tenant')

  if (!EMPRESA_MANAGEMENT_ROLES.includes(current.role)) {
    throw new Error(
      'Este usuario no es de gestión. Los empleados se editan en /empresa/empleados'
    )
  }

  let roleIdUpdate: string | undefined
  if (data.role) {
    const sysRole = await prisma.role.findFirst({
      where: { baseRole: data.role as UserRole, isSystem: true, category: 'EMPRESA' },
      select: { id: true },
    })
    if (!sysRole) throw new Error(`Rol de sistema no encontrado para ${data.role}`)
    roleIdUpdate = sysRole.id
  }

  const updated = await prisma.user.update({
    where: { id: data.userId },
    data: {
      ...(data.email && { email: data.email }),
      ...(data.name && { nameEnc: encryptPII(data.name) }),
      ...(data.phone !== undefined && {
        phoneEnc: data.phone ? encryptPII(data.phone) : null,
      }),
      ...(data.role && { role: data.role as UserRole }),
      ...(roleIdUpdate && { roleId: roleIdUpdate }),
    },
  })

  await logAudit({
    tenantId: actor.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'User',
    entityId: updated.id,
    diff: {
      before: { email: current.email, role: current.role },
      after: { email: updated.email, role: updated.role },
    },
  })

  revalidatePath('/empresa/configuracion/usuarios')
  return { id: updated.id }
}

export async function toggleEmpresaUserStatusAction(input: {
  userId: string
}) {
  const actor = await requireEmpresaAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'emp-config-user:delete', [
      ...CONFIG_USER_ADMIN_ROLES,
    ])
  ) {
    throw new Error('No tienes permiso para desactivar usuarios')
  }
  if (!actor.tenantId) throw new Error('Tenant no resuelto')

  const current = await prisma.user.findFirst({
    where: { id: input.userId, tenantId: actor.tenantId },
  })
  if (!current) throw new Error('Usuario no encontrado')

  if (current.id === actor.id) {
    throw new Error('No puedes suspender tu propia cuenta')
  }

  const nextStatus = current.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'

  await prisma.user.update({
    where: { id: current.id },
    data: { status: nextStatus },
  })

  await logAudit({
    tenantId: actor.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'User',
    entityId: current.id,
    diff: {
      before: { status: current.status },
      after: { status: nextStatus },
    },
  })

  revalidatePath('/empresa/configuracion/usuarios')
}

export async function resetEmpresaUserPasswordAction(input: {
  userId: string
}) {
  const actor = await requireEmpresaAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'emp-config-user:edit', [
      ...CONFIG_USER_ADMIN_ROLES,
    ])
  ) {
    throw new Error('No tienes permiso para restablecer contraseñas')
  }
  if (!actor.tenantId) throw new Error('Tenant no resuelto')

  const current = await prisma.user.findFirst({
    where: { id: input.userId, tenantId: actor.tenantId },
  })
  if (!current) throw new Error('Usuario no encontrado')

  const temp = randomBytes(12).toString('base64url').slice(0, 16)
  const passwordHash = await bcryptHash(temp, 10)

  await prisma.user.update({
    where: { id: current.id },
    // tokenVersion++ invalida las sesiones activas del usuario (H7).
    data: { passwordHash, tokenVersion: { increment: 1 } },
  })

  await logAudit({
    tenantId: actor.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'User',
    entityId: current.id,
    diff: { before: null, after: { password: 'reset' } },
  })

  return { temporaryPassword: temp }
}

export async function deleteEmpresaUserAction(input: { userId: string }) {
  const actor = await requireEmpresaAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'emp-config-user:delete', [
      ...CONFIG_USER_ADMIN_ROLES,
    ])
  ) {
    throw new Error('No tienes permiso para eliminar usuarios')
  }
  if (!actor.tenantId) throw new Error('Tenant no resuelto')

  const current = await prisma.user.findFirst({
    where: { id: input.userId, tenantId: actor.tenantId },
  })
  if (!current) throw new Error('Usuario no encontrado')
  if (current.id === actor.id) {
    throw new Error('No puedes eliminar tu propia cuenta')
  }

  await prisma.user.update({
    where: { id: current.id },
    data: { deletedAt: new Date(), status: 'DISABLED' },
  })

  await logAudit({
    tenantId: actor.tenantId,
    actorId: actor.id,
    action: 'DELETE',
    entity: 'User',
    entityId: current.id,
    diff: {
      before: { email: current.email, status: current.status },
      after: null,
    },
  })

  revalidatePath('/empresa/configuracion/usuarios')
}
