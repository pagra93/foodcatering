/**
 * Layout para páginas de autenticación
 * Simple, sin navegación, enfocado en el formulario
 */

import { type Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acceso · Plati',
  description: 'Accede a tu portal de Plati',
}

// /mantenimiento consulta maintenanceWindow en BD; el resto de páginas auth
// también leen sesión. No prerenderizar en build.
export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

