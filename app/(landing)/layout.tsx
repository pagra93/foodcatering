import { type Metadata } from 'next'

import { LandingFooter } from '@/components/marketing/LandingFooter'
import { LandingNavbar } from '@/components/marketing/LandingNavbar'

export const metadata: Metadata = {
  title: {
    default: 'Plati — El menú del día, en tu oficina',
    template: '%s · Plati',
  },
  description:
    'Plati conecta tu empresa con caterings locales para llevar el menú del día, cocinado hoy, a la oficina. Comer juntos es cultura.',
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <LandingNavbar />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  )
}
