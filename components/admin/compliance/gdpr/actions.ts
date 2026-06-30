'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import type { GdprRequestType } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { permittedAction } from '@/lib/auth/permissions'
import {
  createGdprRequestSchema,
  rejectGdprRequestSchema,
  resolveGdprRequestSchema,
  GDPR_RESPONSE_DAYS,
  type CreateGdprRequestInput,
} from '@/lib/validations/compliance'
import { buildUserDataDump } from '@/lib/db/queries/admin-gdpr'

async function requireSuperAdmin(permission: string) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  if (!permittedAction(session.user.permissions, session.user.role, permission, ['SUPER_ADMIN'])) {
    throw new Error('No tienes permiso para esta acción')
  }
  return session.user
}

/**
 * Crea una solicitud RGPD. Valida permisos según contexto:
 * - Empleado puede crear sobre sí mismo (gdpr:create:own).
 * - RRHH / ADMIN_EMPRESA sobre empleados de su tenant (gdpr:create).
 * - SUPER_ADMIN sobre cualquiera.
 */
export async function createGdprRequestAction(input: CreateGdprRequestInput) {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new Error('Sesión requerida')
  const actor = session.user
  const data = createGdprRequestSchema.parse(input)

  const target = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, tenantId: true },
  })
  if (!target) throw new Error('Usuario no encontrado')

  const isSelf = actor.id === data.userId
  const isSameTenant = actor.tenantId === target.tenantId
  const isPrivileged =
    actor.role === 'SUPER_ADMIN' ||
    actor.role === 'ADMIN_EMPRESA' ||
    actor.role === 'RRHH'

  if (!isSelf && !(isPrivileged && isSameTenant)) {
    throw new Error(
      'No tienes permisos para crear esta solicitud en nombre del usuario'
    )
  }

  const dueBy = new Date()
  dueBy.setDate(dueBy.getDate() + GDPR_RESPONSE_DAYS)

  const request = await prisma.gdprRequest.create({
    data: {
      tenantId: target.tenantId,
      userId: target.id,
      requestedBy: actor.id,
      type: data.type as GdprRequestType,
      notes: data.notes,
      dueBy,
    },
  })

  await logAudit({
    tenantId: target.tenantId,
    actorId: actor.id,
    action: 'CREATE',
    entity: 'GdprRequest',
    entityId: request.id,
    diff: {
      before: null,
      after: {
        type: data.type,
        userId: target.id,
        isSelf,
      },
    },
  })

  revalidatePath('/admin/compliance/gdpr')
  revalidatePath('/empleado/perfil')
  revalidatePath(`/empresa/empleados/${target.id}`)
  return { id: request.id }
}

/**
 * Resuelve una solicitud. Para ACCESS/PORTABILITY genera dump JSON con
 * datos del usuario y lo devuelve serializado (el frontend lo descarga).
 * Para ERASURE requiere confirmación explícita con la palabra "ANONIMIZAR".
 */
export async function resolveGdprRequestAction(input: {
  requestId: string
  confirmation?: string
}) {
  const actor = await requireSuperAdmin('gdpr:process')
  const data = resolveGdprRequestSchema.parse(input)

  const request = await prisma.gdprRequest.findUnique({
    where: { id: data.requestId },
  })
  if (!request) throw new Error('Solicitud no encontrada')
  if (request.status === 'RESOLVED' || request.status === 'REJECTED') {
    throw new Error(`La solicitud ya está ${request.status}`)
  }

  // Para ERASURE: exigir escritura de "ANONIMIZAR"
  if (request.type === 'ERASURE' && data.confirmation !== 'ANONIMIZAR') {
    throw new Error(
      'Para anonimizar debes escribir exactamente "ANONIMIZAR" en el campo de confirmación'
    )
  }

  let deliveryUrl: string | null = null
  let orderCount = 0

  if (request.type === 'ACCESS' || request.type === 'PORTABILITY') {
    const dump = await buildUserDataDump(request.userId)
    if (!dump) throw new Error('No se pudo generar el dump')
    // Serializamos el JSON directamente; el frontend ofrece descarga.
    // Usamos un data URL como "deliveryUrl" para MVP sin bucket externo.
    const json = JSON.stringify(dump, null, 2)
    const base64 = Buffer.from(json).toString('base64')
    deliveryUrl = `data:application/json;base64,${base64}`
    orderCount = dump.orders.length
  }

  if (request.type === 'ERASURE') {
    // Anonimización: sustituimos PII del usuario por hashes.
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
    })
    if (!user) throw new Error('Usuario no existe')

    const hash = (v: string) =>
      createHash('sha256').update(v).digest('hex').slice(0, 16)

    const anonEmail = `anon-${hash(user.email)}@anonimizado.plati.es`
    const anonName = 'Empleado anonimizado'

    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data: {
          email: anonEmail,
          nameEnc: anonName,
          phoneEnc: null,
          status: 'DISABLED',
          deletedAt: new Date(),
          passwordHash: null,
        },
      }),
      // Los pedidos permanecen (obligación fiscal 5 años) pero se marcan
      // vía `notes` que el usuario está anonimizado.
      prisma.employee.updateMany({
        where: { userId: request.userId },
        data: {
          notes: '[ANONIMIZADO RGPD]',
          deletedAt: new Date(),
        },
      }),
    ])

    // Contamos pedidos conservados para evidencia.
    const employee = await prisma.employee.findFirst({
      where: { userId: request.userId },
    })
    if (employee) {
      orderCount = await prisma.order.count({
        where: { employeeId: employee.id },
      })
    }
  }

  const updated = await prisma.gdprRequest.update({
    where: { id: request.id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: actor.id,
      deliveryUrl,
      notes: request.notes
        ? `${request.notes}\n\n[Resuelto] ${request.type} — ${orderCount} pedidos afectados`
        : `[Resuelto] ${request.type} — ${orderCount} pedidos afectados`,
    },
  })

  await logAudit({
    tenantId: request.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'GdprRequest',
    entityId: updated.id,
    diff: {
      before: { status: request.status },
      after: {
        status: 'RESOLVED',
        type: request.type,
        orderCount,
      },
    },
  })

  revalidatePath('/admin/compliance/gdpr')
  return { id: updated.id, deliveryUrl }
}

export async function rejectGdprRequestAction(input: {
  requestId: string
  reason: string
}) {
  const actor = await requireSuperAdmin('gdpr:process')
  const data = rejectGdprRequestSchema.parse(input)

  const request = await prisma.gdprRequest.findUnique({
    where: { id: data.requestId },
  })
  if (!request) throw new Error('Solicitud no encontrada')
  if (request.status === 'RESOLVED' || request.status === 'REJECTED') {
    throw new Error(`La solicitud ya está ${request.status}`)
  }

  const updated = await prisma.gdprRequest.update({
    where: { id: request.id },
    data: {
      status: 'REJECTED',
      resolvedAt: new Date(),
      resolvedBy: actor.id,
      rejectionReason: data.reason,
    },
  })

  await logAudit({
    tenantId: request.tenantId,
    actorId: actor.id,
    action: 'UPDATE',
    entity: 'GdprRequest',
    entityId: updated.id,
    diff: {
      before: { status: request.status },
      after: { status: 'REJECTED', reason: data.reason },
    },
  })

  revalidatePath('/admin/compliance/gdpr')
  return { id: updated.id }
}
