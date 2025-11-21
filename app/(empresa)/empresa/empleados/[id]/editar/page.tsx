import { notFound, redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EmployeeEditForm } from '@/components/empresa/empleados/EmployeeEditForm'

/**
 * Página de Edición de Empleado
 */

async function getEmployee(employeeId: string, tenantId: string) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      tenantId,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          nameEnc: true,
          status: true,
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

  return employee
}

export default async function EditarEmpleadoPage({
  params,
}: {
  params: { id: string }
}) {
  const tenant = await getCurrentTenant()
  const employee = await getEmployee(params.id, tenant.id)

  if (!employee) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/empresa/empleados/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Editar Empleado
            </h1>
            <p className="text-sm text-gray-500">{employee.user.nameEnc}</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeEditForm employee={employee} />
        </CardContent>
      </Card>
    </div>
  )
}

