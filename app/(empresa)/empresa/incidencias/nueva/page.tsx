import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/auth/get-tenant'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { NewIncidentForm } from '@/components/empresa/incidencias/NewIncidentForm'

// ============================================================================
// Página de Nueva Incidencia
// ============================================================================

export default async function NuevaIncidenciaPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const tenant = await getTenant()
  if (!tenant || tenant.type !== 'EMPRESA') {
    redirect('/unauthorized')
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/empresa/incidencias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Incidencias
          </Link>
        </Button>
      </div>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Nueva Incidencia</h1>
        <Card className="p-6">
          <NewIncidentForm />
        </Card>
      </div>
    </div>
  )
}

