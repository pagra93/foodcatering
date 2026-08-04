import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/auth/audit'
import { prisma } from '@/lib/db/prisma'
import { encryptPII } from '@/lib/crypto/pii'
import { permittedAction } from '@/lib/auth/permissions'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

// Schema de validación para actualización de empleado
const updateEmployeeSchema = z.object({
  department: z.string().optional(),
  siteId: z.string().optional(),
  dietPrefs: z
    .object({
      allergies: z.array(z.string()).optional(),
      restrictions: z.array(z.string()).optional(),
      preferences: z.array(z.string()).optional(),
      calorieTarget: z.number().optional(),
    })
    .optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
})

/**
 * PUT /api/empresa/empleados/[id]
 * Actualizar empleado
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar rol
    const allowedRoles = ['RRHH', 'ADMIN_EMPRESA', 'ROOT']
    if (!permittedAction(session.user.permissions, session.user.role, 'employee:edit', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    const body = await req.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }
    const data = updateEmployeeSchema.parse(body)

    // Verificar que el empleado existe y pertenece al tenant
    const employee = await prisma.employee.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        deletedAt: null,
      },
    })

    if (!employee) {
      return apiError(404, 'Empleado no encontrado')
    }

    // La sede destino debe pertenecer al mismo tenant (evita apuntar a una sede
    // de otra empresa por su UUID).
    if (data.siteId) {
      const site = await prisma.companySite.findFirst({
        where: { id: data.siteId, tenantId: session.user.tenantId },
        select: { id: true },
      })
      if (!site) {
        return apiError(400, 'Sede no válida')
      }
    }

    // Actualizar empleado
    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: data as Prisma.EmployeeUncheckedUpdateInput,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nameEnc: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Best-effort tras el éxito. Diff sin PII (nada de nombre/email/teléfono).
    await logAudit({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: params.id,
      diff: {
        after: {
          department: updated.department,
          siteId: updated.siteId,
          status: updated.status,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'PUT /api/empresa/empleados/[id]',
      requestId: requestIdFrom(req),
      fallback: 'Error al actualizar el empleado',
    })
  }
}

// Schema para edición completa
const updateFullEmployeeSchema = z.object({
  // Datos usuario (solo nombre y teléfono editables, email NO)
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  
  // Datos laborales
  employeeNumber: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  siteId: z.string().optional(),
  startDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  endDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  
  // Configuración menú
  weeklyMenuDays: z.coerce.number().int().min(0).max(7).optional().nullable(),
  monthlyLimit: z.coerce.number().positive().optional().nullable(),
  dietPrefs: z.object({
    allergies: z.array(z.string()).optional(),
    restrictions: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
  }).optional(),
  notes: z.string().optional().nullable(),
  
  // Estado (para suspender/activar)
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
})

/**
 * PATCH /api/empresa/empleados/[id]
 * Actualizar empleado completo o cambiar estado
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    // Verificar rol
    const allowedRoles = ['RRHH', 'ADMIN_EMPRESA', 'ROOT']
    if (!permittedAction(session.user.permissions, session.user.role, 'employee:edit', allowedRoles)) {
      return apiError(403, 'Sin permisos')
    }

    const body = await req.json().catch(() => null)
    if (body === null) {
      return apiError(400, 'Cuerpo JSON inválido')
    }

    // Verificar que el empleado existe y pertenece al tenant
    const employee = await prisma.employee.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
    })

    if (!employee) {
      return apiError(404, 'Empleado no encontrado')
    }

    const validated = updateFullEmployeeSchema.parse(body)

    // La sede destino debe pertenecer al mismo tenant (evita apuntar a una sede
    // de otra empresa por su UUID).
    if (validated.siteId) {
      const site = await prisma.companySite.findFirst({
        where: { id: validated.siteId, tenantId: session.user.tenantId },
        select: { id: true },
      })
      if (!site) {
        return apiError(400, 'Sede no válida')
      }
    }

    // Actualizar en transacción
    const updated = await prisma.$transaction(async (tx) => {
      // Actualizar usuario si hay cambios
      if (validated.name || validated.phone) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            ...(validated.name && { nameEnc: encryptPII(validated.name) }),
            ...(validated.phone && { phoneEnc: encryptPII(validated.phone) }),
          },
        })
      }

      // Actualizar empleado
      return tx.employee.update({
        where: { id: params.id },
        data: {
          ...(validated.employeeNumber !== undefined && { employeeNumber: validated.employeeNumber || null }),
          ...(validated.department !== undefined && { department: validated.department || null }),
          ...(validated.position !== undefined && { position: validated.position || null }),
          ...(validated.siteId && { siteId: validated.siteId }),
          ...(validated.startDate !== undefined && { startDate: validated.startDate }),
          ...(validated.endDate !== undefined && { endDate: validated.endDate }),
          ...(validated.weeklyMenuDays !== undefined && { weeklyMenuDays: validated.weeklyMenuDays }),
          ...(validated.monthlyLimit !== undefined && { monthlyLimit: validated.monthlyLimit }),
          ...(validated.dietPrefs !== undefined && { dietPrefs: validated.dietPrefs || {} }),
          ...(validated.notes !== undefined && { notes: validated.notes || null }),
          ...(validated.status && { status: validated.status }),
        } as Prisma.EmployeeUncheckedUpdateInput,
        include: {
          user: {
            select: {
              email: true,
              nameEnc: true,
              phoneEnc: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    // Best-effort tras el éxito. Diff sin PII (nada de nombre/email/teléfono).
    await logAudit({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: params.id,
      diff: {
        after: {
          department: updated.department,
          siteId: updated.siteId,
          status: updated.status,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'PATCH /api/empresa/empleados/[id]',
      requestId: requestIdFrom(req),
      fallback: 'Error al actualizar el empleado',
    })
  }
}

