'use server'

/**
 * Server Actions para /admin/users/*.
 *
 * Crean, editan y gestionan usuarios desde el portal súper admin.
 * Por norma: los usuarios ROOT (equipo Plati) se gestionan aquí;
 * para usuarios de empresa o catering, el super admin debe usar
 * impersonación y operar desde el portal del tenant correspondiente.
 * Aún así, las actions permiten actuar cross-tenant con el warning
 * adecuado en la UI.
 */

import { z } from 'zod'
import { hash as bcryptHash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { encryptPII, decryptNameSafe } from '@/lib/crypto/pii'
import { BCRYPT_COST } from '@/lib/auth/password'
import { createPasswordResetToken, TOKEN_TTL_MINUTES } from '@/lib/auth/password-reset'
import { sendEmail, getAppBaseUrl } from '@/lib/email/client'
import { passwordResetEmail, welcomeEmail } from '@/lib/email/templates'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'

// Server Actions no tienen acceso directo a Request; los audit logs se
// generan sin IP/userAgent (los completan los endpoints API cuando los hay).
const AUDIT_HEADERS: { ip?: string; userAgent?: string } = {}
import { permittedAction, rolesByTenantType } from '@/lib/auth/permissions'

function requireActor(session: Session | null, permission: string) {
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new DomainError('No tienes permiso para esta acción', 403)
  }
  return session.user
}

const createUserSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  // Asignación por rol del RBAC dinámico (sistema o custom).
  roleId: z.string().uuid(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
})

export async function createUserAction(
  input: z.infer<typeof createUserSchema>
): Promise<ActionResult<{ id: string; email: string; role: string }>> {
  return withAction(async () => {
    const session = (await auth()) as Session | null
    const actor = requireActor(session, 'user:create')

    const data = createUserSchema.parse(input)

    // Validar que el rol sea compatible con el tipo de tenant.
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { id: true, type: true, name: true },
    })
    if (!tenant) throw new DomainError('Tenant no encontrado', 404)

    // Resolver el rol del RBAC dinámico y validar su categoría contra el tenant.
    const dynRole = await prisma.role.findUnique({
      where: { id: data.roleId },
      select: { id: true, baseRole: true, category: true },
    })
    if (!dynRole) throw new DomainError('Rol no encontrado', 404)
    if (String(dynRole.category) !== String(tenant.type)) {
      throw new DomainError(
        `El rol elegido no es válido en un tenant de tipo ${tenant.type}.`,
        400
      )
    }
    if (!dynRole.baseRole) {
      throw new DomainError('El rol no tiene rol base configurado', 400)
    }

    // Email único por tenant.
    const existing = await prisma.user.findFirst({
      where: { tenantId: data.tenantId, email: data.email },
    })
    if (existing) {
      throw new DomainError('Ya existe un usuario con ese email en este tenant', 409)
    }

    const passwordHash = await bcryptHash(data.password, BCRYPT_COST)

    const user = await prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        nameEnc: encryptPII(data.name),
        phoneEnc: data.phone ? encryptPII(data.phone) : null,
        role: dynRole.baseRole,
        roleId: dynRole.id,
        passwordHash,
        status: 'ACTIVE',
      },
    })

    const headers = AUDIT_HEADERS
    await logAudit({
      tenantId: data.tenantId,
      actorId: actor.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      diff: {
        before: null,
        after: {
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
      },
      ...headers,
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

    revalidatePath('/admin/users')
    return { id: user.id, email: user.email, role: user.role }
  })
}

// ─── editar / suspender / reactivar / eliminar ─────────────────────────

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z
    .enum([
      'SUPER_ADMIN',
      'AUDITOR',
      'ADMIN_EMPRESA',
      'RRHH',
      'FINANZAS',
      'MANAGER_SEDE',
      'EMPLEADO',
      'ADMIN_CATERING',
      'CHEF',
      'COCINERO',
      'REPARTIDOR',
      'FINANZAS_CATERING',
    ])
    .optional(),
  // Asignación por rol del RBAC dinámico (sistema o custom).
  roleId: z.string().uuid().optional(),
})

