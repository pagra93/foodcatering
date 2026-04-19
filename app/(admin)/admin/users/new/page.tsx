import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db/prisma'
import { NewUserForm } from '@/components/admin/users/NewUserForm'

export default async function NewUserPage() {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    select: { id: true, name: true, subdomain: true, type: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

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
        <h1 className="text-2xl font-bold">Nuevo Usuario</h1>
        <p className="mt-1 text-sm text-gray-500">
          Normalmente se usa para crear miembros del equipo SinTupper
          (SUPER_ADMIN, AUDITOR). Para usuarios de empresa o catering,
          prefiere sus portales o impersonación.
        </p>
      </div>

      <NewUserForm tenants={tenants} />
    </div>
  )
}
