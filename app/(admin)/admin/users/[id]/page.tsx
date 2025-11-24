import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Edit, Mail, Phone } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
  params: {
    id: string
  }
}

/**
 * Página de detalle de usuario (Super Admin)
 */
export default async function UserDetailPage({ params }: Props) {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  // Solo SUPER_ADMIN puede acceder
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized')
  }

  // Obtener usuario
  const user = await prisma.user.findUnique({
    where: {
      id: params.id,
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const statusMap: Record<string, { label: string; variant: any }> = {
    ACTIVE: { label: 'Activo', variant: 'default' },
    INACTIVE: { label: 'Inactivo', variant: 'secondary' },
    SUSPENDED: { label: 'Suspendido', variant: 'destructive' },
  }

  const statusInfo = statusMap[user.status] || statusMap.INACTIVE

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Usuarios
            </Link>
          </Button>
        </div>
        <Button asChild>
          <Link href={`/admin/users/${user.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{user.nameEnc}</h1>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      {/* Información básica */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Información Básica</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <Badge variant={statusInfo.variant} className="mt-1">
              {statusInfo.label}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rol</p>
            <Badge variant="outline" className="mt-1">
              {user.role}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-sm font-medium mt-1 flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              {user.email}
            </p>
          </div>
          {user.phoneEnc && (
            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="text-sm font-medium mt-1 flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                {user.phoneEnc}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Fecha de Creación</p>
            <p className="text-sm font-medium mt-1">
              {format(new Date(user.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Última Actualización</p>
            <p className="text-sm font-medium mt-1">
              {format(new Date(user.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
            </p>
          </div>
        </div>
      </Card>

      {/* Información del Tenant */}
      {user.tenant && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Tenant Asociado</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="text-sm font-medium mt-1">{user.tenant.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <Badge variant="outline" className="mt-1">
                {user.tenant.type}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado del Tenant</p>
              <Badge variant="outline" className="mt-1">
                {user.tenant.status}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Seguridad */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Seguridad</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">MFA Habilitado</p>
            <p className="text-sm font-medium mt-1">
              {user.mfaEnabled ? 'Sí' : 'No'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

