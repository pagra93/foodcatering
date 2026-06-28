import { type Metadata } from 'next'
import { Database, Lock, KeyRound, Layers } from 'lucide-react'

import { CTABanner } from '@/components/marketing/CTABanner'
import { Hero } from '@/components/marketing/Hero'
import { JsonLd } from '@/components/marketing/JsonLd'
import { ProductPortalTabs } from '@/components/marketing/ProductPortalTabs'
import { SectionHeader } from '@/components/marketing/SectionHeader'
import { softwareApplicationSchema } from '@/lib/landing/jsonld'

export const metadata: Metadata = {
  title: 'Producto — una herramienta, tres portales',
  description:
    'Plati conecta tres portales: empresa (RRHH y finanzas), empleado (elige su menú) y catering (cocina, reparto y factura). Todos trabajan sobre la misma información.',
  alternates: { canonical: '/producto' },
  openGraph: {
    title: 'Plati — una herramienta, tres formas de usarla',
    description:
      'Empresa, empleado y catering sobre la misma información. Sin correos cruzados ni hojas de cálculo.',
    type: 'website',
    locale: 'es_ES',
  },
}

const integrations = [
  {
    id: 'sap',
    icon: Database,
    title: 'Tu programa de contabilidad',
    description:
      'Exporta los datos a SAP, Sage o A3 en su formato exacto. Sin copiar y pegar a mano.',
  },
  {
    id: 'sso',
    icon: KeyRound,
    title: 'Un solo acceso para tu equipo',
    description:
      'Tus empleados entran con el mismo usuario de la empresa, sin otra contraseña que recordar. (Inicio de sesión único, en plan Enterprise.)',
  },
  {
    id: 'scim',
    icon: Layers,
    title: 'Altas y bajas automáticas',
    description:
      'Cuando alguien entra o sale de tu empresa, su acceso a Plati se actualiza solo. (Sincronización con tu sistema de personal, en plan Enterprise.)',
  },
  {
    id: 'pii',
    icon: Lock,
    title: 'Datos sensibles, bien guardados',
    description:
      'Alergias, emails y datos personales cifrados y alojados en la UE, con contrato de protección de datos firmado.',
  },
]

export default function ProductoPage() {
  return (
    <>
      <JsonLd id="ld-producto" data={softwareApplicationSchema()} />
      <Hero
        eyebrow="Producto"
        title={
          <>
            Una herramienta.
            <br />
            <span className="text-primary">Tres formas de usarla.</span>
          </>
        }
        subtitle="Empresa, empleado y catering trabajan sobre la misma información. Lo que se pide, se cocina, se entrega y se factura solo — sin correos cruzados ni hojas de cálculo paralelas."
        primaryCta={{ label: 'Pedir demo', href: '/demo' }}
        secondaryCta={{ label: 'Ver precios', href: '/precios' }}
        alignment="center"
      />

      <section
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="portals-heading"
      >
        <SectionHeader
          eyebrow="Portales"
          title="Cada rol, su propia vista"
          subtitle="Diseñados para que cada persona encuentre lo que necesita en menos de 10 segundos."
        />
        <div className="mt-14">
          <ProductPortalTabs />
        </div>
      </section>

      <section
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="integrations-heading"
      >
        <SectionHeader
          eyebrow="Integraciones"
          title="Funciona con lo que ya usas"
          subtitle="Tu programa de contabilidad, el acceso de tu empresa y la seguridad de los datos — ya resueltos."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {integrations.map((item) => (
            <article
              key={item.id}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-6"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <CTABanner
        title="Ve el producto con tus propios datos"
        subtitle="Reserva una demo de 20 minutos y te lo enseñamos sobre un caso parecido al tuyo."
        primary={{ label: 'Pedir demo', href: '/demo' }}
        secondary={{ label: 'Ver precios', href: '/precios' }}
      />
    </>
  )
}
