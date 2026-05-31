import { type Metadata } from 'next'
import { Suspense } from 'react'

import { CTABanner } from '@/components/marketing/CTABanner'
import { IRPFCalculator } from '@/components/marketing/IRPFCalculator'
import { SectionHeader } from '@/components/marketing/SectionHeader'

export const metadata: Metadata = {
  title: 'Calculadora de ahorro IRPF',
  description:
    'Calcula en 30 segundos el ahorro fiscal de tu plantilla con el Art. 42.3 LIRPF. Estimación orientativa por número de empleados, días laborables y copay.',
  alternates: { canonical: '/calculadora' },
  openGraph: {
    title: 'Calculadora IRPF · Plati',
    description:
      'Estimación de ahorro fiscal en comida como beneficio en especie. Compartible por URL.',
    type: 'website',
    locale: 'es_ES',
  },
}

export default function CalculadoraPage() {
  return (
    <>
      <section className="container mx-auto px-4 pb-8 pt-16 md:pt-24">
        <SectionHeader
          eyebrow="Calculadora"
          title="Calcula tu ahorro fiscal en 30 segundos"
          subtitle="Ajusta los parámetros a tu caso real. Comparte el enlace con tu equipo o úsalo para pedirnos una propuesta concreta."
        />
      </section>

      <section className="container mx-auto px-4 pb-20 md:pb-28">
        <Suspense fallback={<CalculatorSkeleton />}>
          <IRPFCalculator variant="full" syncWithUrl id="calculadora" />
        </Suspense>
      </section>

      <section
        className="container mx-auto px-4 pb-20 md:pb-28"
        aria-labelledby="calc-how-heading"
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2
            id="calc-how-heading"
            className="text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            Cómo se calcula
          </h2>
          <dl className="mt-6 space-y-5 text-sm text-muted-foreground md:text-base">
            <div>
              <dt className="font-semibold text-foreground">
                Coste anual de empresa
              </dt>
              <dd className="mt-1 leading-relaxed">
                empleados × días/mes × aportación empresa/día × 11 meses
                (descontamos 1 mes de vacaciones).
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Base imponible anual ahorrada
              </dt>
              <dd className="mt-1 leading-relaxed">
                min(aportación/día, 11 €) × días/mes × 11 × empleados. La
                aportación por encima de 11 € al día tributa como rendimiento
                en especie.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Ahorro fiscal del empleado
              </dt>
              <dd className="mt-1 leading-relaxed">
                base imponible ahorrada × tipo marginal IRPF. El tipo medio en
                España (2024) ronda el 30 %; ajústalo al perfil salarial real
                de tu plantilla.
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
            Nota legal: los cálculos son estimaciones orientativas basadas en
            el Art. 42.3 LIRPF (Ley 35/2006). No constituyen asesoramiento
            fiscal. Consulta con tu asesor antes de diseñar la política.
          </p>
        </div>
      </section>

      <CTABanner
        title="¿Quieres que lo aterricemos en tu empresa?"
        subtitle="Reserva una demo de 20 minutos y te pasamos la propuesta adaptada a los valores que acabas de introducir."
        primary={{ label: 'Solicitar propuesta', href: '/demo' }}
        secondary={{ label: 'Ver precios', href: '/precios' }}
      />
    </>
  )
}

function CalculatorSkeleton() {
  return (
    <div
      className="mx-auto h-[520px] w-full animate-pulse rounded-3xl border border-border bg-muted/40"
      aria-hidden="true"
    />
  )
}
