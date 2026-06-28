import { type Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  MailX,
  PackageCheck,
  Tags,
  TrendingUp,
} from 'lucide-react'

import { AnimatedOnView } from '@/components/marketing/AnimatedOnView'
import { CateringDashboardMock } from '@/components/marketing/CateringDashboardMock'
import { JsonLd } from '@/components/marketing/JsonLd'
import { Button } from '@/components/ui/button'
import { faqSchema, howToSchema } from '@/lib/landing/jsonld'
import { faqsCatering, howItWorksCatering } from '@/lib/landing/content'

export const metadata: Metadata = {
  title: 'Llena tu cocina y digitaliza tu operativa',
  description:
    'Plati lleva tus menús a empresas de tu ciudad y digitaliza toda tu operativa: pedidos, recuento por plato, etiquetado y factura. Sin emails, sin Excel, sin recontar a mano.',
  alternates: { canonical: '/caterings' },
  openGraph: {
    title: 'Plati para caterings — Llena tu cocina y olvídate del papeleo',
    description:
      'Demanda recurrente de empresas de tu ciudad y el software para gestionarla: recuento automático, etiquetado y factura el día 1.',
    type: 'website',
    locale: 'es_ES',
  },
}

// El enemigo real del catering no es el delivery (no trabajan con él): es el
// caos manual de gestionar pedidos de empresa con email, WhatsApp y Excel.
const PAINS = [
  {
    stat: 'A mano',
    title: 'Pedidos por email y WhatsApp',
    body: 'Llegan sueltos, los apuntas en una hoja y recuentas cada plato a mano. Un cambio de última hora y vuelta a empezar.',
  },
  {
    stat: 'Fin de mes',
    title: 'Cuadrar a ciegas',
    body: 'Repasar qué se pidió, quién no pidió y montar la factura empresa por empresa. Horas que no estás cocinando.',
  },
  {
    stat: 'A ojo',
    title: 'Compras sin saber',
    body: 'Sin saber cuántos cubiertos saldrán mañana, compras de más o de menos. Y acabas tirando comida.',
  },
]

// Plati = software que digitaliza la operativa + demanda recurrente.
const TOOLS = [
  {
    icon: TrendingUp,
    title: 'Demanda recurrente',
    body: 'Empresas de tu ciudad que piden cada día, no pedidos sueltos. Planifica con semanas de antelación.',
  },
  {
    icon: ClipboardList,
    title: 'Recuento automático',
    body: 'El sistema suma los pedidos por plato: «38 cremas, 29 currys». Sin contar a mano, sin notas sueltas.',
  },
  {
    icon: PackageCheck,
    title: 'Previsión de compra',
    body: 'Con la demanda confirmada cada día, sabes exactamente qué comprar. Cero desperdicio.',
  },
  {
    icon: Tags,
    title: 'Etiquetado por persona',
    body: 'Cada menú sale con el nombre, la empresa y los alérgenos. Reparto ordenado, cero errores.',
  },
  {
    icon: FileText,
    title: 'Factura automática el día 1',
    body: 'Se genera sola, con una línea por pedido. Tú revisas y envías. Se acabó cuadrar a mano.',
  },
  {
    icon: MailX,
    title: 'Sin emails ni Excel',
    body: 'Los pedidos entran solos en tu panel. Adiós a la hoja de cálculo y al WhatsApp del mediodía.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Nos cuentas tu cocina',
    body: 'Capacidad, zona de reparto y tipo de menú que ofreces.',
  },
  {
    n: '02',
    title: 'Publicas tu menú',
    body: 'Subes tu carta semanal con primeros, segundos y postres.',
  },
  {
    n: '03',
    title: 'Recibes los pedidos',
    body: 'Tus empresas piden desde su portal. Tú los ves ya contados por plato, sin recontar nada.',
  },
  {
    n: '04',
    title: 'Cocinas y facturas',
    body: 'Cocinas lo justo y la factura se genera sola el día 1. Tú solo cocinas.',
  },
]

const TRUST_CHIPS = [
  'Sin permanencia',
  'Facturación directa',
  'Tus clientes son tuyos',
  'Datos en la UE',
]

