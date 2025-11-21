/**
 * Selector de Menú por Día
 * Permite elegir 1º, 2º y Postre
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { getDayMenuForEmployee } from '@/lib/db/queries/empleado-menus'
import { DaySelector } from '@/components/empleado/menus/DaySelector'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type PageProps = {
  params: {
    date: string // YYYY-MM-DD
  }
}

// ============================================================================
// Server Component - Datos
// ============================================================================

async function DaySelectorData({ dateString }: { dateString: string }) {
  const session = await auth()
  const tenant = await getTenant()

  if (!session || !tenant.id) {
    redirect('/login')
  }

  // Buscar el empleado
  const { prisma } = await import('@/lib/db/prisma')
  const employee = await prisma.employee.findFirst({
    where: {
      userId: session.user.id,
      tenantId: tenant.id,
      status: 'ACTIVE',
    },
  })

  if (!employee) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No eres empleado</AlertTitle>
          <AlertDescription>
            No se encontró un perfil de empleado asociado a tu usuario.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Parsear fecha
  const date = new Date(dateString)

  const dayMenu = await getDayMenuForEmployee(employee.id, date)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Button */}
      <Link href="/empleado/menus">
        <Button variant="ghost" size="sm" className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver a la semana
        </Button>
      </Link>

      {/* Day Selector */}
      <DaySelector data={dayMenu} employeeId={employee.id} />
    </div>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function DaySelectorLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Skeleton className="h-10 w-32 mb-4" />
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-48 mb-6" />
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

// ============================================================================
// Main Page Export
// ============================================================================

export default function DayMenuPage({ params }: PageProps) {
  return (
    <Suspense fallback={<DaySelectorLoading />}>
      <DaySelectorData dateString={params.date} />
    </Suspense>
  )
}

