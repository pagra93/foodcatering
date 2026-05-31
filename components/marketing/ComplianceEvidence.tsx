import type { ComplianceEvidencePiece } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'

type Props = {
  items: ComplianceEvidencePiece[]
  className?: string
}

export function ComplianceEvidence({ items, className }: Props) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <AnimatedOnView key={item.id} delay={idx * 0.04}>
            <article
              aria-labelledby={`ev-${item.id}-title`}
              className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-6"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3
                id={`ev-${item.id}-title`}
                className="mt-5 text-base font-semibold tracking-tight text-foreground md:text-lg"
              >
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty">
                {item.description}
              </p>
            </article>
          </AnimatedOnView>
        )
      })}
    </div>
  )
}
