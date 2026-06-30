import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db/prisma'
import { IncidentReasonsManager } from '@/components/admin/catalogs/IncidentReasonsManager'

export default async function AdminIncidentReasonsPage() {
  const reasons = await prisma.incidentReason.findMany({
    where: { scope: 'SYSTEM' },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/quality">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Calidad y SLAs
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Motivos de incidencia</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Catálogo global de motivos que empleados y caterings ven al reportar
          incidencias. La severidad alimenta los SLAs; la flag de compensación
          automatiza el flujo de reembolso/abono.
        </p>
      </div>

      <IncidentReasonsManager reasons={reasons} />
    </div>
  )
}
