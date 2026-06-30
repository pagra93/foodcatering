import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getRequiredSession } from '@/lib/auth/session'
import { getRoleDetail, getPermissionCatalogGrouped } from '@/lib/db/queries/admin-roles'
import { RoleForm } from '@/components/admin/users/RoleForm'

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getRequiredSession()
  const { id } = await params

  const [role, catalog] = await Promise.all([
    getRoleDetail(id),
    getPermissionCatalogGrouped(),
  ])
  if (!role) notFound()

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

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{role.name}</h1>
        {role.isSystem && (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Rol del sistema
          </Badge>
        )}
      </div>

      <RoleForm
        mode="edit"
        roleId={role.id}
        catalog={catalog}
        initial={{
          name: role.name,
          description: role.description ?? '',
          category: role.category,
          baseRole: role.baseRole ?? '',
          isSystem: role.isSystem,
          permissionKeys: role.permissionKeys,
        }}
      />
    </div>
  )
}
