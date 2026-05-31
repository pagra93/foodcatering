import { type Metadata } from 'next'
import { Database, Lock, KeyRound, Layers } from 'lucide-react'

import { CTABanner } from '@/components/marketing/CTABanner'
import { Hero } from '@/components/marketing/Hero'
import { JsonLd } from '@/components/marketing/JsonLd'
import { ProductPortalTabs } from '@/components/marketing/ProductPortalTabs'
import { SectionHeader } from '@/components/marketing/SectionHeader'
import { softwareApplicationSchema } from '@/lib/landing/jsonld'

export const metadata: Metadata = {
  title: 'Producto — un SaaS, tres portales',
  description:
    'Plati se compone de tres portales conectados: empresa (RRHH/CFO), empleado (selector semanal) y catering (KDS, rutas, facturación).',
  alternates: { canonical: '/producto' },
  openGraph: {
    title: 'Plati — un producto, tres portales',
    description:
      'Portal empresa, empleado y catering. Un solo dato, una sola trazabilidad.',
    type: 'website',
    locale: 'es_ES',
  },
}

const integrations = [
  {
    id: 'sap',
    icon: Database,
    title: 'SAP · Sage · A3',
    description:
      'Export CSV con el formato exacto que tu ERP espera. Sin manipulación manual.',
  },
  {
    id: 'sso',
    icon: KeyRound,
    title: 'SSO (SAML / OIDC)',
    description:
      'Acceso unificado con tu proveedor de identidad. Disponible en plan Enterprise.',
  },
  {
    id: 'scim',
    icon: Layers,
    title: 'SCIM provisioning',
    description:
      'Alta y baja automática de empleados desde tu IdP. Disponible en plan Enterprise.',
  },
  {
    id: 'pii',
    icon: Lock,
    title: 'Cifrado PII AES-256-GCM',
    description:
      'Alergias, emails y datos sensibles cifrados en reposo. DPA firmado, servidores UE.',
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
            Un SaaS, <span className="text-primary">tres portales</span>.
            <br />
            Una sola trazabilidad.
          </>
        }
        subtitle="Empresa, empleado y catering viven del mismo dato. Lo que se pide, se cocina, se entrega, se factura y se audita — sin re-teclear, sin hojas de cálculo paralelas."
        primaryCta={{ label: 'Solicitar demo', href: '/demo' }}
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
          title="Encaja con tu stack actual"
          subtitle="ERPs, IdPs, cifrado y cumplimiento — resueltos de serie."
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
        primary={{ label: 'Solicitar demo', href: '/demo' }}
        secondary={{ label: 'Ver precios', href: '/precios' }}
      />
    </>
  )
}
