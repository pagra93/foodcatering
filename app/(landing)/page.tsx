import { type Metadata } from 'next'
import Image from 'next/image'
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
  title: 'El menú del día, en tu oficina',
  description:
    'Plati conecta tu empresa con caterings locales que cocinan cada día y lo llevan a tu oficina. Tu equipo come bien, come junto y tiene un motivo más para venir.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Plati — El menú del día, en tu oficina',
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
    who: 'Para RRHH y dirección',
    title: 'El beneficio que llena la oficina',
    body: 'Más asistencia, más retención y un equipo que se conoce y rinde mejor — sin montar una cocina ni gestionar proveedores. Lo operamos nosotros.',
    image: '/landing/rrhh_plati.webp',
    alt: 'Responsable de RRHH revisando la adopción del beneficio de comida en la oficina',
  },
  {
    who: 'Para el empleado',
    title: 'Comida de verdad, sin salir',
    body: 'Cocinada hoy y esperándote. Sin colas, sin gastar tu hora, sin pensar qué comer. Solo sentarte a la mesa.',
    image: '/landing/Empleado_plati.webp',
    alt: 'Empleados comiendo juntos el menú del día en la oficina',
  },
  {
    who: 'Para el catering',
    title: 'Tu cocina, nuestros clientes',
    body: 'Demanda estable cada día y visibilidad ante empresas de tu ciudad. Tú cocinas; nosotros ponemos las mesas.',
    image: '/landing/catering_plati.webp',
    alt: 'Cocinero de un catering local preparando los menús del día',
  },
]

// Formatos de menú que la empresa puede ofrecer. Los platos concretos los pone
// cada catering local (cambian por ciudad y cocina); esto es la fórmula.
const FORMATS = [
  {
    name: 'Menú completo',
    detail: 'Primero, segundo y postre.',
    note: 'El día redondo.',
  },
  {
    name: 'Plato y postre',
    detail: 'Un principal y postre.',
    note: 'El equilibrio justo.',
  },
  {
    name: 'Solo principal',
    detail: 'Un único plato principal.',
    note: 'Para el que va con prisa.',
  },
]

const TRUST_CHIPS = [
  'Sin permanencia',
  'Sin cuota de alta',
  'Servidores en la UE',
  'RGPD y DPA firmado',
  'Cifrado AES-256',
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
                El menú del día,
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
                  <Link href="/calculadora">Calcular mi ahorro</Link>
                </Button>
              </div>
              <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground/80">
                <Check
                  className="h-4 w-4 flex-none text-hierba"
                  aria-hidden="true"
                />
                Piloto de 30 días sin coste · exento de IRPF · sin permanencia
              </p>
            </AnimatedOnView>

            <AnimatedOnView delay={0.1} className="relative">
              <div className="relative h-[360px] overflow-hidden rounded-[16px] md:h-[480px]">
                <Image
                  src="/landing/hero_plati.webp"
                  alt="Menú del día servido en una mesa compartida en la oficina"
                  fill
                  priority
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="object-cover"
                />
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
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Caterings locales ya cocinando para equipos
            </span>
            <div className="flex flex-wrap gap-9">
              {CATERINGS.map((name) => (
                <span
                  key={name}
                  className="font-display text-xl font-bold text-tinta/70"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── POR QUÉ PLATI (tensión / posicionamiento) ───────────── */}
      <section id="porque" className="scroll-mt-24 py-24">
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
                    uno por su lado, y a nadie le emociona una tarjeta más. Plati
                    hace lo contrario: trae la comida y junta a la gente.
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

      {/* ───────────── CÓMO FUNCIONA ───────────── */}
      <section id="como" className="scroll-mt-24 pb-24">
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

      {/* ───────────── EL MENÚ Y EL FORMATO ───────────── */}
      <section id="menu" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">El menú lo pone tu catering</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              Tú eliges la fórmula. El catering, los platos
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              No cocinamos ni decidimos la carta: cada catering local publica su
              propio menú del día, así que los platos cambian con la ciudad y la
              cocina. Tú eliges el formato que ofreces a tu equipo. Agua y pan,
              siempre incluidos.
            </p>
          </AnimatedOnView>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FORMATS.map((f, i) => (
              <AnimatedOnView key={f.name} delay={i * 0.06} as="article">
                <div className="flex h-full flex-col rounded-[16px] border border-border/70 bg-card p-7">
                  <UtensilsCrossed
                    className="h-7 w-7 text-tomate"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
                    {f.name}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {f.detail}
                  </p>
                  <p className="mt-1 text-[13.5px] text-muted-foreground/70">
                    {f.note}
                  </p>
                  <span className="mt-5 inline-flex w-fit items-center rounded-pill border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    Agua y pan incluidos
                  </span>
                </div>
              </AnimatedOnView>
            ))}
          </div>

          {/* Copago — mensaje para la empresa */}
          <AnimatedOnView className="mt-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 rounded-[16px] bg-hueso-warm px-7 py-6">
              <span className="font-display text-[17px] font-extrabold tracking-[-0.01em]">
                Copago a tu medida.
              </span>
              <span className="text-[15px] leading-relaxed text-muted-foreground">
                La empresa decide cuánto pone y cuánto el empleado: desde cubrir
                el menú entero hasta compartir el coste. Hasta 11 €/día, exento
                de IRPF.
              </span>
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
                  <div className="relative h-[180px] overflow-hidden">
                    <Image
                      src={a.image}
                      alt={a.alt}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover"
                    />
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

      {/* ───────────── FISCAL + CALCULADORA ───────────── */}
      <section id="precio" className="scroll-mt-24 pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView className="max-w-2xl">
            <p className="plati-eyebrow">Fiscalidad</p>
            <h2 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
              Hasta 11 €/día, exentos. Y 100 % deducible
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              El beneficio de comida está exento de IRPF para el empleado hasta
              11 €/día, y para la empresa es gasto 100 % deducible en el Impuesto
              sobre Sociedades. Y si quieres, el coste se comparte entre empresa
              y empleado.
            </p>
            <p className="mt-3 text-[13px] text-muted-foreground/80">
              Estimación orientativa según el Art. 42.3 LIRPF. No constituye
              asesoramiento fiscal; consulta con tu asesor.
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

      {/* ───────────── FRANJA DE CONFIANZA ───────────── */}
      <section className="pb-24">
        <div className="mx-auto max-w-plati px-[5vw]">
          <AnimatedOnView>
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
                Cuéntanos cómo es tu oficina y te montamos un piloto de 30 días
                sin coste.
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
