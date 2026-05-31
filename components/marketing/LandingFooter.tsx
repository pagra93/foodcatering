import Link from 'next/link'
import { PlatiLogo } from '@/components/marketing/PlatiLogo'

interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Cómo funciona', href: '/#como' },
      { label: 'Por qué Plati', href: '/#porque' },
      { label: 'El menú', href: '/#menu' },
      { label: 'Precios', href: '/precios' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Para empresas', href: '/' },
      { label: 'Para caterings', href: '/caterings' },
      { label: 'Calculadora', href: '/calculadora' },
      { label: 'Pedir demo', href: '/demo' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'El menú y la ley', href: '/compliance' },
      { label: 'El producto', href: '/producto' },
      { label: 'Entrar', href: '/login' },
      { label: 'Para máquinas', href: '/md/home' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Términos', href: '/terminos' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-hueso-warm">
      <div className="mx-auto max-w-plati px-[5vw] py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="Plati — inicio">
              <PlatiLogo />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Comer juntos es cultura<span className="plati-dot" />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              El menú de hoy, cocinado hoy por un catering local, en tu oficina.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-semibold">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-tomate"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Plati. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
