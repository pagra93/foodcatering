/**
 * Layout para páginas de autenticación
 * Simple, sin navegación, enfocado en el formulario
 */

import { type Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autenticación | Comidas',
  description: 'Accede a tu portal de Comidas',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

