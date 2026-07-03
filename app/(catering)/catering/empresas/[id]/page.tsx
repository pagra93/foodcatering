import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Package,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db/prisma'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CateringEmpresaDetailPage({ params }: PageProps) {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantCatering = session.user.tenantId
  const { id: companyId } = await params

  // Verificar que la empresa está asignada a este catering (seguridad multi-tenant).
  const assignment = await prisma.companyCateringAssignment.findFirst({
    where: { tenantCatering, companyId, active: true },
    include: {
      company: {
        include: {
          sites: {
            where: { active: true },
            select: {
              id: true,
              name: true,
              address: true,
              postalCode: true,
              city: true,
              contactName: true,
              contactPhone: true,
            },
            orderBy: { name: 'asc' },
          },
          policy: {
            select: {
              limitPerDay: true,
              cutoffTime: true,
              daysActive: true,
              copayCompany: true,
              copayEmployee: true,
            },
          },
        },
      },
    },
  })

  if (!assignment) notFound()

  const { company } = assignment
  const tenantEmpresa = assignment.tenantEmpresa

  // Métricas del mes
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    employeeCount,
    ordersThisMonth,
    ordersLastMonth,
    openIncidents,
    lastOrders,
  ] = await Promise.all([
    prisma.user.count({
      where: { tenantId: tenantEmpresa, role: 'EMPLEADO', status: 'ACTIVE' },
    }),
    prisma.order.count({
      where: {
        tenantCatering,
        tenantEmpresa,
        serviceDate: { gte: monthStart },
        status: 'DELIVERED',
      },
    }),
    prisma.order.count({
      where: {
        tenantCatering,
        tenantEmpresa,
        serviceDate: {
          gte: new Date(
            monthStart.getFullYear(),
            monthStart.getMonth() - 1,
            1
          ),
          lt: monthStart,
        },
        status: 'DELIVERED',
      },
    }),
    prisma.incident.count({
      where: {
        tenantCatering,
        tenantEmpresa,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
    prisma.order.findMany({
      where: { tenantCatering, tenantEmpresa },
      orderBy: { serviceDate: 'desc' },
      take: 5,
      select: {
        id: true,
        serviceDate: true,
        status: true,
        price: true,
        employeeId: true,
      },
    }),
  ])

  const trend =
    ordersLastMonth === 0
      ? null
      : Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/catering/empresas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a empresas
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {company.legalName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            CIF {company.cif} · Sector {company.sector ?? '—'}
          </p>
        </div>
        <Badge
          variant={assignment.type === 'PRIMARY' ? 'default' : 'outline'}
          className="text-[10px]"
        >
          {assignment.type === 'PRIMARY'
            ? 'Catering principal'
            : assignment.type === 'BACKUP'
              ? 'Catering backup'
              : assignment.type}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi
          label="Empleados activos"
          value={employeeCount}
          icon={<Users className="h-5 w-5 text-gray-400" />}
        />
        <Kpi
          label="Sedes"
          value={company.sites.length}
          icon={<MapPin className="h-5 w-5 text-gray-400" />}
        />
        <Kpi
          label="Pedidos mes"
          value={ordersThisMonth}
          hint={
            trend !== null
              ? `${trend >= 0 ? '+' : ''}${trend}% vs mes anterior`
              : undefined
          }
          icon={<Package className="h-5 w-5 text-amber-500" />}
        />
        <Kpi
          label="Incidencias abiertas"
          value={openIncidents}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          accent={openIncidents > 0 ? 'text-red-600' : undefined}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            SLAs acordados
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Puntualidad mínima</dt>
              <dd className="font-medium">
                {assignment.slaPunctuality
                  ? `≥ ${assignment.slaPunctuality}%`
                  : 'No definido'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Ratio incidencias máx</dt>
              <dd className="font-medium">
                {assignment.slaIncidentRate
                  ? `≤ ${assignment.slaIncidentRate}%`
                  : 'No definido'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Prioridad</dt>
              <dd className="font-medium">#{assignment.priority}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Asignada desde</dt>
              <dd className="font-medium">
                {assignment.assignedAt.toLocaleDateString('es-ES')}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-4 w-4 text-amber-600" />
            Política de menú
          </h3>
          {company.policy ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Límite por día</dt>
                <dd className="font-medium">
                  {`${Number(company.policy.limitPerDay).toFixed(2)} €`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Copago empresa</dt>
                <dd className="font-medium">
                  {`${Number(company.policy.copayCompany).toFixed(2)} €`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Copago empleado</dt>
                <dd className="font-medium">
                  {`${Number(company.policy.copayEmployee).toFixed(2)} €`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Cutoff diario</dt>
                <dd className="font-medium">{company.policy.cutoffTime}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Días hábiles</dt>
                <dd className="font-medium">
                  {Array.isArray(company.policy.daysActive)
                    ? (company.policy.daysActive as string[]).length
                    : '—'}{' '}
                  días
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">
              Esta empresa aún no ha definido su política.
            </p>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-4 w-4 text-amber-600" />
            Sedes ({company.sites.length})
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Sede</th>
              <th className="px-4 py-3 text-left">Dirección</th>
              <th className="px-4 py-3 text-left">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {company.sites.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">
                  <div className="text-sm">{s.address}</div>
                  <div className="text-xs text-gray-500">
                    {[s.postalCode, s.city].filter(Boolean).join(' ') || '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {s.contactName ? (
                    <>
                      <div>{s.contactName}</div>
                      <div className="text-gray-500">
                        {s.contactPhone ?? '—'}
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {company.sites.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Sin sedes activas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Package className="h-4 w-4 text-amber-600" />
            Últimos pedidos
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Los 5 más recientes. Para gestionarlos, entra al módulo
            Producción / Repartos.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {lastOrders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {o.serviceDate.toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {o.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {Number(o.price).toFixed(2)} €
                </td>
              </tr>
            ))}
            {lastOrders.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Aún no hay pedidos con esta empresa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  hint,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  hint?: string
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
          {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
        </div>
        {icon}
      </div>
    </Card>
  )
}
