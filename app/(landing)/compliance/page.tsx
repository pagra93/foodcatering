import { type Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, ExternalLink, Shield } from 'lucide-react'

import { CTABanner } from '@/components/marketing/CTABanner'
import { ComplianceEvidence } from '@/components/marketing/ComplianceEvidence'
import { Hero } from '@/components/marketing/Hero'
import { JsonLd } from '@/components/marketing/JsonLd'
import { SectionHeader } from '@/components/marketing/SectionHeader'
import { complianceEvidence } from '@/lib/landing/content'
import { breadcrumbSchema } from '@/lib/landing/jsonld'

export const metadata: Metadata = {
  title: 'Compliance fiscal Art. 42.3 LIRPF',
  description:
    'Toda la evidencia de la exención IRPF por comida en el trabajo, guardada sola: quién comió, prueba de entrega, registro inalterable e informe mensual listo para tu asesor.',
  alternates: { canonical: '/compliance' },
  openGraph: {
    title: 'Compliance fiscal · Plati',
    description:
      'Auditable por Hacienda, defendible en inspección. Evidencia criptográfica y dossier mensual.',
    type: 'website',
    locale: 'es_ES',
  },
}

export default function CompliancePage() {
  return (
    <>
      <JsonLd
        id="ld-compliance"
        data={breadcrumbSchema([
          { name: 'Inicio', path: '/' },
          { name: 'Compliance', path: '/compliance' },
        ])}
      />
      <Hero
        eyebrow="Compliance fiscal"
        title={
          <>
            Auditable por Hacienda.
            <br />
            <span className="text-primary">Defendible</span> en inspección.
          </>
        }
        subtitle="Plati guarda automáticamente todo lo que Hacienda puede pedirte: quién comió, qué comió, cuándo se entregó y cuánto costó. Cada mes tienes el informe listo para tu asesor."
        primaryCta={{ label: 'Pedir demo', href: '/demo' }}
        secondaryCta={{ label: 'Ver calculadora', href: '/calculadora' }}
        alignment="center"
      />

      <section className="container mx-auto px-4 pb-4 pt-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-sm text-foreground leading-relaxed md:text-base">
            <strong className="font-semibold">TL;DR.</strong> El Art. 42.3 de
            la LIRPF exime las entregas en especie de comida en el puesto de
            trabajo hasta <strong>11 € por día laborable y empleado</strong>.
            Para aplicar la exención necesitas evidencia: quién comió, qué
            comió, cuándo y cuánto costó. Eso es exactamente lo que Plati
            registra, firma y archiva cada día.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="evidence-heading"
      >
        <SectionHeader
          eyebrow="Evidencia"
          title="Las 6 piezas que Hacienda quiere ver"
          subtitle="Cada pedido genera un rastro auditable que demuestra que el gasto se destinó efectivamente a comida del empleado durante la jornada laboral."
        />
        <div className="mt-14">
          <ComplianceEvidence items={complianceEvidence} />
        </div>
      </section>

      <section
        id="ley"
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="ley-heading"
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 md:p-10">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <BookOpen className="h-5 w-5" />
            </span>
            <h2
              id="ley-heading"
              className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
            >
              Art. 42.3 LIRPF — texto literal
            </h2>
          </div>
          <blockquote className="mt-6 border-l-4 border-primary/40 pl-5 italic text-muted-foreground leading-relaxed md:text-lg">
            &ldquo;No tendrán la consideración de rendimientos del trabajo en
            especie las entregas a empleados de productos a precios rebajados
            que se realicen en comedores de empresa o economatos de carácter
            social, incluidas las fórmulas indirectas de prestación del
            servicio, cuando la cuantía no supere{' '}
            <strong className="not-italic text-foreground">
              11 euros diarios
            </strong>{' '}
            por trabajador y día laborable.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            Ley 35/2006, de 28 de noviembre, del Impuesto sobre la Renta de
            las Personas Físicas. Artículo 42, apartado 3.
          </p>
          <Link
            href="https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ver el texto completo en BOE
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="flow-heading"
      >
        <SectionHeader
          eyebrow="Flujo de evidencia"
          title="De la selección al dossier, en 5 pasos"
        />
        <ol className="mx-auto mt-14 max-w-3xl space-y-4">
          {[
            {
              step: 1,
              title: 'Selección del empleado',
              text: 'El empleado elige su menú desde el portal. Queda registrado con timestamp y usuario identificado.',
            },
            {
              step: 2,
              title: 'Cierre y consolidación',
              text: 'A las 11:05 la lista del día se cierra. El catering recibe el consolidado con cantidades por plato.',
            },
            {
              step: 3,
              title: 'Entrega verificada',
              text: 'El reparto confirma la entrega en sede con foto, firma y geolocalización. Timestamp de recepción.',
            },
            {
              step: 4,
              title: 'Factura desglosada',
              text: 'El día 1 del mes se genera la factura del catering, con una línea por pedido enlazada al empleado receptor.',
            },
            {
              step: 5,
              title: 'Informe y respaldo',
              text: 'Cada día se guarda una copia firmada e inalterable de los pedidos y entregas. Cada mes se emite el informe en PDF, listo para tu asesor.',
            },
          ].map((s) => (
            <li
              key={s.step}
              className="flex gap-5 rounded-xl border border-border bg-card p-5"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary"
              >
                {s.step}
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed text-pretty">
                  {s.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="rgpd"
        className="container mx-auto px-4 py-20 md:py-28"
        aria-labelledby="rgpd-heading"
      >
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1.2fr]">
          <div>
            <span
              aria-hidden="true"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            >
              <Shield className="h-6 w-6" />
            </span>
            <h2
              id="rgpd-heading"
              className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl text-balance"
            >
              RGPD y protección de datos de serie
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg text-pretty">
              La evidencia fiscal incluye datos personales sensibles (alergias,
              preferencias, consumo). La tratamos con el cuidado que merecen.
            </p>
          </div>
          <ul className="space-y-4 text-sm md:text-base">
            {[
              'Datos personales (email, alergias, preferencias) cifrados en nuestros servidores.',
              'Firmamos el contrato de protección de datos (DPA) antes de empezar.',
              'Servidores en la UE, con copias de seguridad cifradas cada día.',
              'Tú decides cuánto se conservan; portabilidad y borrado a petición.',
              'Cada consulta a un dato personal queda registrada.',
              'El registro firmado no guarda datos personales, solo referencias.',
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span
                  aria-hidden="true"
                  className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-primary"
                />
                <span className="text-foreground leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CTABanner
        title="Prepárate para tu próxima inspección con tranquilidad"
        subtitle="Te enseñamos un dossier fiscal ejemplo en 20 minutos. Sin compromiso."
        primary={{ label: 'Pedir demo', href: '/demo' }}
        secondary={{ label: 'Calcular mi ahorro', href: '/calculadora' }}
      />
    </>
  )
}
