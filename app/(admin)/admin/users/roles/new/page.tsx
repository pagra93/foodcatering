import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRequiredSession } from '@/lib/auth/session'
import { getPermissionCatalogGrouped } from '@/lib/db/queries/admin-roles'
import { RoleForm } from '@/components/admin/users/RoleForm'

export default async function NewRolePage() {
  await getRequiredSession()
  const catalog = await getPermissionCatalogGrouped()

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users/roles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Roles
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Crear rol</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define el rol y marca los permisos que tendrá.
        </p>
      </div>

      <RoleForm
        mode="create"
        catalog={catalog}
        initial={{
          name: '',
          description: '',
          category: 'EMPRESA',
          baseRole: 'ADMIN_EMPRESA',
          isSystem: false,
          permissionKeys: [],
        }}
      />
    </div>
  )
}
