import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db/prisma'
import { OfficialHolidaysManager } from '@/components/admin/catalogs/OfficialHolidaysManager'

export default async function AdminCalendarsPage() {
  const holidays = await prisma.holiday.findMany({
    where: { scope: { in: ['NATIONAL', 'REGION'] } },
    orderBy: { date: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/catalogs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Catálogos
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Calendario de festivos</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Festivos nacionales (BOE) y regionales (DOGA/BOPV/…). Excluyen días
          del cómputo IRPF — precisión fiscal crítica. Empresas y caterings
          pueden desactivar individualmente los que no apliquen a su operativa.
        </p>
      </div>

      <OfficialHolidaysManager holidays={holidays} />
    </div>
  )
}
