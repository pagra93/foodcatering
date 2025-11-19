import { Suspense } from 'react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { EmpresaSidebar } from '@/components/empresa/EmpresaSidebar'
import { EmpresaNavbar } from '@/components/empresa/EmpresaNavbar'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Layout principal del portal de empresa
 * Incluye sidebar, navbar y área de contenido
 */
export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getRequiredSession()
  const tenant = await getCurrentTenant()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar fijo a la izquierda */}
      <EmpresaSidebar tenant={tenant} user={session.user} />

      {/* Contenedor principal (con margen para el sidebar) */}
      <div className="lg:pl-64">
        {/* Navbar superior */}
        <EmpresaNavbar tenant={tenant} user={session.user} />

        {/* Contenido principal */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<ContentSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

