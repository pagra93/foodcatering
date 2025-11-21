import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/auth/get-tenant'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ============================================================================
// Página de Detalle de Incidencia (Empresa)
// ============================================================================

type Props = {
  params: {
    id: string
  }
}

export default async function IncidentDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const tenant = getTenant()
  if (tenant.type !== 'EMPRESA') {
    redirect('/unauthorized')
  }

  // Obtener incidencia
  const incident = await prisma.incident.findFirst({
    where: {
      id: params.id,
      tenantEmpresa: tenant.id,
    },
    include: {
      order: {
        select: {
          id: true,
          employeeId: true,
          serviceDate: true,
          status: true,
          price: true,
        },
      },
    },
  })

  if (!incident) {
    notFound()
  }

  // Mapeo de tipos
  const INCIDENT_TYPES: Record<string, { label: string; color: string }> = {
    DELAYED_DELIVERY: { label: 'Entrega Retrasada', color: 'bg-yellow-500' },
    MISSING_ITEM: { label: 'Falta Artículo', color: 'bg-orange-500' },
    WRONG_ORDER: { label: 'Pedido Incorrecto', color: 'bg-red-500' },
    QUALITY_ISSUE: { label: 'Problema de Calidad', color: 'bg-purple-500' },
    ALLERGEN_ISSUE: { label: 'Problema de Alérgenos', color: 'bg-red-700' },
    DAMAGED_PACKAGING: { label: 'Envase Dañado', color: 'bg-amber-500' },
    OTHER: { label: 'Otro', color: 'bg-gray-500' },
  }

  const SEVERITY_MAP: Record<string, { label: string; badgeVariant: any }> = {
    LOW: { label: 'Baja', badgeVariant: 'outline' },
    MEDIUM: { label: 'Media', badgeVariant: 'secondary' },
    HIGH: { label: 'Alta', badgeVariant: 'destructive' },
  }

  const STATUS_MAP: Record<string, { label: string; badgeVariant: any }> = {
    OPEN: { label: 'Abierta', badgeVariant: 'default' },
    IN_PROGRESS: { label: 'En Progreso', badgeVariant: 'secondary' },
    RESOLVED: { label: 'Resuelta', badgeVariant: 'outline' },
    CLOSED: { label: 'Cerrada', badgeVariant: 'outline' },
  }

  const resolution = incident.resolution as any

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/empresa/incidencias">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Incidencias
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Incidencia #{incident.id.slice(-8)}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Creada el {format(new Date(incident.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
              <Badge variant={STATUS_MAP[incident.status]?.badgeVariant || 'default'}>
                {STATUS_MAP[incident.status]?.label || incident.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <Badge className={`mt-1 ${INCIDENT_TYPES[incident.type]?.color}`}>
                  {INCIDENT_TYPES[incident.type]?.label || incident.type}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Severidad</p>
                <Badge className="mt-1" variant={SEVERITY_MAP[incident.severity]?.badgeVariant}>
                  {SEVERITY_MAP[incident.severity]?.label}
                </Badge>
              </div>
            </div>

            {incident.order && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pedido Asociado</p>
                <div className="mt-1 space-y-1">
                  <p className="text-sm">ID: {incident.order.id}</p>
                  <p className="text-sm">Empleado ID: {incident.order.employeeId}</p>
                  <p className="text-sm">
                    Fecha: {format(new Date(incident.order.serviceDate), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolución */}
        {resolution && (
          <Card>
            <CardHeader>
              <CardTitle>Resolución</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resolution.details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Detalles</p>
                  <p className="text-sm mt-1">{resolution.details}</p>
                </div>
              )}
              {resolution.amount && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compensación</p>
                  <p className="text-sm mt-1">{resolution.amount}€</p>
                </div>
              )}
              {resolution.resolvedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Resolución</p>
                  <p className="text-sm mt-1">
                    {format(new Date(resolution.resolvedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

