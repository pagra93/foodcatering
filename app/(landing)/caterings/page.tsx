import { type Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  LayoutGrid,
  PackageCheck,
  TrendingUp,
} from 'lucide-react'

import { AnimatedOnView } from '@/components/marketing/AnimatedOnView'
import { CateringDashboardMock } from '@/components/marketing/CateringDashboardMock'
import { JsonLd } from '@/components/marketing/JsonLd'
import { Button } from '@/components/ui/button'
import { faqSchema, howToSchema } from '@/lib/landing/jsonld'
import { faqsCatering, howItWorksCatering } from '@/lib/landing/content'

export const metadata: Metadata = {
  title: 'Llena tu cocina entre semana',
  description:
    'Plati lleva tus menús a empresas de tu ciudad. Tú cocinas; nosotros traemos los pedidos, la logística y el cobro. Comisión 5–8%, facturación directa, sin permanencia.',
  alternates: { canonical: '/caterings' },
  openGraph: {
    title: 'Plati para caterings — Llena tu cocina entre semana',
    description:
      'Demanda recurrente de empresas de tu ciudad, panel de pedidos y facturación directa. Comisión 5–8%.',
    type: 'website',
    locale: 'es_ES',
  },
}

const PAINS = [
  {
    stat: '30%',
    title: 'Comisiones que ahogan',
    body: 'Cada pedido por delivery se lleva casi un tercio. A final de mes, tu margen real es mínimo.',
  },
  {
    stat: '12-3',
    title: 'Solo viven del mediodía',
    body: 'Las horas punta se concentran en 3 horas. El resto, la cocina y el equipo están parados.',
  },
  {
    stat: '?',
    title: 'Ingresos imprevisibles',
    body: 'Sin saber cuántos cubiertos harás mañana, compras de más o de menos. Y tiras comida.',
  },
]

const TOOLS = [
  {
    icon: TrendingUp,
    title: 'Demanda recurrente',
    body: 'Empresas que piden cada día, no pedidos sueltos. Planifica con semanas de antelación.',
  },
  {
    icon: LayoutGrid,
    title: 'Panel de pedidos',
    body: 'Ve cuántos menús de cada plato tienes que cocinar hoy. Sin llamadas, sin notas sueltas.',
  },
  {
    icon: PackageCheck,
    title: 'Previsión de compra',
    body: 'Con la demanda confirmada, sabes exactamente qué comprar. Cero desperdicio.',
  },
  {
    icon: FileText,
    title: 'Facturación directa',
    body: 'Facturas a la empresa, sin intermediarios. El dinero es tuyo, no de una app.',
  },
  {
    icon: PackageCheck,
    title: 'Entrega etiquetada',
    body: 'Cada menú sale con el nombre de la persona y su empresa. Reparto ordenado en segundos.',
  },
  {
    icon: Clock,
    title: 'Comisión 5–8%',
    body: 'Pagas solo por lo que vendes a través de Plati. Sin cuotas fijas, sin permanencia.',
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
    title: 'Te asignamos empresas',
    body: 'Conectamos tu cocina con empresas de tu zona que ya quieren comer contigo.',
  },
  {
    n: '04',
    title: 'Cocinas y facturas',
    body: 'Recibes pedidos, cocinas lo justo y facturas directo. Nosotros nos llevamos 5–8%.',
  },
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
                Plati lleva tus menús a empresas de tu ciudad. Tú cocinas;
                nosotros traemos los pedidos, la logística y el cobro.
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
              <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground/80">
                <Check
                  className="h-4 w-4 flex-none text-hierba"
                  aria-hidden="true"
                />
                Comisión 5–8% · facturación directa · sin permanencia
              </p>
            </AnimatedOnView>

            <AnimatedOnView delay={0.1} className="relative">
              <div className="flex h-[360px] items-center justify-center rounded-[16px] bg-tomate-soft text-center text-sm font-medium text-tomate md:h-[480px]">
                Cocinero emplatando
                <br />
                en cocina profesional
              </div>
              <div className="absolute -left-4 bottom-7 rounded-[10px] bg-tinta px-5 py-4 text-hueso shadow-plati-2">
                <div className="font-display text-[17px] font-extrabold leading-tight">
                  +220 menús/día
                </div>
                <div className="text-xs opacity-70">media por catering activo</div>
              </div>
            </AnimatedOnView>
          </div>
        </div>
      </section>

      {/* PROBLEMA (panel oscuro) */}
      <section id="problema" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView>
            <div className="overflow-hidden rounded-[16px] bg-tinta text-hueso">
              <div className="px-[5vw] py-16">
                <div className="max-w-2xl">
                  <p className="plati-eyebrow">El problema</p>
                  <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)] text-hueso">
                    El delivery se come tu margen
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-hueso/70">
                    Las plataformas de reparto cobran hasta un 30 % por pedido y
                    te esconden al cliente. Tu cocina trabaja para ellas, no para
                    ti.
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
              Una cocina llena, en piloto automático
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Plati te trae demanda recurrente de empresas y te da el panel para
              gestionarla sin caos.
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

      {/* COMISIÓN + CTA */}
      <section id="alta" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[16px] border border-border/70 bg-card p-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Delivery tradicional
                </div>
                <div className="mt-2 font-display text-5xl font-extrabold text-tinta/40">
                  30 %
                </div>
                <p className="mt-3 text-[15px] text-muted-foreground">
                  de comisión por pedido. Y no sabes quién es tu cliente.
                </p>
              </div>
              <div className="rounded-[16px] border-2 border-tomate bg-tomate-soft p-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-tomate">
                  Con Plati
                </div>
                <div className="mt-2 font-display text-5xl font-extrabold text-tomate">
                  5–8 %
                </div>
                <p className="mt-3 text-[15px] text-tinta/80">
                  de comisión. Facturas directo a la empresa y el cliente es
                  tuyo.
                </p>
              </div>
            </div>
          </AnimatedOnView>

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
