import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Props = {
  params: {
    id: string
  }
}

/**
 * Página de edición de usuario (Super Admin)
 */
export default async function EditUserPage({ params }: Props) {
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
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/users/${user.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Editar Usuario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Editando: {user.nameEnc} ({user.email})
        </p>
      </div>

      {/* Formulario */}
      <Card className="p-6 max-w-2xl">
        <p className="text-sm text-gray-500">
          Funcionalidad de edición de usuarios en desarrollo.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Por ahora, puedes editar usuarios desde:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
          <li>Portal Empresa → Empleados (para empleados)</li>
          <li>Base de datos directamente (para administradores)</li>
        </ul>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Información actual:</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">Nombre:</span> {user.nameEnc}</p>
            <p><span className="text-gray-500">Email:</span> {user.email}</p>
            <p><span className="text-gray-500">Rol:</span> {user.role}</p>
            <p><span className="text-gray-500">Estado:</span> {user.status}</p>
            {user.tenant && (
              <p><span className="text-gray-500">Tenant:</span> {user.tenant.name} ({user.tenant.type})</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

