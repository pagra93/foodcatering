import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Session } from 'next-auth'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getEmpresaManagementUsers,
  getEmpresaUsersKPIs,
} from '@/lib/db/queries/empresa-usuarios'
import { ManagementUsersTable } from '@/components/empresa/configuracion/usuarios/ManagementUsersTable'

export default async function EmpresaUsuariosPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')

  const tenantId = session.user.tenantId
  const currentUserId = session.user.id

  const [{ users }, kpis] = await Promise.all([
    getEmpresaManagementUsers(tenantId),
    getEmpresaUsersKPIs(tenantId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/empresa/configuracion">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Configuración
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Usuarios de Gestión</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Administra los usuarios de tu empresa con roles de gestión:
          ADMIN_EMPRESA, RRHH, FINANZAS, MANAGER_SEDE. Los{' '}
          <strong>empleados</strong> se gestionan en{' '}
          <Link href="/empresa/empleados" className="text-blue-600 hover:underline">
            /empresa/empleados
          </Link>
          .
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total gestión</p>
          <p className="mt-1 text-2xl font-bold">{kpis.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">
            {kpis.admins}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">RRHH</p>
          <p className="mt-1 text-2xl font-bold">{kpis.rrhh}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Finanzas</p>
          <p className="mt-1 text-2xl font-bold">{kpis.finanzas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Managers sede</p>
          <p className="mt-1 text-2xl font-bold">{kpis.managers}</p>
        </Card>
      </div>

      <ManagementUsersTable
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          nameEnc: u.nameEnc,
          phoneEnc: u.phoneEnc,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
        }))}
        currentUserId={currentUserId}
      />
    </div>
  )
}
