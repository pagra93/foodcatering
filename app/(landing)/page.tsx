import { type Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  ArrowRight,
  Check,
  ChefHat,
  ClipboardCheck,
  UtensilsCrossed,
} from 'lucide-react'

import { AnimatedOnView } from '@/components/marketing/AnimatedOnView'
import { IRPFCalculator } from '@/components/marketing/IRPFCalculator'
import { JsonLd } from '@/components/marketing/JsonLd'
import { Button } from '@/components/ui/button'
import { faqSchema, howToSchema } from '@/lib/landing/jsonld'
import { faqsCompany, howItWorksCompany } from '@/lib/landing/content'

export const metadata: Metadata = {
  title: 'El menú de hoy, en tu oficina',
  description:
    'Plati conecta tu empresa con caterings locales que cocinan cada día y lo llevan a tu oficina. Tu equipo come bien, come junto y tiene un motivo más para venir.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Plati — El menú de hoy, en tu oficina',
    description:
      'Caterings locales cocinan cada día y lo llevamos a tu empresa. Comer juntos es cultura.',
    type: 'website',
    locale: 'es_ES',
  },
}

const CATERINGS = ['Casa Lola', 'El Mercao', 'Sabores Sur', 'La Tata', 'Nbesua']

const STEPS = [
  {
    n: '01',
    icon: ClipboardCheck,
    title: 'La empresa se da de alta',
    body: 'Define los días, el importe por menú (hasta 11 €), el copago y su catering local preferido.',
  },
  {
    n: '02',
    icon: Check,
    title: 'El equipo elige cada semana',
    body: 'Cada empleado escoge sus días y su primero, segundo y postre del menú que ofrece el catering.',
  },
  {
    n: '03',
    icon: ChefHat,
    title: 'El catering cocina y entrega',
    body: 'Recibe los pedidos consolidados, cocina lo justo y lo lleva a la oficina etiquetado por persona.',
  },
  {
    n: '04',
    icon: UtensilsCrossed,
    title: 'Plati gestiona lo demás',
    body: 'Facturación, exención de IRPF, copago y trazabilidad, en automático. Cero papeleo para RRHH.',
  },
]

const COMPARISON: { row: string; ticket: string; plati: string }[] = [
  {
    row: 'Dónde se come',
    ticket: 'Repartidos, fuera',
    plati: 'En tu oficina, juntos',
  },
  {
    row: 'Quién cocina',
    ticket: 'Cualquier restaurante',
    plati: 'Un catering local con nombre',
  },
  { row: 'Frescura', ticket: 'Variable', plati: 'Cocinado hoy' },
  {
    row: 'Efecto en la cultura',
    ticket: 'Neutro',
    plati: 'Crea conexión y presencia',
  },
  { row: 'Para RRHH', ticket: 'Una tarjeta más', plati: 'Un motivo para venir' },
]

const AUDIENCES = [
  {
    who: 'Para RRHH',
    title: 'El beneficio que llena la oficina',
    body: 'Sube la asistencia, la retención y la cultura — sin montar una cocina ni gestionar proveedores. Lo operamos nosotros.',
  },
  {
    who: 'Para el empleado',
    title: 'Comida de verdad, sin salir',
    body: 'Cocinada hoy y esperándote. Sin colas, sin gastar tu hora, sin pensar qué comer. Solo sentarte a la mesa.',
  },
  {
    who: 'Para el catering',
    title: 'Tu cocina, nuestros clientes',
    body: 'Demanda estable cada día y visibilidad ante empresas de tu ciudad. Tú cocinas; nosotros ponemos las mesas.',
  },
]

const DISHES = [
  {
    course: 'Primero · elige 1',
    name: 'Crema de calabaza & picatostes',
    by: 'Casa Lola · Granada',
    tags: ['Vegetariano', '240 kcal'],
  },
  {
    course: 'Segundo · elige 1',
    name: 'Pollo al curry & arroz basmati',
    by: 'Casa Lola · Granada',
    tags: ['Sin lactosa', '680 kcal'],
  },
  {
    course: 'Postre · elige 1',
    name: 'Yogur casero & frutos rojos',
    by: 'Casa Lola · Granada',
    tags: ['Sin gluten', '180 kcal'],
  },
]

