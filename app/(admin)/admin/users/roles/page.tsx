import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRoleUsageStats } from '@/lib/db/queries/admin-roles'
import { RolesOverview } from '@/components/admin/users/RolesOverview'

export default async function UsersRolesPage() {
  const stats = await getRoleUsageStats()

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

      <div>
        <h1 className="text-2xl font-bold">Roles</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Los 14 roles del sistema, agrupados por portal. Los roles son{' '}
          <strong>hardcoded</strong> en <code>lib/auth/permissions.ts</code>{' '}
          bajo control de git; cambiarlos requiere un Pull Request. Esta
          página muestra el uso actual: cuántos usuarios tienen cada rol y
          cuándo fue su última actividad.
        </p>
      </div>

      <RolesOverview stats={stats} />
    </div>
  )
}
