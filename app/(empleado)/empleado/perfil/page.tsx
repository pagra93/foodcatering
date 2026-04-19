/**
 * Perfil del Empleado
 * Vista simple de datos personales y estadísticas
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { getEmployeeProfile, getEmployeeMonthlyHistory } from '@/lib/db/queries/empleado-perfil'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileInfo } from '@/components/empleado/perfil/ProfileInfo'
import { ProfileStats } from '@/components/empleado/perfil/ProfileStats'
import { ProfileSettings } from '@/components/empleado/perfil/ProfileSettings'
import { PrivacySection } from '@/components/empleado/perfil/PrivacySection'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// Server Component - Datos
// ============================================================================

async function ProfileData() {
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

  const [profile, monthlyHistory, gdprRequests] = await Promise.all([
    getEmployeeProfile(employee.id),
    getEmployeeMonthlyHistory(employee.id, 6),
    prisma.gdprRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
      },
    }),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-1">
          Información personal y estadísticas de uso
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <ProfileInfo data={profile} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <ProfileStats data={profile} monthlyHistory={monthlyHistory} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ProfileSettings employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <PrivacySection userId={session.user.id} existing={gdprRequests} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function ProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

// ============================================================================
// Main Page Export
// ============================================================================

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileData />
    </Suspense>
  )
}

