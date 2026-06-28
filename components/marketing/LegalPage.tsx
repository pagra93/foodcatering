import { type ReactNode } from 'react'

export type LegalSection = {
  heading: string
  body: ReactNode
}

type Props = {
  title: string
  /** Fecha legible de última actualización, p. ej. "27 de junio de 2026". */
  updatedAt: string
  intro?: string
  sections: LegalSection[]
}

/**
 * Layout consistente para páginas legales (privacidad, términos, cookies).
 * Tono sobrio pero dentro del sistema visual Plati (hueso/tinta, display en el
 * título). El contenido lo pasan las páginas como secciones estructuradas.
 */
export function LegalPage({ title, updatedAt, intro, sections }: Props) {
  return (
    <section className="mx-auto max-w-3xl px-[5vw] py-16 md:py-24">
      <p className="plati-eyebrow">Legal</p>
      <h1 className="plati-display mt-3 text-[clamp(2rem,4.4vw,3.125rem)]">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Última actualización: {updatedAt}
      </p>

      {intro ? (
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {intro}
        </p>
      ) : null}

      <div className="mt-12 space-y-10">
        {sections.map((s, i) => (
          <div key={s.heading}>
            <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
              <span className="mr-2 font-mono text-[15px] font-medium text-tomate">
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.heading}
            </h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-tomate [&_a:hover]:underline [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-foreground">
              {s.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
