import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/auth/get-tenant'
import { prisma } from '@/lib/db/prisma'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EmployeeFormComplete } from '@/components/shared/EmployeeFormComplete'

// ============================================================================
// Página de Nuevo Empleado
// ============================================================================

export default async function NuevoEmpleadoPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const tenant = await getTenant()
  if (!tenant || tenant.type !== 'EMPRESA') {
    redirect('/unauthorized')
  }

  // Obtener sedes de la empresa
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

  if (sites.length === 0) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/empresa/empleados">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Empleados
            </Link>
          </Button>
        </div>

        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay sedes configuradas
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Antes de añadir empleados, debes configurar al menos una sede
            </p>
            <Button asChild>
              <Link href="/empresa/configuracion">
                Ir a Configuración
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
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
        <h1 className="text-2xl font-bold">Nuevo Empleado</h1>
        <p className="text-sm text-gray-500 mt-1">
          Completa todos los datos del empleado. Se enviará un email de invitación automáticamente.
        </p>
      </div>

      <EmployeeFormComplete
        mode="create"
        sites={sites}
        redirectPath="/empresa/empleados"
      />
    </div>
  )
}
