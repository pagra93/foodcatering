import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCompanyById } from '@/lib/db/queries/companies'
import { getOrders } from '@/lib/db/queries/empresa-pedidos'
import { decryptNameSafe } from '@/lib/crypto/pii'
import { formatPrice } from '@/lib/utils'

const ORDER_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  DRAFT: { label: 'Borrador', variant: 'outline' },
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  LOCKED_AFTER_CUTOFF: { label: 'Bloqueado', variant: 'secondary' },
  DELIVERED: { label: 'Entregado', variant: 'success' },
  CANCELLED_BEFORE_CUTOFF: { label: 'Cancelado', variant: 'destructive' },
  CANCELLED_AFTER_CUTOFF: { label: 'Cancelado (tardío)', variant: 'destructive' },
  NO_SHOW: { label: 'No recogido', variant: 'warning' },
}

type SP = { page?: string }

export default async function CompanyOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SP>
}) {
  const { id } = await params
  const sp = await searchParams
  const company = await getCompanyById(id)
  if (!company) notFound()

  const pageNum = Number(sp.page ?? '1')
  const { orders, pagination, stats } = await getOrders(id, {
    period: 'month',
    page: pageNum,
    pageSize: 25,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/empresas/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a {company.name}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pedidos de <span className="font-medium">{company.name}</span> · mes en curso
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pedidos del mes</p>
          <p className="mt-1 text-2xl font-bold">{stats.totalOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Importe total</p>
          <p className="mt-1 text-2xl font-bold">{formatPrice(stats.totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Ticket medio</p>
          <p className="mt-1 text-2xl font-bold">{formatPrice(stats.avgTicket)}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Empleado</th>
              <th className="px-4 py-3 text-left">Servicio</th>
              <th className="px-4 py-3 text-left">Menú</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const st = ORDER_STATUS[o.status] ?? { label: o.status, variant: 'default' as const }
              return (
                <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {o.employee ? decryptNameSafe(o.employee.name) : '—'}
                    </p>
                    {o.employee && (
                      <p className="text-xs text-gray-500">
                        {o.employee.employeeNumber}
                        {o.employee.site && ` · ${o.employee.site}`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(o.serviceDate, 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{o.menuType}</td>
                  <td className="px-4 py-3">
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatPrice(o.price)}</td>
                </tr>
              )
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  No hay pedidos este mes para esta empresa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {pagination.page} de {pagination.totalPages} · {pagination.total} pedidos
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={{ pathname: `/admin/empresas/${id}/pedidos`, query: { page: String(pageNum - 1) } }}>
                  Anterior
                </Link>
              </Button>
            )}
            {pageNum < pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={{ pathname: `/admin/empresas/${id}/pedidos`, query: { page: String(pageNum + 1) } }}>
                  Siguiente
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
