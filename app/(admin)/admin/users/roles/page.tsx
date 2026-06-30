import Link from 'next/link'
import { ArrowLeft, Plus, ShieldCheck, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRolesWithCounts } from '@/lib/db/queries/admin-roles'

const CATEGORY_LABEL: Record<string, string> = {
  ROOT: 'Admin (equipo Plati)',
  EMPRESA: 'Empresa',
  CATERING: 'Catering',
}

export default async function UsersRolesPage() {
  const roles = await getRolesWithCounts()
  const categories = ['ROOT', 'EMPRESA', 'CATERING'] as const

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
          <h1 className="text-2xl font-bold">Roles y permisos</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Crea roles y edita qué permisos tiene cada uno. Los roles del sistema no se borran
            pero sí puedes ajustar sus permisos. Los cambios afectan a lo que cada usuario ve y
            a lo que puede entrar (al refrescar su sesión).
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/roles/new">
            <Plus className="mr-2 h-4 w-4" />
            Crear rol
          </Link>
        </Button>
      </div>

      {categories.map((cat) => {
        const list = roles.filter((r) => r.category === cat)
        if (list.length === 0) return null
        return (
          <div key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {CATEGORY_LABEL[cat]}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <Card key={r.id} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{r.name}</span>
                        {r.isSystem && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <ShieldCheck className="h-3 w-3" /> Sistema
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs text-gray-400">{r.key}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/users/roles/${r.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  {r.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-500">{r.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                    <span>{r.permissionsCount} permisos</span>
                    <span>·</span>
                    <Link
                      href={`/admin/users?role=${r.baseRole ?? ''}`}
                      className="text-primary hover:underline"
                    >
                      {r.usersCount} usuarios
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
