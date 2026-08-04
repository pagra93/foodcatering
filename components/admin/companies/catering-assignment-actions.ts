'use server'

/**
 * Server actions para asignar/quitar caterings a una empresa desde el admin.
 * Gate por permiso `empresa:assign-catering`. Enforcement del límite
 * `maxCompanies` del plan del catering (cierra la deuda de HU-043). Audita.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getRequiredSession } from '@/lib/auth/session'
import { permissionsInclude } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/auth/audit'
import { getCateringPlanUsage, withinLimitOf } from '@/lib/plans/entitlements'

type ActionResult = { ok?: boolean; error?: string }

const assignSchema = z.object({
  companyId: z.string().min(1),
  tenantCatering: z.string().min(1),
  type: z.enum(['PRIMARY', 'BACKUP']).default('PRIMARY'),
  priority: z.coerce.number().int().min(1).max(99).default(1),
})

const deactivateSchema = z.object({
  assignmentId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
})

/** Asigna (o reactiva) un catering a una empresa, respetando el límite del plan. */
export async function assignCateringAction(input: unknown): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'empresa:assign-catering')) {
    return { error: 'No tienes permiso para asignar caterings.' }
  }

  const parsed = assignSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const company = await prisma.company.findUnique({
    where: { id: d.companyId },
    select: { id: true, tenantId: true },
  })
  if (!company) return { error: 'La empresa no existe.' }

  const catering = await prisma.tenant.findFirst({
    where: { id: d.tenantCatering, type: 'CATERING', deletedAt: null },
    select: { id: true },
  })
  if (!catering) return { error: 'El catering no existe o no está disponible.' }

  const existing = await prisma.companyCateringAssignment.findUnique({
    where: {
      companyId_tenantCatering: {
        companyId: d.companyId,
        tenantCatering: d.tenantCatering,
      },
    },
  })
  if (existing?.active) {
    return { error: 'Este catering ya está asignado a la empresa.' }
  }

  // Enforcement del límite de empresas del PLAN del catering (maxCompanies).
  // Reactivar o crear cuentan como +1 sobre el uso actual.
  const { entitlements, usage } = await getCateringPlanUsage(d.tenantCatering)
  if (!withinLimitOf(entitlements.maxCompanies, usage.companies)) {
    return {
      error: `El plan del catering (${entitlements.planName ?? 'sin plan'}) admite ${entitlements.maxCompanies} empresa(s) y ya las sirve. Sube su plan para asignarle más.`,
    }
  }

  // Solo puede haber UN catering PRINCIPAL activo por empresa (además lo
  // garantiza el índice único parcial en BD): validar aquí da un mensaje
  // claro en vez de un error de constraint. El pedido del empleado elige el
  // PRIMARY, así que dos activos repartirían pedidos de forma no determinista.
  if (d.type === 'PRIMARY') {
    const currentPrimary = await prisma.companyCateringAssignment.findFirst({
      where: {
        tenantEmpresa: company.tenantId,
        companyId: d.companyId,
        active: true,
        type: 'PRIMARY',
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      select: { id: true },
    })
    if (currentPrimary) {
      return {
        error:
          'La empresa ya tiene un catering principal activo. Desactívalo antes o asigna este como BACKUP.',
      }
    }
  }

  try {
    if (existing) {
      await prisma.companyCateringAssignment.update({
        where: { id: existing.id },
        data: {
          active: true,
          type: d.type,
          priority: d.priority,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          deactivatedAt: null,
          deactivatedBy: null,
          deactivationReason: null,
        },
      })
    } else {
      await prisma.companyCateringAssignment.create({
        data: {
          companyId: d.companyId,
          tenantEmpresa: company.tenantId,
          tenantCatering: d.tenantCatering,
          type: d.type,
          priority: d.priority,
          assignedBy: session.user.id,
        },
      })
    }
  } catch (e) {
    // Carrera con otra asignación PRIMARY simultánea: el índice único parcial
    // la corta; se traduce a mensaje de dominio.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return {
        error:
          'La empresa ya tiene un catering principal activo (asignación simultánea). Recarga y reintenta.',
      }
    }
    throw e
  }

  await logAudit({
    tenantId: company.tenantId,
    actorId: session.user.id,
    action: existing ? 'UPDATE' : 'CREATE',
    entity: 'CompanyCateringAssignment',
    entityId: `${d.companyId}:${d.tenantCatering}`,
    diff: { type: d.type, priority: d.priority, reactivated: Boolean(existing) },
  })

  // La ruta /admin/empresas/[id] usa el tenantId de la empresa, no el Company.id.
  revalidatePath(`/admin/empresas/${company.tenantId}`)
  return { ok: true }
}

/** Desactiva una asignación (soft): deja de servir, conserva el histórico. */
export async function deactivateCateringAssignmentAction(
  input: unknown
): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!permissionsInclude(session.user.permissions, 'empresa:assign-catering')) {
    return { error: 'No tienes permiso para modificar asignaciones.' }
  }

  const parsed = deactivateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const assignment = await prisma.companyCateringAssignment.findUnique({
    where: { id: d.assignmentId },
    select: { id: true, tenantEmpresa: true, active: true },
  })
  if (!assignment) return { error: 'La asignación no existe.' }
  if (!assignment.active) return { error: 'La asignación ya estaba desactivada.' }

  await prisma.companyCateringAssignment.update({
    where: { id: assignment.id },
    data: {
      active: false,
      deactivatedAt: new Date(),
      deactivatedBy: session.user.id,
      deactivationReason: d.reason || null,
    },
  })

  await logAudit({
    tenantId: assignment.tenantEmpresa,
    actorId: session.user.id,
    action: 'UPDATE',
    entity: 'CompanyCateringAssignment',
    entityId: assignment.id,
    diff: { active: false, reason: d.reason ?? null },
  })

  // La ruta /admin/empresas/[id] usa el tenantId de la empresa (tenantEmpresa).
  revalidatePath(`/admin/empresas/${assignment.tenantEmpresa}`)
  return { ok: true }
}
