import Link from 'next/link'
import { ArrowRight, Utensils } from 'lucide-react'

import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'

type Props = {
  className?: string
}

export function CateringTeaser({ className }: Props) {
  return (
    <section
      className={cn('container mx-auto px-4 py-16 md:py-20', className)}
      aria-labelledby="catering-teaser-heading"
    >
      <AnimatedOnView>
        <Link
          href="/caterings"
          className="group relative block overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-12 hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_right,hsl(var(--primary)/0.10),transparent_65%)]"
          />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <Utensils className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  ¿Eres operador de catering?
                </p>
                <h2
                  id="catering-teaser-heading"
                  className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl text-balance"
                >
                  Únete a nuestra red B2B y llena tu cocina con pedidos
                  recurrentes.
                </h2>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base text-pretty">
                  Lista cerrada a las 11:05, KDS en tablet, rutas optimizadas
                  y factura automática el día 1. Tú cocinas; del papeleo nos
                  encargamos nosotros.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform group-hover:translate-x-1">
              Ver propuesta para caterings
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </AnimatedOnView>
    </section>
  )
}
