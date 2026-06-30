/**
 * Página de detalle de Catering
 * Dashboard completo con toda la información operativa y de calidad
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCateringById } from '@/lib/db/queries/caterings'
import { getGlobalIncidents } from '@/lib/db/queries/admin-quality'
import { getActivityLog } from '@/lib/db/queries/empresa-actividad'
import {
  getCateringBillingKPIs,
  getCateringInvoicesEmitidas,
  getSettlementsByCatering,
} from '@/lib/db/queries/catering-billing'
import { getCateringDailyOperations } from '@/lib/db/queries/catering-operations'
import { getAuditsForCatering } from '@/lib/db/queries/admin-audits'
import { getPenaltiesForCatering } from '@/lib/db/queries/admin-penalties'
import { decryptNameSafe } from '@/lib/crypto/pii'
import { startOfWeek } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CateringKPIs } from '@/components/admin/caterings/CateringKPIs'
import { CateringAlerts } from '@/components/admin/caterings/CateringAlerts'
import { OperationalStatus } from '@/components/admin/caterings/OperationalStatus'
import { QualityComplianceTab } from '@/components/admin/caterings/QualityComplianceTab'
import { DailyOperationsTab } from '@/components/admin/caterings/DailyOperationsTab'
import { MenusDishesTab } from '@/components/admin/caterings/MenusDishesTab'
import { BillingPaymentsTab } from '@/components/admin/caterings/BillingPaymentsTab'
import { IncidentsTab } from '@/components/admin/caterings/IncidentsTab'
import { UsersPermissionsTab } from '@/components/admin/caterings/UsersPermissionsTab'
import { ActivityLogTab } from '@/components/admin/caterings/ActivityLogTab'

// Skeletons
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

// Header del catering
async function CateringHeader({ id }: { id: string }) {
  const catering = await getCateringById(id)

  if (!catering) {
    notFound()
  }

  const { restaurant } = catering

  // Determinar color de estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'SUSPENDED':
        return 'destructive'
      case 'UNDER_REVIEW':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        {/* Logo o inicial */}
        {catering.logoUrl ? (
          <img
            src={catering.logoUrl}
            alt={catering.name}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold text-white"
            style={{ backgroundColor: catering.primaryColor || '#8B5CF6' }}
          >
            {catering.name[0]?.toUpperCase()}
          </div>
        )}

        {/* Info */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{catering.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{restaurant.legalName}</p>
          <div className="mt-2 flex items-center gap-3">
            <Badge variant={getStatusColor(restaurant.operationalStatus)}>
              {restaurant.operationalStatus === 'ACTIVE' && 'Activo'}
              {restaurant.operationalStatus === 'SUSPENDED' && 'Suspendido'}
              {restaurant.operationalStatus === 'UNDER_REVIEW' && 'En Revisión'}
            </Badge>
            <Badge
              variant={
                restaurant.documentsStatus === 'OK'
                  ? 'success'
                  : restaurant.documentsStatus === 'WARNING'
                  ? 'warning'
                  : 'destructive'
              }
            >
              Docs: {restaurant.documentsStatus}
            </Badge>
            <span className="text-sm text-gray-500">
              CIF: {restaurant.cif}
            </span>
            <span className="text-sm text-gray-500">
              Capacidad: {restaurant.dailyCapacity} platos/día
            </span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/admin/caterings/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>
    </div>
  )
}

