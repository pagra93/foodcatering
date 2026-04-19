import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  Route as RouteIcon,
  Truck,
  User,
} from 'lucide-react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db/prisma'
import {
  getAvailableDrivers,
  getRoutes,
  getRoutesStats,
} from '@/lib/db/queries/catering-routes'
import {
  NewRouteDialog,
  type DriverOption,
  type SiteOption,
} from '@/components/catering/delivery/NewRouteDialog'

const STATUS_META: Record<
  'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  IN_PROGRESS: { label: 'En curso', variant: 'default' },
  COMPLETED: { label: 'Completada', variant: 'outline' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
}

export default async function CateringRoutesPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantId = session.user.tenantId

  const today = new Date()

  const [todayRoutes, allRoutes, stats, drivers, sites] = await Promise.all([
    getRoutes(tenantId, { date: today }),
    getRoutes(tenantId),
    getRoutesStats(tenantId, today),
    getAvailableDrivers(tenantId, today),
    prisma.companySite.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        address: true,
        company: { select: { legalName: true } },
      },
      orderBy: [{ company: { legalName: 'asc' } }, { name: 'asc' }],
      take: 200,
    }),
  ])

  const driverOptions: DriverOption[] = drivers.map((d) => ({
    id: d.id,
    label: `${d.name ?? 'Repartidor'} (${d.email})${d.isAvailable ? '' : ' · ocupado'}`,
  }))

  const siteOptions: SiteOption[] = sites.map((s) => ({
    id: s.id,
    siteName: s.name,
    companyName: s.company.legalName,
    address: s.address,
  }))

  // Rutas históricas (excluye las de hoy que ya se muestran arriba).
  const historicalRoutes = allRoutes.filter(
    (r) =>
      format(r.date, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')
  )

  const totalDriversActive = await prisma.user.count({
    where: { tenantId, role: 'REPARTIDOR', status: 'ACTIVE' },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rutas de reparto</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las rutas de hoy, asigna repartidores y consulta el
            histórico. Los repartidores ven su ruta optimizada para móvil en
            <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs">
              /catering/ruta/[id]
            </code>
            .
          </p>
        </div>
        <NewRouteDialog drivers={driverOptions} sites={siteOptions} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi
          label="Rutas hoy"
          value={stats.total}
          icon={<RouteIcon className="h-5 w-5 text-gray-400" />}
        />
        <Kpi
          label="En curso"
          value={stats.inProgress}
          icon={<Truck className="h-5 w-5 text-blue-500" />}
          accent="text-blue-600"
        />
        <Kpi
          label="Completadas hoy"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          accent="text-emerald-600"
        />
        <Kpi
          label="Repartidores activos"
          value={totalDriversActive}
          icon={<User className="h-5 w-5 text-gray-400" />}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-4">
          <h3 className="text-base font-semibold">
            Rutas de hoy — {format(today, "EEEE d 'de' MMMM", { locale: es })}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {stats.totalOrders} pedidos asignados a rutas de hoy.
          </p>
        </div>

        <RoutesTable rows={todayRoutes} emptyMessage="No hay rutas para hoy. Crea una con el botón de arriba." />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-4">
          <h3 className="text-base font-semibold">
            Histórico ({historicalRoutes.length})
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Rutas de otros días (más recientes primero).
          </p>
        </div>

        <RoutesTable
          rows={historicalRoutes.slice(0, 30)}
          emptyMessage="Sin histórico aún."
        />
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent?: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        {icon}
      </div>
    </Card>
  )
}

function RoutesTable({
  rows,
  emptyMessage,
}: {
  rows: Awaited<ReturnType<typeof getRoutes>>
  emptyMessage: string
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3 text-left">Ruta</th>
          <th className="px-4 py-3 text-left">Fecha</th>
          <th className="px-4 py-3 text-left">Repartidor</th>
          <th className="px-4 py-3 text-center">Sedes</th>
          <th className="px-4 py-3 text-center">Pedidos</th>
          <th className="px-4 py-3 text-left">Estado</th>
          <th className="px-4 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const status = STATUS_META[r.status as keyof typeof STATUS_META]
          return (
            <tr
              key={r.id}
              className="border-b last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3">
                <div className="font-medium">{r.name}</div>
                {r.sites[0] && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {r.sites[0].name}
                    {r.sites.length > 1 && ` +${r.sites.length - 1}`}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-xs">
                {format(r.date, 'dd/MM/yyyy')}
              </td>
              <td className="px-4 py-3">
                {r.deliveryUser ? (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs">
                      {r.deliveryUser.name ?? r.deliveryUser.email}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Sin asignar</span>
                )}
              </td>
              <td className="px-4 py-3 text-center text-sm">
                {r.totalSites}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="inline-flex items-center gap-1 text-sm">
                  <Package className="h-3 w-3 text-gray-400" />
                  {r.totalOrders}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant} className="text-[10px]">
                    {status.label}
                  </Badge>
                  {r.startedAt && r.status === 'IN_PROGRESS' && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                      <Clock className="h-3 w-3" />
                      {format(r.startedAt, 'HH:mm')}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/catering/ruta/${r.id}`}>
                    Ver detalle
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
