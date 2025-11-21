import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol
    const allowedRoles = ['RRHH', 'ADMIN_EMPRESA', 'ROOT']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
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
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar empleado
    const updated = await prisma.employee.update({
      where: { id: params.id },
      data,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[EMPLOYEE_UPDATE]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al actualizar empleado' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/empresa/empleados/[id]
 * Suspender/Activar empleado (cambio rápido de estado)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol
    const allowedRoles = ['RRHH', 'ADMIN_EMPRESA', 'ROOT']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body // 'suspend' | 'activate'

    // Verificar que el empleado existe y pertenece al tenant
    const employee = await prisma.employee.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        deletedAt: null,
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar estado
    const newStatus = action === 'suspend' ? 'SUSPENDED' : 'ACTIVE'
    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: { status: newStatus },
      include: {
        user: {
          select: {
            nameEnc: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      employee: updated,
      message: `Empleado ${action === 'suspend' ? 'suspendido' : 'activado'} correctamente`,
    })
  } catch (error) {
    console.error('[EMPLOYEE_STATUS_CHANGE]', error)
    return NextResponse.json(
      { error: 'Error al cambiar estado del empleado' },
      { status: 500 }
    )
  }
}

