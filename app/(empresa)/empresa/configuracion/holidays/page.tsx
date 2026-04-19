import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db/prisma'
import { TenantHolidaysManager } from '@/components/shared/catalogs/TenantHolidaysManager'

export default async function EmpresaHolidaysPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantId = session.user.tenantId

  const [officials, tenantHolidays, overrides] = await Promise.all([
    prisma.holiday.findMany({
      where: { scope: { in: ['NATIONAL', 'REGION'] } },
      orderBy: { date: 'asc' },
    }),
    prisma.holiday.findMany({
      where: { scope: 'TENANT', tenantId },
      orderBy: { date: 'asc' },
    }),
    prisma.holidayOverride.findMany({ where: { tenantId } }),
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
        <h1 className="text-2xl font-bold">Festivos de la empresa</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Los festivos excluyen días del cómputo fiscal IRPF (el beneficio de
          comida solo cuenta en días hábiles). Si tu empresa opera en festivos
          (24/7, turnos rotatorios) puedes desactivar los que no apliquen y
          añadir los específicos de tu convenio.
        </p>
      </div>

      <TenantHolidaysManager
        officials={officials}
        tenantHolidays={tenantHolidays}
        overrides={overrides}
      />
    </div>
  )
}