export default function CateringsPage() {
  return (
    <>
      <JsonLd
        id="ld-caterings"
        data={[
          howToSchema({
            name: 'Cómo funciona Plati para el catering',
            steps: howItWorksCatering,
          }),
          faqSchema(faqsCatering),
        ]}
      />

      {/* HERO */}
      <section className="pt-16 md:pt-20">
        <div className="mx-auto max-w-plati px-[5vw]">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <AnimatedOnView>
              <p className="plati-eyebrow">Para caterings y cocinas locales</p>
              <h1 className="plati-display mt-4 text-[clamp(2.75rem,6vw,4.75rem)]">
                Llena tu cocina
                <br />
                entre semana<span className="plati-dot" />
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                Plati te trae empresas de tu ciudad que comen contigo cada día —
                y digitaliza toda tu operativa: pedidos, recuento por plato,
                etiquetado y factura. Sin emails, sin Excel, sin recontar a mano.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-pill">
                  <Link href="/demo?perfil=catering">
                    Empezar ahora
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-pill"
                >
                  <Link href="#tool">Ver la herramienta</Link>
                </Button>
              </div>
              <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground/80">
                <Check
                  className="h-4 w-4 flex-none text-hierba"
                  aria-hidden="true"
                />
                Facturación directa · sin permanencia · tus clientes son tuyos
              </p>
            </AnimatedOnView>

            <AnimatedOnView delay={0.1} className="relative">
              <div className="relative h-[360px] overflow-hidden rounded-[16px] md:h-[480px]">
                <Image
                  src="/landing/catering_plati.webp"
                  alt="Cocinero de un catering local preparando los menús del día"
                  fill
                  priority
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -left-4 bottom-7 rounded-[10px] bg-tinta px-5 py-4 text-hueso shadow-plati-2">
                <div className="font-display text-[17px] font-extrabold leading-tight">
                  Tu día, en una pantalla
                </div>
                <div className="text-xs opacity-70">
                  pedidos, recuento y factura
                </div>
              </div>
            </AnimatedOnView>
          </div>
        </div>
      </section>

      {/* PROBLEMA (panel oscuro) — el caos manual */}
      <section id="problema" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView>
            <div className="overflow-hidden rounded-[16px] bg-tinta text-hueso">
              <div className="px-[5vw] py-16">
                <div className="max-w-2xl">
                  <p className="plati-eyebrow">El problema</p>
                  <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)] text-hueso">
                    Tu cocina va sobre emails y hojas de cálculo
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-hueso/70">
                    Servir a empresas debería ser tu mejor negocio: pedidos fijos
                    cada día. Pero gestionarlo a mano se come tu mañana — y la
                    administración no la cobras.
                  </p>
                </div>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                  {PAINS.map((p) => (
                    <div
                      key={p.title}
                      className="rounded-[10px] border border-hueso/15 p-6"
                    >
                      <div className="font-display text-4xl font-extrabold text-yema">
                        {p.stat}
                      </div>
                      <h3 className="mt-3 font-display text-xl font-extrabold tracking-[-0.02em] text-hueso">
                        {p.title}
                      </h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-hueso/70">
                        {p.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedOnView>
        </div>
      </section>

      {/* TOOL */}
      <section id="tool" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">La herramienta</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              Toda tu operativa, en una pantalla
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Plati te trae la demanda y te da el software para gestionarla sin
              papeleo: lo que antes era una mañana de administración, ahora son
              dos clics.
            </p>
          </AnimatedOnView>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t, i) => (
              <AnimatedOnView key={t.title} delay={i * 0.05} as="article">
                <div className="h-full rounded-[16px] border border-border/70 bg-card p-6">
                  <t.icon
                    className="h-[30px] w-[30px] text-tomate"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-display text-xl font-extrabold tracking-[-0.02em]">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {t.body}
                  </p>
                </div>
              </AnimatedOnView>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD */}
      <section id="panel" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">El panel</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              Tu día, de un vistazo
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Cada mañana sabes qué cocinar, para quién y cuánto vas a facturar.
              Sin caos, sin sorpresas.
            </p>
          </AnimatedOnView>
          <AnimatedOnView delay={0.1} className="mt-12">
            <CateringDashboardMock />
          </AnimatedOnView>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">Cómo funciona</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              Empieza en una semana
            </h2>
          </AnimatedOnView>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <AnimatedOnView key={s.n} delay={i * 0.06} as="article">
                <div className="h-full rounded-[16px] border border-border/70 bg-card p-6">
                  <span className="font-mono text-[13px] font-medium text-tomate">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-extrabold tracking-[-0.02em]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </AnimatedOnView>
            ))}
          </div>
        </div>
      </section>

      {/* MODELO + CONFIANZA + CTA */}
      <section id="alta" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          {/* Modelo (sin cifras públicas: invita a contacto) */}
          <AnimatedOnView>
            <div className="rounded-[16px] border border-border/70 bg-card p-8 text-center md:p-10">
              <h2 className="plati-display text-[clamp(1.75rem,3.5vw,2.5rem)]">
                Un modelo sencillo, sin sorpresas
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Sin permanencia y sin ataduras. Lo ajustamos a tu caso, según las
                empresas que traes tú y las que te llevamos nosotros. Cuéntanos tu
                cocina y te explicamos cómo encajamos.
              </p>
            </div>
          </AnimatedOnView>

          {/* Franja de confianza */}
          <AnimatedOnView className="mt-4">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-[16px] border border-border/70 bg-hueso-warm px-6 py-5">
              {TRUST_CHIPS.map((chip) => (
                <li
                  key={chip}
                  className="flex items-center gap-2 text-[14px] font-medium text-muted-foreground"
                >
                  <Check
                    className="h-4 w-4 flex-none text-hierba"
                    aria-hidden="true"
                  />
                  {chip}
                </li>
              ))}
            </ul>
          </AnimatedOnView>

          {/* CTA */}
          <AnimatedOnView delay={0.1} className="mt-4">
            <div className="rounded-[16px] bg-tomate px-[5vw] py-16 text-center text-hueso">
              <h2 className="plati-display mx-auto max-w-2xl text-[clamp(2.125rem,5vw,3.625rem)] text-hueso">
                Tu cocina, llena cada día<span className="plati-dot" />
              </h2>
              <div className="mt-8 flex justify-center">
                <Button
                  asChild
                  size="lg"
                  className="rounded-pill bg-hueso text-tinta hover:bg-hueso/90"
                >
                  <Link href="/demo?perfil=catering">
                    Empezar ahora
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </AnimatedOnView>
        </div>
      </section>
    </>
  )
}
