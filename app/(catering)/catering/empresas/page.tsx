import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Building2,
  ChevronRight,
  MapPin,
  Package,
  Users,
} from 'lucide-react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db/prisma'

export default async function CateringEmpresasPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantCatering = session.user.tenantId

  const assignments = await prisma.companyCateringAssignment.findMany({
    where: { tenantCatering, active: true },
    include: {
      company: {
        include: {
          sites: { where: { active: true }, select: { id: true } },
        },
      },
    },
    orderBy: [{ priority: 'asc' }, { assignedAt: 'desc' }],
  })

  // Empleados por tenant (una sola query agregada)
  const empresaIds = assignments.map((a) => a.tenantEmpresa)
  const employeesByTenant = await prisma.user.groupBy({
    by: ['tenantId'],
    where: {
      tenantId: { in: empresaIds },
      role: 'EMPLEADO',
      status: 'ACTIVE',
    },
    _count: { _all: true },
  })
  const employeesMap = new Map(
    employeesByTenant.map((e) => [e.tenantId, e._count._all])
  )

  // Pedidos del mes por empresa (en una sola query)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ordersThisMonth = await prisma.order.groupBy({
    by: ['tenantEmpresa'],
    where: {
      tenantCatering,
      serviceDate: { gte: monthStart },
      status: 'DELIVERED',
    },
    _count: { _all: true },
  })
  const ordersByEmpresa = new Map(
    ordersThisMonth.map((o) => [o.tenantEmpresa, o._count._all])
  )

  const kpis = {
    total: assignments.length,
    primary: assignments.filter((a) => a.type === 'PRIMARY').length,
    totalEmployees: assignments.reduce(
      (acc, a) => acc + (employeesMap.get(a.tenantEmpresa) ?? 0),
      0
    ),
    totalSites: assignments.reduce((acc, a) => acc + a.company.sites.length, 0),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Empresas cliente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Las empresas asignadas a tu catering. Incluye tipo de asignación
          (PRINCIPAL / BACKUP), SLAs acordados y tracking operativo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Empresas activas" value={kpis.total} icon={<Building2 className="h-5 w-5 text-amber-500" />} />
        <Kpi label="Como principal" value={kpis.primary} icon={<Building2 className="h-5 w-5 text-emerald-500" />} accent="text-emerald-600" />
        <Kpi label="Sedes totales" value={kpis.totalSites} icon={<MapPin className="h-5 w-5 text-gray-400" />} />
        <Kpi label="Empleados servidos" value={kpis.totalEmployees} icon={<Users className="h-5 w-5 text-gray-400" />} />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-center">Tipo</th>
              <th className="px-4 py-3 text-center">Sedes</th>
              <th className="px-4 py-3 text-center">Empleados</th>
              <th className="px-4 py-3 text-center">Pedidos mes</th>
              <th className="px-4 py-3 text-left">SLA Punt.</th>
              <th className="px-4 py-3 text-left">Asignada</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const orders = ordersByEmpresa.get(a.tenantEmpresa) ?? 0
              return (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.company.legalName}</div>
                    <div className="text-xs text-gray-500">
                      CIF: {a.company.cif}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={a.type === 'PRIMARY' ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {a.type === 'PRIMARY'
                        ? 'Principal'
                        : a.type === 'BACKUP'
                          ? 'Backup'
                          : a.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.company.sites.length}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(employeesMap.get(a.tenantEmpresa) ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <Package className="h-3 w-3 text-gray-400" />
                      {orders}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {a.slaPunctuality ? `≥ ${a.slaPunctuality}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.assignedAt.toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/catering/empresas/${a.companyId}`}
                      className="inline-flex items-center gap-1 text-sm text-amber-700 hover:underline"
                    >
                      Ver
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
            {assignments.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-sm text-gray-500"
                >
                  Aún no tienes empresas asignadas. El súper admin las asigna
                  desde el portal de administración.
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
