/**
 * Layout para el Portal de Súper Admin
 * Requiere autenticación y rol SUPER_ADMIN
 */

import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import { getRoleCategory } from '@/lib/auth/permissions'

// Portal multi-tenant con datos por sesión: nunca se prerenderiza en build.
export const dynamic = 'force-dynamic'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminNavbar } from '@/components/admin/AdminNavbar'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'
import { Toaster } from '@/components/ui/sonner'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getRequiredSession()

  // El portal admin es para el equipo Plati (categoría ROOT: super admin,
  // auditor y roles ROOT personalizados). Lo que ve/usa cada rol dentro se
  // controla por permisos (sidebar filtrado + requirePermission por sección).
  if (getRoleCategory(session.user.role) !== 'ROOT') {
    redirect('/unauthorized')
  }

  // El super admin siempre ve todo el menú, aunque su JWT sea anterior a la
  // resolución de permisos (se actualiza del todo al volver a iniciar sesión).
  const permissions =
    session.user.role === 'SUPER_ADMIN'
      ? ['*']
      : session.user.permissions ?? []

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Impersonation Banner (si está activo) */}
        <ImpersonationBanner />

        {/* Sidebar */}
        <AdminSidebar permissions={permissions} />

        {/* Navbar */}
        <AdminNavbar />

        {/* Main Content */}
        <main className="ml-64 pt-16">
          {/* Breadcrumbs */}
          <div className="border-b border-gray-100 bg-white px-8 py-4">
            <AdminBreadcrumbs />
          </div>

          {/* Page Content - fondo blanco puro */}
          <div className="bg-white p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </>
  )
}

