'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { PlatiLogo } from '@/components/marketing/PlatiLogo'

// Enlaces de la web de empresas (anclas a las secciones de la home + cross-link
// a la web de caterings), según `Imagen de Marca/Plati - Web.html`.
const NAV_LINKS = [
  { href: '/#como', label: 'Cómo funciona' },
  { href: '/#porque', label: 'Por qué Plati' },
  { href: '/#menu', label: 'El menú' },
  { href: '/caterings', label: 'Soy catering' },
]

export function LandingNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-[72px] max-w-plati items-center justify-between gap-4 px-[5vw]">
        <Link href="/" aria-label="Plati — inicio">
          <PlatiLogo />
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Principal"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-pill px-3 py-2 text-sm font-medium text-tinta/70 transition-colors hover:text-tomate"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTAs desktop */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm" className="rounded-pill">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="rounded-pill">
            <Link href="/demo">Pedir demo</Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild variant="outline" className="rounded-pill">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Entrar
                  </Link>
                </Button>
                <Button asChild className="rounded-pill">
                  <Link href="/demo" onClick={() => setOpen(false)}>
                    Pedir demo
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
