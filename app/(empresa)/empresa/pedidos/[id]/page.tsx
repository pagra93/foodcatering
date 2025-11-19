import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getOrderById } from '@/lib/db/queries/empresa-pedidos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderDetailOverview } from '@/components/empresa/pedidos/OrderDetailOverview'
import { OrderTraceability } from '@/components/empresa/pedidos/OrderTraceability'
import { OrderHistory } from '@/components/empresa/pedidos/OrderHistory'

/**
 * Página de detalle de pedido
 * FASE 3 - Información completa, trazabilidad fiscal, historial
 */

async function OrderDetailData({ id }: { id: string }) {
  const tenant = await getCurrentTenant()
  const order = await getOrderById(id, tenant.id)

  if (!order) {
    notFound()
  }

  const statusMap = {
    DRAFT: { label: 'Borrador', variant: 'outline' as const },
    CONFIRMED: { label: 'Confirmado', variant: 'default' as const },
    LOCKED_AFTER_CUTOFF: { label: 'Bloqueado', variant: 'secondary' as const },
    DELIVERED: { label: 'Entregado', variant: 'success' as const },
    CANCELLED_BEFORE_CUTOFF: { label: 'Cancelado', variant: 'destructive' as const },
    CANCELLED_AFTER_CUTOFF: { label: 'Cancelado (tardío)', variant: 'destructive' as const },
    NO_SHOW: { label: 'No recogido', variant: 'warning' as const },
    ISSUE_REPORTED: { label: 'Con incidencia', variant: 'warning' as const },
  }

  const statusInfo = statusMap[order.status as keyof typeof statusMap]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/empresa/pedidos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedido #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Información completa y trazabilidad del pedido
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              {order.incidents.length > 0 && (
                <Badge variant="warning">{order.incidents.length} incidencia(s)</Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Descargar Justificante
        </Button>
      </div>

      {/* Contenido */}
      <div className="space-y-6">
        {/* Overview */}
        <OrderDetailOverview order={order} />

        {/* Trazabilidad Fiscal */}
        <OrderTraceability order={order} />

        {/* Historial de Cambios */}
        {order.history.length > 0 && <OrderHistory history={order.history} />}
      </div>
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

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <OrderDetailData id={params.id} />
      </Suspense>
    </div>
  )
}

