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
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import { getCateringPlanUsage, withinLimitOf } from '@/lib/plans/entitlements'

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
export async function assignCateringAction(input: unknown): Promise<ActionResult<null>> {
  return withAction(async () => {
    const session = await getRequiredSession()
    if (!permissionsInclude(session.user.permissions, 'empresa:assign-catering')) {
      throw new DomainError('No tienes permiso para asignar caterings.', 403)
    }

    const d = assignSchema.parse(input)

    const company = await prisma.company.findUnique({
      where: { id: d.companyId },
      select: { id: true, tenantId: true },
    })
    if (!company) throw new DomainError('La empresa no existe.', 404)

    const catering = await prisma.tenant.findFirst({
      where: { id: d.tenantCatering, type: 'CATERING', deletedAt: null },
      select: { id: true },
    })
    if (!catering) {
      throw new DomainError('El catering no existe o no está disponible.', 404)
    }

    const existing = await prisma.companyCateringAssignment.findUnique({
      where: {
        companyId_tenantCatering: {
          companyId: d.companyId,
          tenantCatering: d.tenantCatering,
        },
      },
    })
    if (existing?.active) {
      throw new DomainError('Este catering ya está asignado a la empresa.', 409)
    }

    // Enforcement del límite de empresas del PLAN del catering (maxCompanies).
    // Reactivar o crear cuentan como +1 sobre el uso actual.
    const { entitlements, usage } = await getCateringPlanUsage(d.tenantCatering)
    if (!withinLimitOf(entitlements.maxCompanies, usage.companies)) {
      throw new DomainError(
        `El plan del catering (${entitlements.planName ?? 'sin plan'}) admite ${entitlements.maxCompanies} empresa(s) y ya las sirve. Sube su plan para asignarle más.`,
        409
      )
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
        throw new DomainError(
          'La empresa ya tiene un catering principal activo. Desactívalo antes o asigna este como BACKUP.',
          409
        )
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
        throw new DomainError(
          'La empresa ya tiene un catering principal activo (asignación simultánea). Recarga y reintenta.',
          409
        )
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
    return null
  })
}

/** Desactiva una asignación (soft): deja de servir, conserva el histórico. */
export async function deactivateCateringAssignmentAction(
  input: unknown
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const session = await getRequiredSession()
    if (!permissionsInclude(session.user.permissions, 'empresa:assign-catering')) {
      throw new DomainError('No tienes permiso para modificar asignaciones.', 403)
    }

    const d = deactivateSchema.parse(input)

    const assignment = await prisma.companyCateringAssignment.findUnique({
      where: { id: d.assignmentId },
      select: { id: true, tenantEmpresa: true, active: true },
    })
    if (!assignment) throw new DomainError('La asignación no existe.', 404)
    if (!assignment.active) {
      throw new DomainError('La asignación ya estaba desactivada.', 409)
    }

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
    return null
  })
}
