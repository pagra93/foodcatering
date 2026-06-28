import { type Metadata } from 'next'

import { CTABanner } from '@/components/marketing/CTABanner'
import { ComparisonTable } from '@/components/marketing/ComparisonTable'
import { FAQ } from '@/components/marketing/FAQ'
import { Hero } from '@/components/marketing/Hero'
import { JsonLd } from '@/components/marketing/JsonLd'
import { PricingTable } from '@/components/marketing/PricingTable'
import { SectionHeader } from '@/components/marketing/SectionHeader'
import {
  comparisonMatrix,
  faqsPricing,
  pricingTiers,
} from '@/lib/landing/content'
import { faqSchema, productSchema } from '@/lib/landing/jsonld'

export const metadata: Metadata = {
  title: 'Precios',
  description:
    'Precios de Plati por empleado activo al mes: Starter, Growth y Enterprise. Comparativa con Cobee, Edenred y Ticket Restaurant.',
  alternates: { canonical: '/precios' },
  openGraph: {
    title: 'Precios · Plati',
    description:
      'Planes sencillos por empleado activo. Comparativa vs Cobee, Edenred y Ticket Restaurant.',
    type: 'website',
    locale: 'es_ES',
  },
}

export default function PreciosPage() {
  return (
    <>
      <JsonLd
        id="ld-precios"
        data={[productSchema(pricingTiers), faqSchema(faqsPricing)]}
      />
      <Hero
        eyebrow="Precios"
        title={
          <>
            Pagas solo por{' '}
            <span className="text-primary">quien come</span>.
          </>
        }
        subtitle="Sin cuota de alta, sin permanencia. Cada mes pagas solo por los empleados que de verdad han usado el beneficio — ni uno más."
        primaryCta={{ label: 'Pedir demo', href: '/demo' }}
        secondaryCta={{ label: 'Calcular ahorro', href: '/calculadora' }}
        alignment="center"
      />

      <section
        className="container mx-auto px-4 pb-20 md:pb-28"
        aria-labelledby="tiers-heading"
      >
        <h2 id="tiers-heading" className="sr-only">
          Planes
        </h2>
        <PricingTable tiers={pricingTiers} />
      </section>

      <section
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="comparison-heading"
      >
        <SectionHeader
          eyebrow="Comparativa"
          title="Plati vs ticket restaurante"
          subtitle="La diferencia no es el precio: es el tipo de beneficio que ofreces y la evidencia que genera."
        />
        <div className="mt-14 rounded-2xl border border-border bg-card">
          <ComparisonTable rows={comparisonMatrix} />
        </div>
        <p className="mt-6 text-xs text-muted-foreground text-center">
          Información basada en web pública de cada proveedor a fecha de
          publicación. Consulta con cada proveedor para confirmar cobertura
          exacta de funcionalidades.
        </p>
      </section>

      <section
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="faq-pricing-heading"
      >
        <SectionHeader
          eyebrow="Preguntas frecuentes"
          title="Dudas habituales sobre precio y contratación"
        />
        <div className="mt-12">
          <FAQ items={faqsPricing} />
        </div>
      </section>

      <CTABanner
        title="¿Listo para ver el plan aplicado a tu empresa?"
        subtitle="20 minutos de demo con calculadora y dossier ejemplo adaptados a tu plantilla."
        primary={{ label: 'Pedir demo', href: '/demo' }}
        secondary={{ label: 'Ver compliance', href: '/compliance' }}
      />
    </>
  )
}
