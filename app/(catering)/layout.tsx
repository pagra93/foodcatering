/**
 * Layout del Portal del Catering
 * 
 * Este layout envuelve todas las páginas del catering y proporciona:
 * - Navegación (Navbar + Sidebar)
 * - Breadcrumbs
 * - ImpersonationBanner support
 * - Protección por rol (solo roles de catering)
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function CateringLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Si no hay sesión, redirigir a login
  if (!session) {
    redirect('/login')
  }

  // Validar que el usuario tiene un rol de catering
  const cateringRoles = [
    'ADMIN_CATERING',
    'CHEF',
    'COCINERO',
    'REPARTIDOR',
    'FINANZAS_CATERING',
  ]

  if (!cateringRoles.includes(session.user.role)) {
    redirect('/unauthorized')
  }

  // Validar que el tenant es de tipo CATERING
  if (session.user.tenantType !== 'CATERING') {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}

