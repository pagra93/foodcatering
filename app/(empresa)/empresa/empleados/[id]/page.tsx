import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/auth/get-tenant'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Mail } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ============================================================================
// Página de Detalle de Empleado
// ============================================================================

type Props = {
  params: {
    id: string
  }
}

export default async function EmpleadoDetallePage({ params }: Props) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const tenant = getTenant()
  if (tenant.type !== 'EMPRESA') {
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
          name: true,
          address: true,
          city: true,
        },
      },
    },
  })

  if (!employee) {
    notFound()
  }

  const statusMap: Record<string, { label: string; variant: any }> = {
    ACTIVE: { label: 'Activo', variant: 'default' },
    INACTIVE: { label: 'Inactivo', variant: 'secondary' },
    SUSPENDED: { label: 'Suspendido', variant: 'destructive' },
  }

  const statusInfo = statusMap[employee.status] || { label: employee.status, variant: 'outline' }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/empresa/empleados">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Empleados
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Mail className="mr-2 h-4 w-4" />
            Enviar Email
          </Button>
          <Button asChild>
            <Link href={`/empresa/empleados/${employee.id}/editar`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{employee.user.nameEnc}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{employee.user.email}</p>
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Número de Empleado</p>
              <p className="text-sm mt-1">{employee.employeeNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
              <p className="text-sm mt-1">{employee.user.phoneEnc || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Departamento</p>
              <p className="text-sm mt-1">{employee.department || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Puesto</p>
              <p className="text-sm mt-1">{employee.position || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de Alta</p>
              <p className="text-sm mt-1">
                {employee.startDate
                  ? format(new Date(employee.startDate), 'dd/MM/yyyy', { locale: es })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sede</p>
              <p className="text-sm mt-1">{employee.site.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* Preferencias Dietéticas */}
        <Card>
          <CardHeader>
            <CardTitle>Preferencias Dietéticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Días de Menú por Semana</p>
                <p className="text-sm mt-1">{employee.weeklyMenuDays || 4} días</p>
              </div>
              {employee.monthlyLimit && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Límite Mensual</p>
                  <p className="text-sm mt-1">{Number(employee.monthlyLimit).toFixed(2)}€</p>
                </div>
              )}
            </div>
            {employee.notes && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">Notas</p>
                <p className="text-sm mt-1">{employee.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
