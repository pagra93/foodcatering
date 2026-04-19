import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/auth/get-tenant'
import { prisma } from '@/lib/db/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EmployeeFormComplete } from '@/components/shared/EmployeeFormComplete'

type Props = {
  params: {
    id: string
  }
}

export default async function EditarEmpleadoPage({ params }: Props) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const tenant = await getTenant()
  if (!tenant || tenant.type !== 'EMPRESA') {
    redirect('/unauthorized')
  }

  // Obtener empleado
  const employee = await prisma.employee.findFirst({
    where: {
      id: params.id,
      tenantId: tenant.id,
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

  if (!employee) {
    notFound()
  }

  // Obtener todas las sedes
  const sites = await prisma.companySite.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Preparar datos iniciales
  const initialData = {
    id: employee.id,
    email: employee.user.email,
    name: employee.user.nameEnc,
    phone: employee.user.phoneEnc || '',
    employeeNumber: employee.employeeNumber || '',
    department: employee.department || '',
    position: employee.position || '',
    siteId: employee.siteId,
    startDate: employee.startDate ? employee.startDate.toISOString().split('T')[0] : '',
    endDate: employee.endDate ? employee.endDate.toISOString().split('T')[0] : '',
    weeklyMenuDays: employee.weeklyMenuDays || 4,
    monthlyLimit: employee.monthlyLimit ? Number(employee.monthlyLimit) : undefined,
    notes: employee.notes || '',
    sendInvitation: false, // No enviar al editar
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/empresa/empleados">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Empleados
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Editar Empleado</h1>
        <p className="text-sm text-gray-500 mt-1">
          Actualiza los datos de {employee.user.nameEnc}
        </p>
      </div>

      <EmployeeFormComplete
        mode="edit"
        sites={sites}
        initialData={initialData}
        redirectPath={`/empresa/empleados/${employee.id}`}
      />
    </div>
  )
}
