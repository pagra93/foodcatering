import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllRetentionPolicies } from '@/lib/db/queries/admin-retention'
import { RetentionPoliciesTable } from '@/components/admin/compliance/retention/RetentionPoliciesTable'

export default async function RetentionPage() {
  const policies = await getAllRetentionPolicies()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/compliance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Compliance
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Retención de Datos</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Política de retención por entidad. Los defaults parten de la
          normativa española: 5 años para datos fiscales, 4 años para
          snapshots IRPF, 1 año para usuarios dados de baja. RGPD exige
          minimización: no guardar más de lo necesario.
        </p>
      </div>

      <RetentionPoliciesTable policies={policies} />
    </div>
  )
}
