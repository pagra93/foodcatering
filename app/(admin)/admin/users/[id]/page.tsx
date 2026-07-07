import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getUserById,
  getUserLastActivity,
} from '@/lib/db/queries/admin-users'
import {
  ROLE_DESCRIPTIONS,
  getRoleCategory,
  PERMISSIONS,
} from '@/lib/auth/permissions'
import { UserDetailActions } from '@/components/admin/users/UserDetailActions'
import { decryptNameSafe } from '@/lib/crypto/pii'

const STATUS_VARIANT = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  DISABLED: 'destructive',
} as const

const STATUS_LABEL = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  DISABLED: 'Suspendido',
} as const

const CATEGORY_LABEL = {
  ROOT: 'Equipo Plati',
  EMPRESA: 'Portal Empresa',
  CATERING: 'Portal Catering',
} as const

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [session, user, lastActivity] = await Promise.all([
    auth() as Promise<Session | null>,
    getUserById(id),
    getUserLastActivity(id),
  ])

  if (!user) notFound()

  const currentUserId = session?.user?.id ?? ''
  const isSelf = currentUserId === user.id
  const category = getRoleCategory(user.role)
  const permissions = PERMISSIONS[user.role] ?? []

  // Ruta canónica de la ficha del tenant según su tipo (el árbol /admin/tenants
  // está deprecado). ROOT = equipo Plati, sin ficha.
  const tenantHref =
    user.tenant.type === 'EMPRESA'
      ? `/admin/empresas/${user.tenant.id}`
      : user.tenant.type === 'CATERING'
        ? `/admin/caterings/${user.tenant.id}`
        : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Usuarios
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{decryptNameSafe(user.nameEnc)}</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={STATUS_VARIANT[user.status]}>
              {STATUS_LABEL[user.status]}
            </Badge>
            <Badge variant="outline">{user.role}</Badge>
            <Badge variant="secondary">{CATEGORY_LABEL[category]}</Badge>
            {isSelf && <Badge variant="outline">Eres tú</Badge>}
          </div>
        </div>
      </div>

      <UserDetailActions
        userId={user.id}
        currentStatus={user.status}
        isSelf={isSelf}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Información básica</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase text-gray-500">Email</p>
              <p className="mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                {user.email}
              </p>
            </div>
            {user.phoneEnc && (
              <div>
                <p className="text-xs uppercase text-gray-500">Teléfono</p>
                <p className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {decryptNameSafe(user.phoneEnc, '—')}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase text-gray-500">Creado</p>
              <p className="mt-1">
                {format(user.createdAt, "dd 'de' MMMM yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">
                Última actualización
              </p>
              <p className="mt-1">
                {format(user.updatedAt, "dd 'de' MMMM yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </p>
            </div>
            {lastActivity && (
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Última actividad
                </p>
                <p className="mt-1">
                  {lastActivity.action} sobre {lastActivity.entity} ·{' '}
                  {format(lastActivity.timestamp, 'dd MMM yyyy HH:mm', {
                    locale: es,
                  })}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Rol y permisos</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">{user.role}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {ROLE_DESCRIPTIONS[user.role]}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase text-gray-500">
                Permisos del rol ({permissions.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="font-mono text-xs"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h3 className="mb-4 text-lg font-semibold">Tenant asociado</h3>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-gray-500">Nombre</p>
              <p className="mt-1 font-medium">{user.tenant.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Subdominio</p>
              <p className="mt-1 font-mono text-xs">
                {user.tenant.subdomain}.plati.es
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Tipo</p>
              <Badge variant="outline" className="mt-1">
                {user.tenant.type}
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {tenantHref ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={tenantHref}>
                  Ver {user.tenant.type === 'EMPRESA' ? 'empresa' : 'catering'}
                </Link>
              </Button>
            ) : (
              <span className="text-xs text-gray-400">
                Tenant interno (equipo Plati) — sin ficha de cliente
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
