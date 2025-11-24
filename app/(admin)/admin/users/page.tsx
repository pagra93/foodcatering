import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

/**
 * Página de gestión de usuarios (Admin Root)
 * Lista todos los usuarios del sistema
 */

export default async function AdminUsersPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  // Solo SUPER_ADMIN puede acceder
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized')
  }

  // Obtener todos los usuarios con sus tenants
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      tenant: {
        select: {
          name: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100, // Limitar a 100 por performance
  })

  const statusMap: Record<string, { label: string; variant: any }> = {
    ACTIVE: { label: 'Activo', variant: 'default' },
    INACTIVE: { label: 'Inactivo', variant: 'secondary' },
    SUSPENDED: { label: 'Suspendido', variant: 'destructive' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de todos los usuarios del sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Usuarios</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Activos</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {users.filter(u => u.status === 'ACTIVE').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Suspendidos</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            {users.filter(u => u.status === 'SUSPENDED').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Inactivos</p>
          <p className="text-2xl font-bold mt-1 text-gray-600">
            {users.filter(u => u.status === 'INACTIVE').length}
          </p>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <Card className="p-6">
        <div className="space-y-4">
          {users.map((user) => {
            const statusInfo = statusMap[user.status] || statusMap.INACTIVE

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{user.nameEnc}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                  {user.tenant && (
                    <p className="text-xs text-gray-400 mt-1">
                      {user.tenant.name} ({user.tenant.type})
                    </p>
                  )}
                </div>

                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/users/${user.id}`}>
                    Ver Detalle
                  </Link>
                </Button>
              </div>
            )
          })}

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

