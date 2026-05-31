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

import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { hash as bcryptHash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'

// Server Actions no tienen acceso directo a Request; los audit logs se
// generan sin IP/userAgent (los completan los endpoints API cuando los hay).
const AUDIT_HEADERS: { ip?: string; userAgent?: string } = {}
import { rolesByTenantType } from '@/lib/auth/permissions'

function requireActor(session: Session | null) {
  if (!session?.user) throw new Error('Sesión requerida')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Acción reservada al super admin')
  }
  return session.user
}

const createUserSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  role: z.enum([
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
  ]),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
})

export async function createUserAction(input: z.infer<typeof createUserSchema>) {
  const session = (await auth()) as Session | null
  const actor = requireActor(session)

  const data = createUserSchema.parse(input)

  // Validar que el rol sea compatible con el tipo de tenant.
  const tenant = await prisma.tenant.findUnique({
    where: { id: data.tenantId },
    select: { id: true, type: true, name: true },
  })
  if (!tenant) throw new Error('Tenant no encontrado')

  const allowed = rolesByTenantType(tenant.type)
  if (!allowed.includes(data.role)) {
    throw new Error(
      `El rol ${data.role} no es válido en un tenant de tipo ${tenant.type}. Permitidos: ${allowed.join(', ')}`
    )
  }

  // Email único por tenant.
  const existing = await prisma.user.findFirst({
    where: { tenantId: data.tenantId, email: data.email },
  })
  if (existing) {
    throw new Error('Ya existe un usuario con ese email en este tenant')
  }

  const passwordHash = await bcryptHash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      tenantId: data.tenantId,
      email: data.email,
      nameEnc: data.name, // cifrado en futuro (lib/crypto/pii.ts)
      phoneEnc: data.phone || null,
      role: data.role,
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

  revalidatePath('/admin/users')
  return { id: user.id, email: user.email, role: user.role }
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
})

export async function updateUserAction(input: z.infer<typeof updateUserSchema>) {
  const session = (await auth()) as Session | null
  const actor = requireActor(session)

  const data = updateUserSchema.parse(input)

  const current = await prisma.user.findUnique({
    where: { id: data.userId },
    include: { tenant: { select: { type: true } } },
  })
  if (!current) throw new Error('Usuario no encontrado')

  if (data.role) {
    const allowed = rolesByTenantType(current.tenant.type)
    if (!allowed.includes(data.role)) {
      throw new Error(
        `El rol ${data.role} no es válido en este tenant (tipo ${current.tenant.type})`
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id: data.userId },
    data: {
      ...(data.email && { email: data.email }),
      ...(data.name && { nameEnc: data.name }),
      ...(data.phone !== undefined && { phoneEnc: data.phone || null }),
      ...(data.role && { role: data.role }),
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
}

export async function setUserStatusAction(input: {
  userId: string
  status: 'ACTIVE' | 'DISABLED' | 'PENDING'
}) {
  const session = (await auth()) as Session | null
  const actor = requireActor(session)

  const current = await prisma.user.findUnique({
    where: { id: input.userId },
  })
  if (!current) throw new Error('Usuario no encontrado')

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
}

export async function deleteUserAction(input: { userId: string }) {
  const session = (await auth()) as Session | null
  const actor = requireActor(session)

  const current = await prisma.user.findUnique({
    where: { id: input.userId },
  })
  if (!current) throw new Error('Usuario no encontrado')

  if (current.id === actor.id) {
    throw new Error('No puedes eliminar tu propia cuenta desde aquí')
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
}

export async function resetPasswordAction(input: { userId: string }) {
  const session = (await auth()) as Session | null
  const actor = requireActor(session)

  const current = await prisma.user.findUnique({
    where: { id: input.userId },
  })
  if (!current) throw new Error('Usuario no encontrado')

  // Password temporal de 16 caracteres aleatorios (letras + números).
  const temp = randomBytes(12).toString('base64url').slice(0, 16)
  const passwordHash = await bcryptHash(temp, 10)

  await prisma.user.update({
    where: { id: input.userId },
    data: { passwordHash },
  })

  const headers = AUDIT_HEADERS
  await logAudit({
    tenantId: current.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'User',
    entityId: current.id,
    diff: {
      before: null,
      after: { password: 'reset' },
    },
    ...headers,
  })

  // TODO: enviar email al user con password temporal. Por ahora la
  // devolvemos al frontend para que el super admin la copie manualmente.
  return { temporaryPassword: temp }
}
