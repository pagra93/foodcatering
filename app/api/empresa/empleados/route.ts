import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth/session'
import { createEmployee } from '@/lib/db/queries/empresa-empleados'
import { z } from 'zod'

const createEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  employeeNumber: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  siteId: z.string().min(1),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  weeklyMenuDays: z.number().optional(),
  monthlyLimit: z.number().optional(),
  notes: z.string().optional(),
  sendInvitation: z.boolean().default(true),
})

/**
 * POST /api/empresa/empleados
 * Crear un nuevo empleado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const tenantId = request.headers.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 })
    }

    // Verificar permisos
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH']
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const validated = createEmployeeSchema.parse(body)

    const employee = await createEmployee(tenantId, validated)

    return NextResponse.json(employee, { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear empleado' },
      { status: 500 }
    )
  }
}

