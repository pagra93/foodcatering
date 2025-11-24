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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol
    const allowedRoles = ['RRHH', 'ADMIN_EMPRESA', 'ROOT']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    
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
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    const validated = updateFullEmployeeSchema.parse(body)

    // Actualizar en transacción
    const updated = await prisma.$transaction(async (tx) => {
      // Actualizar usuario si hay cambios
      if (validated.name || validated.phone) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            ...(validated.name && { nameEnc: validated.name }),
            ...(validated.phone && { phoneEnc: validated.phone }),
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
        },
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

