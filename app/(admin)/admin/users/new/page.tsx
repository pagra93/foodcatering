import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Página para crear nuevo usuario (Super Admin)
 */
export default async function NewUserPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  // Solo SUPER_ADMIN puede acceder
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized')
  }

  // Obtener todos los tenants para el selector
  const tenants = await prisma.tenant.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Usuarios
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nuevo Usuario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Crea un nuevo usuario en el sistema
        </p>
      </div>

      {/* Formulario */}
      <Card className="p-6 max-w-2xl">
        <p className="text-sm text-gray-500">
          Funcionalidad de creación de usuarios en desarrollo.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Por ahora, los usuarios se crean desde:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
          <li>Portal Empresa → Empleados (para empleados)</li>
          <li>Seed script (para administradores)</li>
        </ul>
      </Card>
    </div>
  )
}

