/**
 * Layout para la landing page (dominio principal)
 * Sin auth, diseño público y limpio
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comidas - Gestión de Menús Corporativos',
  description: 'Plataforma SaaS multi-tenant para gestionar el beneficio de comida diaria con compliance fiscal automático.',
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