// Contenido principal
async function CateringContent({ id }: { id: string }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const [
    catering,
    incidentsData,
    activityData,
    billingKpis,
    invoicesRaw,
    settlements,
    dailyOps,
    audits,
    penalties,
  ] = await Promise.all([
    getCateringById(id),
    getGlobalIncidents({ tenantCatering: id, pageSize: 100 }),
    getActivityLog(id, { limit: 50 }),
    getCateringBillingKPIs(id),
    getCateringInvoicesEmitidas(id),
    getSettlementsByCatering(id),
    getCateringDailyOperations(id, weekStart),
    getAuditsForCatering(id),
    getPenaltiesForCatering(id),
  ])

  if (!catering) {
    notFound()
  }

  // Alérgenos calculados desde el catálogo real de platos
  const dishes = catering.dishes
  const totalDishes = dishes.length
  const labeledDishes = dishes.filter((d) => (d.labels as string[]).length > 0).length
  const allergens = {
    totalDishes,
    labeledDishes,
    pctLabeled: totalDishes > 0 ? Math.round((labeledDishes / totalDishes) * 100) : 0,
    distinctLabels: new Set(dishes.flatMap((d) => d.labels as string[])).size,
  }

  const invoiceRows = invoicesRaw.map((i) => ({
    id: i.id,
    number: i.number,
    period: i.period,
    empresa: i.empresa?.name ?? '—',
    total: Number(i.total),
    status: i.status,
    issueDate: i.issueDate,
    paidAt: i.paidAt,
  }))

  const activityRows = activityData.logs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp,
    user: l.user ? decryptNameSafe(l.user.nameEnc) || l.user.email : l.actorId,
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    ip: l.ip,
  }))

  return (
    <>
      {/* Alertas críticas (si existen) */}
      {(catering.alerts.expiredDocs.length > 0 ||
        catering.alerts.criticalIncidents.length > 0 ||
        catering.alerts.lowPunctuality ||
        catering.alerts.highIncidentRate) && (
        <CateringAlerts alerts={catering.alerts} />
      )}

      {/* Tabs de contenido */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calidad">Calidad & Cumplimiento</TabsTrigger>
          <TabsTrigger value="operacion">Operación Diaria</TabsTrigger>
          <TabsTrigger value="menus">Menús & Platos</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          <TabsTrigger value="incidencias">
            Incidencias ({incidentsData.total})
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            Usuarios ({catering.users.length})
          </TabsTrigger>
          <TabsTrigger value="actividad">Registro de Actividad</TabsTrigger>
        </TabsList>

        {/* Tab Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs */}
          <CateringKPIs kpis={catering.kpis} />

          {/* Estado Operativo */}
          <OperationalStatus restaurant={catering.restaurant} />

          {/* Grid de información */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Información de Contacto */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información de Contacto
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Persona de Contacto
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {catering.restaurant.contactPerson}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">
                    {catering.restaurant.contactEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                  <dd className="text-sm text-gray-900">
                    {catering.restaurant.contactPhone}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Dirección Fiscal
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {catering.restaurant.billingAddress}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Configuración Económica */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración Económica
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Comisión</dt>
                  <dd className="text-lg font-bold text-gray-900">
                    {(Number(catering.restaurant.commission) * 100).toFixed(2)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Facturación Mínima
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {Number(catering.restaurant.minimumBilling).toFixed(2)}€
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Ciclo de Pago
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {catering.restaurant.paymentCycle}
                  </dd>
                </div>
                {catering.restaurant.iban && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">IBAN</dt>
                    <dd className="text-sm font-mono text-gray-900">
                      {catering.restaurant.iban}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </TabsContent>

        {/* Tab Calidad & Cumplimiento */}
        <TabsContent value="calidad">
          <QualityComplianceTab
            documents={catering.documents}
            audits={audits}
            penalties={penalties}
            allergens={allergens}
            cateringId={catering.id}
          />
        </TabsContent>

        {/* Tab Operación Diaria */}
        <TabsContent value="operacion">
          <DailyOperationsTab
            days={dailyOps}
            cutoffTime={catering.restaurant.cutoffTime}
            deliveryWindow={catering.restaurant.deliveryWindow}
          />
        </TabsContent>

        {/* Tab Menús & Platos */}
        <TabsContent value="menus">
          <MenusDishesTab
            dishes={catering.dishes}
            cateringId={catering.id}
          />
        </TabsContent>

        {/* Tab Facturación & Pagos */}
        <TabsContent value="facturacion">
          <BillingPaymentsTab
            kpis={billingKpis}
            invoices={invoiceRows}
            settlements={settlements}
          />
        </TabsContent>

        {/* Tab Incidencias */}
        <TabsContent value="incidencias">
          <IncidentsTab incidents={incidentsData.incidents} />
        </TabsContent>

        {/* Tab Usuarios & Permisos */}
        <TabsContent value="usuarios">
          <UsersPermissionsTab
            users={catering.users}
            cateringId={catering.id}
          />
        </TabsContent>

        {/* Tab Registro de Actividad */}
        <TabsContent value="actividad">
          <ActivityLogTab logs={activityRows} />
        </TabsContent>
      </Tabs>
    </>
  )
}

// Página principal
export default async function CateringDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await getRequiredSession()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/caterings"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Caterings
        </Link>
      </div>

      {/* Header */}
      <Suspense fallback={<Skeleton className="h-20" />}>
        <CateringHeader id={params.id} />
      </Suspense>

      {/* Contenido */}
      <Suspense fallback={<PageSkeleton />}>
        <CateringContent id={params.id} />
      </Suspense>
    </div>
  )
}

