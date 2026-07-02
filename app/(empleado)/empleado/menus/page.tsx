/**
 * Vista Semanal de Menús - Dashboard Principal del Empleado
 * Mobile-first, visual y rápido
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { getWeekMenusForEmployee } from '@/lib/db/queries/empleado-menus'
import { getEmployeePendingRatings } from '@/lib/db/queries/ratings'
import { WeekView } from '@/components/empleado/menus/WeekView'
import { PendingRatingPrompt } from '@/components/empleado/rating/PendingRatingPrompt'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// Server Component - Datos
// ============================================================================

async function MenusData() {
  const session = await auth()
  const tenant = await getTenant()

  if (!session || !tenant.id) {
    redirect('/login')
  }

  // Buscar el empleado asociado al usuario
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
            No se encontró un perfil de empleado asociado a tu usuario. Contacta con RRHH.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const [weekMenus, pendingRatings] = await Promise.all([
    getWeekMenusForEmployee(employee.id),
    getEmployeePendingRatings(employee.id, 10),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {weekMenus.employee.name.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Selecciona tus comidas de la semana
        </p>
      </div>

      {/* Aviso proactivo: valora la comida de ayer */}
      {pendingRatings.length > 0 && (
        <div className="mb-6">
          <PendingRatingPrompt pending={pendingRatings} />
        </div>
      )}

      {/* Week View */}
      <WeekView data={weekMenus} />
    </div>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function MenusLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Page Export
// ============================================================================

export default function MenusPage() {
  return (
    <Suspense fallback={<MenusLoading />}>
      <MenusData />
    </Suspense>
  )
}

