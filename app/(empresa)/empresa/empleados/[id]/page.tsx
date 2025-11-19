import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Mail } from 'lucide-react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getEmployeeById } from '@/lib/db/queries/empresa-empleados'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmployeeOverview } from '@/components/empresa/empleados/EmployeeOverview'
import { EmployeeOrders} from '@/components/empresa/empleados/EmployeeOrders'
import { EmployeeIncidents } from '@/components/empresa/empleados/EmployeeIncidents'

/**
 * Página de detalle de empleado
 * FASE 2 - Ver información completa, pedidos, incidencias
 */

async function EmployeeDetailData({ id }: { id: string }) {
  const tenant = await getCurrentTenant()
  const employee = await getEmployeeById(id, tenant.id)

  if (!employee) {
    notFound()
  }

  const statusMap = {
    ACTIVE: { label: 'Activo', variant: 'success' as const },
    SUSPENDED: { label: 'Suspendido', variant: 'warning' as const },
    DISABLED: { label: 'Deshabilitado', variant: 'destructive' as const },
  }

  const statusInfo = statusMap[employee.status as keyof typeof statusMap]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/empresa/empleados">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{employee.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              {employee.employeeNumber && (
                <Badge variant="outline">#{employee.employeeNumber}</Badge>
              )}
              {employee.department && (
                <Badge variant="outline">{employee.department}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Reenviar invitación
          </Button>
          <Button size="sm" asChild>
            <Link href={`/empresa/empleados/${id}/editar`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pedidos">
            Pedidos ({employee.recentOrders.length})
          </TabsTrigger>
          <TabsTrigger value="incidencias">
            Incidencias ({employee.incidents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <EmployeeOverview employee={employee} />
        </TabsContent>

        <TabsContent value="pedidos">
          <EmployeeOrders orders={employee.recentOrders} />
        </TabsContent>

        <TabsContent value="incidencias">
          <EmployeeIncidents incidents={employee.incidents} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <EmployeeDetailData id={params.id} />
      </Suspense>
    </div>
  )
}

