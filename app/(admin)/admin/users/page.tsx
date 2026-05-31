import Link from 'next/link'
import { Plus, Search, ShieldCheck, Shield } from 'lucide-react'
import type { UserRole, UserStatus, TenantType } from '@prisma/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAdminUsersKPIs, getAllUsers } from '@/lib/db/queries/admin-users'
import { ROLE_DESCRIPTIONS, getRoleCategory } from '@/lib/auth/permissions'

type SP = {
  search?: string
  tenantType?: string
  role?: string
  status?: string
  page?: string
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const STATUS_VARIANT: Record<UserStatus, 'default' | 'destructive' | 'secondary'> = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  DISABLED: 'destructive',
}

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  DISABLED: 'Suspendido',
}

const CATEGORY_COLORS: Record<'ROOT' | 'EMPRESA' | 'CATERING', string> = {
  ROOT: 'bg-primary/10 text-primary border-primary/30',
  EMPRESA: 'bg-primary/10 text-primary border-primary/30',
  CATERING: 'bg-amber-100 text-amber-800 border-amber-200',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const pageNum = Number(params.page ?? '1')

  const [kpis, { users, total, pageSize }] = await Promise.all([
    getAdminUsersKPIs(),
    getAllUsers({
      search: params.search,
      tenantType: (params.tenantType as TenantType) || undefined,
      role: (params.role as UserRole) || undefined,
      status: (params.status as UserStatus) || undefined,
      page: pageNum,
      pageSize: 25,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Todos los usuarios del sistema. Los usuarios del equipo Plati se
            crean aquí; los de empresas y caterings se gestionan en sus
            portales (usa impersonación para actuar como uno de ellos).
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold">{kpis.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Activos</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {kpis.active}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Suspendidos</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.disabled}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">{kpis.pending}</p>
        </Card>
      </div>

      {/* Filtros (form server-side con query params) */}
      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Búsqueda
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="search"
                type="search"
                defaultValue={params.search ?? ''}
                placeholder="Email o nombre"
                className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Portal
            </label>
            <select
              name="tenantType"
              defaultValue={params.tenantType ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="ROOT">Equipo Plati</option>
              <option value="EMPRESA">Empresas</option>
              <option value="CATERING">Caterings</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Estado
            </label>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Activo</option>
              <option value="PENDING">Pendiente</option>
              <option value="DISABLED">Suspendido</option>
            </select>
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
          {(params.search || params.tenantType || params.status || params.role) && (
            <Button type="button" variant="ghost" asChild>
              <Link href="/admin/users">Limpiar</Link>
            </Button>
          )}
        </form>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Creado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const category = getRoleCategory(u.role)
              return (
                <tr
                  key={u.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.nameEnc}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}
                      title={ROLE_DESCRIPTIONS[u.role]}
                    >
                      {category === 'ROOT' ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{u.tenant.name}</div>
                    <div className="text-xs text-gray-500">
                      {u.tenant.subdomain} · {u.tenant.type}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[u.status]}>
                      {STATUS_LABEL[u.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${u.id}`}>Ver</Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No hay usuarios que coincidan con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Mostrando {(pageNum - 1) * pageSize + 1}–
            {Math.min(pageNum * pageSize, total)} de {total}
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/users',
                    query: { ...params, page: String(pageNum - 1) },
                  }}
                >
                  Anterior
                </Link>
              </Button>
            )}
            <span className="rounded-md bg-gray-100 px-3 py-1 text-sm">
              Página {pageNum} / {totalPages}
            </span>
            {pageNum < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: '/admin/users',
                    query: { ...params, page: String(pageNum + 1) },
                  }}
                >
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
