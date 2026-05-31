import { Quote } from 'lucide-react'

import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'
import { SectionHeader } from './SectionHeader'

type Quote = {
  id: string
  text: string
  author: string
  role: string
}

const quotes: Quote[] = [
  {
    id: 'q1',
    text: '"Antes perdía 40 minutos al día gestionando la comida del equipo. Ahora entro al dashboard, veo el dossier del mes y paso a otra cosa."',
    author: 'Lo que diría tu',
    role: 'Responsable de RRHH',
  },
  {
    id: 'q2',
    text: '"Lo que me convenció fue que la evidencia queda fuera de discusión. Si mañana viene una inspección, bajo el PDF y punto."',
    author: 'Lo que diría tu',
    role: 'Dirección Financiera',
  },
  {
    id: 'q3',
    text: '"Antes comíamos lo que había. Ahora elijo el lunes qué como toda la semana, con alérgenos avisados. Es otra liga."',
    author: 'Lo que diría tu',
    role: 'Empleado',
  },
]

type Props = {
  className?: string
}

export function TestimonialPlaceholder({ className }: Props) {
  return (
    <section
      className={cn('container mx-auto px-4 py-20 md:py-28', className)}
      aria-labelledby="testimonials-heading"
    >
      <SectionHeader
        eyebrow="Voces del producto"
        title="Lo que dirán tus equipos"
        subtitle="Aún estamos firmando nuestros primeros grandes clientes. Estas son las frases que nos devuelven los pilotos — las publicaremos con nombre y apellidos en cuanto lo autoricen."
      />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {quotes.map((q, idx) => (
          <AnimatedOnView
            key={q.id}
            delay={idx * 0.07}
            className="h-full"
          >
            <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
              <Quote
                className="h-6 w-6 text-primary/60"
                aria-hidden="true"
              />
              <blockquote className="mt-4 flex-1 text-sm text-foreground leading-relaxed md:text-base text-pretty">
                {q.text}
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="block font-medium text-foreground">
                  {q.author}
                </span>
                <span>{q.role}</span>
              </figcaption>
            </figure>
          </AnimatedOnView>
        ))}
      </div>
    </section>
  )
}
