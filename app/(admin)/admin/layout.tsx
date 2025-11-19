/**
 * Layout para el Portal de Súper Admin
 * Requiere autenticación y rol SUPER_ADMIN
 */

import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
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

  // Verificar que sea super admin
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized')
  }

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Impersonation Banner (si está activo) */}
        <ImpersonationBanner />

        {/* Sidebar */}
        <AdminSidebar />

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

