'use server'

/**
 * Server Actions para /catering/configuracion/usuarios.
 *
 * Gestión de usuarios con los 5 roles CATERING dentro del propio tenant.
 * Sólo ADMIN_CATERING (o SUPER_ADMIN impersonando) puede gestionar.
 */

import { z } from 'zod'
import { hash as bcryptHash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import type { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import { CATERING_ROLES } from '@/lib/db/queries/catering-usuarios'
import { encryptPII, decryptNameSafe } from '@/lib/crypto/pii'
import { BCRYPT_COST } from '@/lib/auth/password'
import { createPasswordResetToken, TOKEN_TTL_MINUTES } from '@/lib/auth/password-reset'
import { sendEmail, getAppBaseUrl } from '@/lib/email/client'
import { passwordResetEmail, welcomeEmail } from '@/lib/email/templates'

const CONFIG_USER_ADMIN_ROLES = ['ADMIN_CATERING', 'SUPER_ADMIN'] as const

async function requireCateringAdmin() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  const actor = session.user
  if (actor.role !== 'ADMIN_CATERING' && actor.role !== 'SUPER_ADMIN') {
    throw new Error('Sólo ADMIN_CATERING puede gestionar usuarios')
  }
  return actor
}

const CATERING_ROLE_VALUES = [
  'ADMIN_CATERING',
  'CHEF',
  'COCINERO',
  'REPARTIDOR',
  'FINANZAS_CATERING',
] as const

const userInputSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  role: z.enum(CATERING_ROLE_VALUES),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
})

export async function createCateringUserAction(
  input: z.infer<typeof userInputSchema>
) {
  const actor = await requireCateringAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'cat-config-user:create', [
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
    where: { baseRole: data.role as UserRole, isSystem: true, category: 'CATERING' },
    select: { id: true },
  })
  if (!sysRole) throw new Error(`Rol de sistema no encontrado para ${data.role}`)

  const passwordHash = await bcryptHash(data.password, BCRYPT_COST)

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

  // Email de bienvenida (no bloquea el alta si el envío falla).
  const welcome = welcomeEmail({
    name: data.name,
    loginUrl: `${getAppBaseUrl()}/login`,
  })
  await sendEmail({
    to: user.email,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
    template: 'welcome',
  })

  revalidatePath('/catering/configuracion/usuarios')
  return { id: user.id }
}

const updateSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(CATERING_ROLE_VALUES).optional(),
})

export async function updateCateringUserAction(
  input: z.infer<typeof updateSchema>
) {
  const actor = await requireCateringAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'cat-config-user:edit', [
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

  if (!CATERING_ROLES.includes(current.role)) {
    throw new Error('Este usuario no pertenece al catering')
  }

  let roleIdUpdate: string | undefined
  if (data.role) {
    const sysRole = await prisma.role.findFirst({
      where: { baseRole: data.role as UserRole, isSystem: true, category: 'CATERING' },
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

  revalidatePath('/catering/configuracion/usuarios')
  return { id: updated.id }
}

export async function toggleCateringUserStatusAction(input: {
  userId: string
}) {
  const actor = await requireCateringAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'cat-config-user:delete', [
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
  if (current.id === actor.id)
    throw new Error('No puedes suspender tu propia cuenta')

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

  revalidatePath('/catering/configuracion/usuarios')
}

export async function resetCateringUserPasswordAction(input: {
  userId: string
}) {
  const actor = await requireCateringAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'cat-config-user:edit', [
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

  // L3: se envía un enlace de un solo uso en vez de una contraseña en claro.
  const raw = await createPasswordResetToken(current.id)
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(raw)}`
  const { subject, html, text } = passwordResetEmail({
    resetUrl,
    name: decryptNameSafe(current.nameEnc, ''),
    byAdmin: true,
    expiresMinutes: TOKEN_TTL_MINUTES,
  })
  const result = await sendEmail({ to: current.email, subject, html, text, template: 'password-reset' })

  await logAudit({
    tenantId: actor.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'User',
    entityId: current.id,
    diff: { before: null, after: { password: 'reset-link-sent' } },
  })

  return { emailed: result.ok, email: current.email }
}

export async function deleteCateringUserAction(input: { userId: string }) {
  const actor = await requireCateringAdmin()
  if (
    !permittedAction(actor.permissions, actor.role, 'cat-config-user:delete', [
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
  if (current.id === actor.id)
    throw new Error('No puedes eliminar tu propia cuenta')

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

  revalidatePath('/catering/configuracion/usuarios')
}
