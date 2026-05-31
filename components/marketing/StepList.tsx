import type { Step } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'

type Props = {
  items: Step[]
  className?: string
}

export function StepList({ items, className }: Props) {
  return (
    <ol
      className={cn('relative mx-auto max-w-3xl space-y-10', className)}
      aria-label="Cómo funciona"
    >
      {items.map((step, idx) => {
        const last = idx === items.length - 1
        return (
          <AnimatedOnView key={step.id} delay={idx * 0.06} as="article">
            <li className="relative flex gap-6">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-semibold text-primary"
                >
                  {step.number}
                </span>
                {!last ? (
                  <span
                    aria-hidden="true"
                    className="mt-2 h-full w-px flex-1 bg-border"
                  />
                ) : null}
              </div>
              <div className="pb-2">
                <h3 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed md:text-base text-pretty">
                  {step.description}
                </p>
              </div>
            </li>
          </AnimatedOnView>
        )
      })}
    </ol>
  )
}
