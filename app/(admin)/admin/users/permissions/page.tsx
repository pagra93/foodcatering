import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ALL_PERMISSIONS,
  groupPermissionsByEntity,
} from '@/lib/auth/permissions'
import { PermissionsMatrix } from '@/components/admin/users/PermissionsMatrix'

export default function UsersPermissionsPage() {
  const permissionsByEntity = groupPermissionsByEntity(ALL_PERMISSIONS)
  const entities = Object.keys(permissionsByEntity).sort()

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
        <h1 className="text-2xl font-bold">Matriz de Permisos</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Permisos concedidos a cada rol, agrupados por portal. Pasa el cursor
          sobre cada permiso para ver su descripción. Usa "Export CSV" para
          enviar la matriz a una auditoría externa.
        </p>
      </div>

      <PermissionsMatrix
        permissionsByEntity={permissionsByEntity}
        entities={entities}
      />
    </div>
  )
}
