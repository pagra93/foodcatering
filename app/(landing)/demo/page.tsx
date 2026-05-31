import { type Metadata } from 'next'
import { Suspense } from 'react'
import { Calculator, FileCheck2, Sparkles } from 'lucide-react'

import { DemoForm } from '@/components/marketing/DemoForm'
import { SectionHeader } from '@/components/marketing/SectionHeader'

export const metadata: Metadata = {
  title: 'Solicita una demo',
  description:
    'Reserva 20 minutos con Plati. Te enseñamos el producto aplicado a tu caso real con calculadora fiscal y dossier ejemplo.',
  alternates: { canonical: '/demo' },
  openGraph: {
    title: 'Solicita una demo · Plati',
    description:
      'Demo de 20 minutos con calculadora y dossier ejemplo a tu caso real.',
    type: 'website',
    locale: 'es_ES',
  },
}

const benefits = [
  {
    id: 'calc',
    icon: Calculator,
    title: 'Calculadora aplicada a tu caso',
    description:
      'Te enseñamos el ahorro fiscal con los datos reales de tu plantilla, no con un simulador genérico.',
  },
  {
    id: 'dossier',
    icon: FileCheck2,
    title: 'Dossier fiscal de ejemplo',
    description:
      'Verás el PDF con ratio de deductibilidad, snapshot SHA-256 y evidencia por empleado.',
  },
  {
    id: 'plan',
    icon: Sparkles,
    title: 'Plan de implantación propuesto',
    description:
      'Cómo pasaríamos tu empresa a operar con Plati en semanas, con hitos y responsables.',
  },
]

export default function DemoPage() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <SectionHeader
        eyebrow="Demo"
        title="Reserva 20 minutos con nosotros"
        subtitle="Rellena el formulario y te contactamos en menos de 24 horas laborables con una propuesta de agenda."
      />

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="h-[640px] animate-pulse rounded-2xl bg-muted/40"
              />
            }
          >
            <DemoForm />
          </Suspense>
        </div>

        <aside aria-labelledby="benefits-heading">
          <h2
            id="benefits-heading"
            className="text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            Lo que verás en esa demo
          </h2>
          <ul className="mt-6 space-y-4">
            {benefits.map((b) => (
              <li
                key={b.id}
                className="flex gap-4 rounded-2xl border border-border bg-muted/30 p-5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <b.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground md:text-base">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed text-pretty">
                    {b.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground leading-relaxed">
            ¿Prefieres hablar por email? Escríbenos a{' '}
            <a
              href="mailto:hola@plati.es"
              className="font-semibold text-primary hover:underline"
            >
              hola@plati.es
            </a>{' '}
            con tu empresa, nº de empleados y el horario que te conviene.
          </p>
        </aside>
      </div>
    </section>
  )
}
