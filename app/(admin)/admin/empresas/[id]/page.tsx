/**
 * Página de detalle de una empresa
 * Dashboard completo con tabs: Overview, Configuración, Sedes, Empleados, Usuarios
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCompanyByIdComplete } from '@/lib/db/queries/companies'
import {
  getCompanyCateringAssignments,
  getAssignableCaterings,
} from '@/lib/db/queries/catering-assignments'
import { permissionsInclude } from '@/lib/auth/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompanyOverviewTab } from '@/components/admin/companies/CompanyOverviewTab'
import { CompanyCateringsTab } from '@/components/admin/companies/CompanyCateringsTab'

// ============================================================================
// SKELETONS
// ============================================================================

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-3 w-full" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

// ============================================================================
// COMPONENTE DE DATOS
// ============================================================================

async function CompanyDetailData({ id }: { id: string }) {
  const company = await getCompanyByIdComplete(id)

  if (!company) {
    notFound()
  }

  const session = await getRequiredSession()
  const canManageCaterings = permissionsInclude(
    session.user.permissions,
    'empresa:assign-catering'
  )
  const companyId = company.company.id
  const [cateringAssignments, assignableCaterings] = await Promise.all([
    getCompanyCateringAssignments(companyId),
    canManageCaterings ? getAssignableCaterings(companyId) : Promise.resolve([]),
  ])
  const activeCateringCount = cateringAssignments.filter((a) => a.active).length

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Logo o inicial */}
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold text-white"
              style={{ backgroundColor: company.primaryColor || '#3B82F6' }}
            >
              {company.name[0]?.toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{company.company.legalName}</p>
            <div className="mt-2 flex items-center gap-3">
              <Badge
                variant={
                  company.status === 'ACTIVE'
                    ? 'success'
                    : company.status === 'SUSPENDED'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {company.status === 'ACTIVE' ? 'Activa' :
                 company.status === 'SUSPENDED' ? 'Suspendida' :
                 'En revisión'}
              </Badge>
              <Badge variant="outline">{company.company.plan}</Badge>
              <span className="text-sm text-gray-500">
                CIF: {company.company.cif}
              </span>
              {company.company.sector && (
                <Badge variant="secondary">{company.company.sector}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/empresas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/empresas/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="overview">
            Overview
            {company.alerts.totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {company.alerts.totalAlerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="caterings">
            Caterings ({activeCateringCount})
          </TabsTrigger>
          <TabsTrigger value="sites">
            Sedes ({company.sites.length})
          </TabsTrigger>
          <TabsTrigger value="employees">
            Empleados ({company.kpis.totalEmployees})
          </TabsTrigger>
          <TabsTrigger value="users">
            Usuarios ({company.users.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <CompanyOverviewTab
            company={company}
            kpis={company.kpis}
            alerts={company.alerts}
            catering={company.catering}
            recentOrders={company.recentOrders}
            recentIncidents={company.recentIncidents}
          />
        </TabsContent>

        {/* Tab 2: Configuración */}
        <TabsContent value="config">
          <div className="space-y-6">
            {/* Política de Servicio */}
            {company.policy && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Política de Servicio
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Hora de Cutoff</p>
                    <p className="text-base font-semibold text-gray-900">
                      {company.policy.cutoffTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Límite Diario</p>
                    <p className="text-base font-semibold text-gray-900">
                      {company.policy.limitPerDay.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                    {company.policy.limitPerDay > 11 && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        Supera límite fiscal
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Copago Empresa</p>
                    <p className="text-base font-semibold text-gray-900">
                      {company.policy.copayCompany.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Copago Empleado</p>
                    <p className="text-base font-semibold text-gray-900">
                      {company.policy.copayEmployee.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Días Activos</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(company.policy.daysActive as string[]).map((day) => (
                        <Badge key={day} variant="secondary" className="text-xs">
                          {day === 'monday' ? 'L' :
                           day === 'tuesday' ? 'M' :
                           day === 'wednesday' ? 'X' :
                           day === 'thursday' ? 'J' :
                           day === 'friday' ? 'V' :
                           day === 'saturday' ? 'S' : 'D'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Regla No-Show</p>
                    <Badge variant="outline">
                      {company.policy.noShowRule === 'CHARGE' ? 'Cobrar' :
                       company.policy.noShowRule === 'NO_CHARGE' ? 'No cobrar' :
                       'Cobro parcial'}
                    </Badge>
                  </div>
                </div>
              </Card>
            )}

            {/* Contactos */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contactos
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">RRHH</p>
                  {company.company.contactRrhhName ? (
                    <>
                      <p className="text-base font-semibold text-gray-900">
                        {company.company.contactRrhhName}
                      </p>
                      <p className="text-sm text-gray-600">{company.company.contactRrhhEmail}</p>
                      <p className="text-sm text-gray-600">{company.company.contactRrhhPhone}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No definido</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Finanzas</p>
                  {company.company.contactFinanceName ? (
                    <>
                      <p className="text-base font-semibold text-gray-900">
                        {company.company.contactFinanceName}
                      </p>
                      <p className="text-sm text-gray-600">{company.company.contactFinanceEmail}</p>
                      <p className="text-sm text-gray-600">{company.company.contactFinancePhone}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No definido</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Caterings asignados */}
        <TabsContent value="caterings">
          <CompanyCateringsTab
            companyId={companyId}
            assignments={cateringAssignments}
            assignable={assignableCaterings}
            canManage={canManageCaterings}
          />
        </TabsContent>

        {/* Tab 3: Sedes */}
        <TabsContent value="sites">
          <div className="grid grid-cols-1 gap-4">
            {company.sites.map((site) => (
              <Card key={site.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{site.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{site.address}</p>
                    {site.city && site.postalCode && (
                      <p className="text-sm text-gray-600">
                        {site.postalCode} {site.city}
                      </p>
                    )}
                  </div>
                  <Badge variant={site.active ? 'success' : 'secondary'}>
                    {site.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Empleados</p>
                    <p className="text-2xl font-bold text-gray-900">{site.employeeCount}</p>
                  </div>
                  {site.deliveryWindow && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Ventana de Entrega</p>
                      <p className="text-base font-semibold text-gray-900">{site.deliveryWindow}</p>
                    </div>
                  )}
                  {site.contactName && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Contacto</p>
                      <p className="text-base font-semibold text-gray-900">{site.contactName}</p>
                      {site.contactPhone && (
                        <p className="text-sm text-gray-600">{site.contactPhone}</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: Empleados */}
        <TabsContent value="employees">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Empleados por Sede
            </h3>
            {company.sites.map((site) => (
              <div key={site.id} className="mb-8 last:mb-0">
                <h4 className="text-base font-semibold text-gray-800 mb-3">{site.name}</h4>
                {site.employees.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay empleados en esta sede</p>
                ) : (
                  <div className="space-y-2">
                    {site.employees.slice(0, 10).map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.user.name}</p>
                          <p className="text-xs text-gray-500">
                            {emp.employeeNumber} • {emp.department} • {emp.position}
                          </p>
                        </div>
                        <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">
                          {emp.status}
                        </Badge>
                      </div>
                    ))}
                    {site.employees.length > 10 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        ... y {site.employees.length - 10} más
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* Tab 5: Usuarios */}
        <TabsContent value="users">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Usuarios del Sistema
              </h3>
            </div>
            <div className="space-y-3">
              {company.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                    {user.mfaEnabled && (
                      <Badge variant="success" className="text-xs">MFA</Badge>
                    )}
                    <Badge 
                      variant={user.status === 'ACTIVE' ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {user.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getRequiredSession()
  const { id } = await params

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <CompanyDetailData id={id} />
      </Suspense>
    </div>
  )
}
