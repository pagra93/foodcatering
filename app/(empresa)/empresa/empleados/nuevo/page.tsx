import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { Button } from '@/components/ui/button'
import { NewEmployeeForm } from '@/components/empresa/empleados/NewEmployeeForm'
import { prisma } from '@/lib/db/prisma'

/**
 * Página para dar de alta un nuevo empleado
 * FASE 2 - Formulario de creación
 */
export default async function NewEmployeePage() {
  const tenant = await getCurrentTenant()

  // Obtener sedes activas para el selector
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
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/empresa/empleados">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Empleado</h1>
          <p className="mt-1 text-sm text-gray-500">
            Completa la información del nuevo empleado
          </p>
        </div>
      </div>

      {/* Formulario */}
      <NewEmployeeForm sites={sites} />
    </div>
  )
}