export async function updateUserAction(
  input: z.infer<typeof updateUserSchema>
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const session = (await auth()) as Session | null
    const actor = requireActor(session, 'user:edit')

    const data = updateUserSchema.parse(input)

    const current = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { tenant: { select: { type: true } } },
    })
    if (!current) throw new DomainError('Usuario no encontrado', 404)

    // Resolver el rol a asignar: por roleId (RBAC dinámico) o por enum (legacy).
    let roleEnumToSet = data.role
    let roleIdToSet: string | undefined
    if (data.roleId) {
      const dynRole = await prisma.role.findUnique({
        where: { id: data.roleId },
        select: { id: true, baseRole: true, category: true },
      })
      if (!dynRole) throw new DomainError('Rol no encontrado', 404)
      if (String(dynRole.category) !== String(current.tenant.type)) {
        throw new DomainError('El rol no corresponde al tipo de tenant del usuario', 400)
      }
      if (!dynRole.baseRole) {
        throw new DomainError('El rol no tiene rol base configurado', 400)
      }
      roleEnumToSet = dynRole.baseRole
      roleIdToSet = dynRole.id
    } else if (data.role) {
      const allowed = rolesByTenantType(current.tenant.type)
      if (!allowed.includes(data.role)) {
        throw new DomainError(
          `El rol ${data.role} no es válido en este tenant (tipo ${current.tenant.type})`,
          400
        )
      }
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.name && { nameEnc: encryptPII(data.name) }),
        ...(data.phone !== undefined && {
          phoneEnc: data.phone ? encryptPII(data.phone) : null,
        }),
        ...(roleEnumToSet && { role: roleEnumToSet }),
        ...(roleIdToSet && { roleId: roleIdToSet }),
      },
    })

    const headers = AUDIT_HEADERS
    await logAudit({
      tenantId: current.tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: updated.id,
      diff: {
        before: {
          email: current.email,
          role: current.role,
        },
        after: {
          email: updated.email,
          role: updated.role,
        },
      },
      ...headers,
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${updated.id}`)
    return { id: updated.id }
  })
}

export async function setUserStatusAction(input: {
  userId: string
  status: 'ACTIVE' | 'DISABLED' | 'PENDING'
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const session = (await auth()) as Session | null
    const actor = requireActor(session, 'user:edit-status')

    const current = await prisma.user.findUnique({
      where: { id: input.userId },
    })
    if (!current) throw new DomainError('Usuario no encontrado', 404)

    await prisma.user.update({
      where: { id: input.userId },
      data: { status: input.status },
    })

    const headers = AUDIT_HEADERS
    await logAudit({
      tenantId: current.tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: current.id,
      diff: {
        before: { status: current.status },
        after: { status: input.status },
      },
      ...headers,
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${current.id}`)
    return null
  })
}

export async function deleteUserAction(input: {
  userId: string
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const session = (await auth()) as Session | null
    const actor = requireActor(session, 'user:delete')

    const current = await prisma.user.findUnique({
      where: { id: input.userId },
    })
    if (!current) throw new DomainError('Usuario no encontrado', 404)

    if (current.id === actor.id) {
      throw new DomainError('No puedes eliminar tu propia cuenta desde aquí', 400)
    }

    await prisma.user.update({
      where: { id: input.userId },
      data: { deletedAt: new Date(), status: 'DISABLED' },
    })

    const headers = AUDIT_HEADERS
    await logAudit({
      tenantId: current.tenantId,
      actorId: actor.id,
      action: 'DELETE',
      entity: 'User',
      entityId: current.id,
      diff: {
        before: { email: current.email, status: current.status },
        after: null,
      },
      ...headers,
    })

    revalidatePath('/admin/users')
    return null
  })
}

export async function resetPasswordAction(input: {
  userId: string
}): Promise<ActionResult<{ emailed: boolean; email: string }>> {
  return withAction(async () => {
    const session = (await auth()) as Session | null
    const actor = requireActor(session, 'user:reset-password')

    const current = await prisma.user.findUnique({
      where: { id: input.userId },
    })
    if (!current) throw new DomainError('Usuario no encontrado', 404)

    // L3: en vez de devolver una contraseña temporal en claro, se envía al usuario
    // un enlace de un solo uso para que fije su propia contraseña. No se cambia la
    // contraseña actual hasta que el usuario complete el flujo.
    const raw = await createPasswordResetToken(current.id)
    const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(raw)}`
    const { subject, html, text } = passwordResetEmail({
      resetUrl,
      name: decryptNameSafe(current.nameEnc, ''),
      byAdmin: true,
      expiresMinutes: TOKEN_TTL_MINUTES,
    })
    const result = await sendEmail({ to: current.email, subject, html, text, template: 'password-reset' })

    const headers = AUDIT_HEADERS
    await logAudit({
      tenantId: current.tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: current.id,
      diff: {
        before: null,
        after: { password: 'reset-link-sent' },
      },
      ...headers,
    })

    return { emailed: result.ok, email: current.email }
  })
}

/**
 * Reset de MFA (F2): desactiva el segundo factor de un usuario y borra su
 * secreto y códigos de recuperación. Recuperación de bloqueo cuando el usuario
 * pierde el móvil y sus códigos.
 */
export async function resetMfaAction(input: {
  userId: string
}): Promise<ActionResult<null>> {
  return withAction(async () => {
    const session = (await auth()) as Session | null
    const actor = requireActor(session, 'user:edit')

    const current = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, tenantId: true, mfaEnabled: true },
    })
    if (!current) throw new DomainError('Usuario no encontrado', 404)

    await prisma.user.update({
      where: { id: current.id },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
    })

    await logAudit({
      tenantId: current.tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: current.id,
      diff: { before: { mfaEnabled: current.mfaEnabled }, after: { mfaEnabled: false } },
      ...AUDIT_HEADERS,
    })

    revalidatePath(`/admin/users/${current.id}`)
    return null
  })
}