export default function HomePage() {
  return (
    <>
      <JsonLd
        id="ld-home"
        data={[
          howToSchema({
            name: 'Cómo funciona Plati para la empresa',
            steps: howItWorksCompany,
          }),
          faqSchema(faqsCompany),
        ]}
      />

      {/* ───────────── HERO ───────────── */}
      <section className="pt-16 md:pt-20">
        <div className="mx-auto max-w-plati px-[5vw]">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <AnimatedOnView>
              <p className="plati-eyebrow">Beneficio de comida en empresa</p>
              <h1 className="plati-display mt-4 text-[clamp(2.75rem,6vw,4.75rem)]">
                El menú de hoy,
                <br />
                en tu oficina<span className="plati-dot" />
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                Caterings locales cocinan cada día y lo llevamos a tu empresa. Tu
                equipo come bien, come junto y tiene un motivo más para venir.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-pill">
                  <Link href="/demo">
                    Pedir demo
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-pill"
                >
                  <Link href="#como">Cómo funciona</Link>
                </Button>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground/80">
                <Check
                  className="h-4 w-4 flex-none text-hierba"
                  aria-hidden="true"
                />
                Mismo presupuesto que un ticket restaurante · exento de IRPF
              </p>
            </AnimatedOnView>

            <AnimatedOnView delay={0.1} className="relative">
              <div className="flex h-[360px] items-center justify-center rounded-[16px] bg-tomate-soft text-center text-sm font-medium text-tomate md:h-[480px]">
                Foto cenital de un menú apetecible
                <br />
                (mesa compartida)
              </div>
              <div className="absolute -left-4 bottom-7 flex items-center gap-3 rounded-[10px] bg-tinta px-5 py-4 text-hueso shadow-plati-2">
                <UtensilsCrossed
                  className="h-8 w-8 text-hueso"
                  aria-hidden="true"
                />
                <div>
                  <div className="font-display text-[17px] font-extrabold leading-tight">
                    Cocinado hoy
                  </div>
                  <div className="text-xs opacity-70">por Casa Lola · Granada</div>
                </div>
              </div>
            </AnimatedOnView>
          </div>
        </div>

        {/* Trust band */}
        <div className="mt-12 border-y border-border/70 py-6">
          <div className="mx-auto flex max-w-plati flex-wrap items-center justify-between gap-4 px-[5vw]">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
              Caterings locales que cocinan para Plati
            </span>
            <div className="flex flex-wrap gap-9">
              {CATERINGS.map((name) => (
                <span
                  key={name}
                  className="font-display text-xl font-bold text-tinta/30"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── CÓMO FUNCIONA ───────────── */}
      <section id="como" className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">Cómo funciona</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              Plati es la herramienta. La comida, local
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              No cocinamos ni decidimos el menú: conectamos a tu empresa con
              caterings de tu ciudad y automatizamos todo lo demás, cada día.
            </p>
          </AnimatedOnView>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <AnimatedOnView key={step.n} delay={i * 0.06} as="article">
                <div className="h-full rounded-[16px] border border-border/70 bg-card p-6">
                  <span className="font-mono text-[13px] font-medium text-tomate">
                    {step.n}
                  </span>
                  <step.icon
                    className="my-4 h-[30px] w-[30px] text-tomate"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <h3 className="font-display text-[23px] font-extrabold leading-tight tracking-[-0.02em]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </AnimatedOnView>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── POR QUÉ PLATI ───────────── */}
      <section id="porque" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView>
            <div className="overflow-hidden rounded-[16px] bg-tinta text-hueso">
              <div className="px-[5vw] py-16">
                <div className="max-w-2xl">
                  <p className="plati-eyebrow">Por qué Plati</p>
                  <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)] text-hueso">
                    No es un ticket. Es una mesa<span className="plati-dot" />
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-hueso/70">
                    Los vales de comida reparten al equipo por la ciudad, cada
                    uno por su lado. Plati hace lo contrario: trae la comida y
                    junta a la gente.
                  </p>
                </div>

                <table className="mt-10 w-full border-collapse">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.08em] text-hueso/60">
                      <th className="w-[34%] py-4 text-left font-semibold" />
                      <th className="py-4 text-left font-semibold">
                        Ticket restaurante
                      </th>
                      <th className="py-4 text-left font-semibold text-tomate">
                        Plati
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((c) => (
                      <tr
                        key={c.row}
                        className="border-t border-hueso/15 align-middle text-[15px]"
                      >
                        <td className="py-4 pr-4 font-medium text-hueso/85">
                          {c.row}
                        </td>
                        <td className="py-4 pr-4 text-hueso/50">{c.ticket}</td>
                        <td className="py-4 font-semibold text-hueso">
                          <span className="inline-flex items-center gap-2">
                            <Check
                              className="h-4 w-4 flex-none text-tomate"
                              strokeWidth={2.6}
                              aria-hidden="true"
                            />
                            {c.plati}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedOnView>
        </div>
      </section>

      {/* ───────────── PARA QUIÉN ───────────── */}
      <section id="quien" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">Para quién</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              Todos ganan en la misma mesa
            </h2>
          </AnimatedOnView>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a, i) => (
              <AnimatedOnView key={a.who} delay={i * 0.06} as="article">
                <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-border/70 bg-card">
                  <div className="flex h-[180px] items-center justify-center bg-hueso-warm text-sm font-medium text-tomate">
                    {a.who}
                  </div>
                  <div className="p-7">
                    <span className="plati-eyebrow">{a.who}</span>
                    <h3 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-[-0.02em]">
                      {a.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      {a.body}
                    </p>
                  </div>
                </div>
              </AnimatedOnView>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── EL MENÚ ───────────── */}
      <section id="menu" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <p className="plati-eyebrow">El menú lo pone tu catering</p>
                <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
                  Tú solo eliges
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  No cocinamos nosotros. Cada catering local publica su menú del
                  día y tu equipo elige un primero, un segundo y un postre desde
                  el móvil.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-pill bg-tomate px-3 py-1.5 text-[11.5px] font-bold text-hueso">
                <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
                Hoy · por Casa Lola
              </span>
            </div>
          </AnimatedOnView>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DISHES.map((d, i) => (
              <AnimatedOnView key={d.name} delay={i * 0.06} as="article">
                <div className="overflow-hidden rounded-[16px] border border-border/70 bg-card">
                  <div className="flex h-[200px] items-center justify-center bg-hueso-warm text-sm font-medium text-tomate">
                    {d.name}
                  </div>
                  <div className="p-6">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-tomate">
                      {d.course}
                    </span>
                    <h3 className="mt-3 font-display text-[21px] font-extrabold leading-tight tracking-[-0.02em]">
                      {d.name}
                    </h3>
                    <div className="mt-2 text-[13.5px] text-muted-foreground">
                      {d.by}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-pill border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </AnimatedOnView>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── FISCAL + CALCULADORA ───────────── */}
      <section id="precio" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">Fiscalidad</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              11 € al día. 100 % deducible
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              El beneficio de comida está exento de IRPF para el empleado hasta
              11 €/día, y para la empresa es gasto 100 % deducible en el Impuesto
              sobre Sociedades. Y si quieres, el coste se comparte entre empresa
              y empleado.
            </p>
          </AnimatedOnView>

          <div className="mt-12">
            <Suspense
              fallback={
                <div
                  className="h-[520px] w-full animate-pulse rounded-[16px] border border-border bg-muted/40"
                  aria-hidden="true"
                />
              }
            >
              <IRPFCalculator variant="compact" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className="pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView>
            <div className="rounded-[16px] bg-tomate px-[5vw] py-16 text-center text-hueso">
              <h2 className="plati-display mx-auto max-w-2xl text-[clamp(2.125rem,5vw,3.625rem)] text-hueso">
                Que mañana el equipo coma junto<span className="plati-dot" />
              </h2>
              <p className="mx-auto mt-5 max-w-md text-lg text-hueso/90">
                Cuéntanos cómo es tu oficina y te montamos una semana de prueba.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-pill bg-hueso text-tinta hover:bg-hueso/90"
                >
                  <Link href="/demo">
                    Pedir demo
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-pill border-hueso/50 bg-transparent text-hueso hover:bg-hueso/10 hover:text-hueso"
                >
                  <Link href="/caterings">Soy un catering</Link>
                </Button>
              </div>
            </div>
          </AnimatedOnView>
        </div>
      </section>
    </>
  )
}
