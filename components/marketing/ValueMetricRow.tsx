import type { ValueMetric } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'

type Props = {
  items: ValueMetric[]
  className?: string
}

export function ValueMetricRow({ items, className }: Props) {
  return (
    <section
      className={cn('container mx-auto px-4 py-20 md:py-28', className)}
      aria-labelledby="metrics-heading"
    >
      <h2 id="metrics-heading" className="sr-only">
        Cifras clave
      </h2>
      <dl className="grid gap-10 md:grid-cols-3">
        {items.map((item, idx) => (
          <AnimatedOnView
            key={item.id}
            delay={idx * 0.08}
            className="flex flex-col gap-2 border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0 md:first:border-l-0 md:first:pl-0"
          >
            <dt className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {item.label}
            </dt>
            <dd className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              {item.value}
            </dd>
            {item.sublabel ? (
              <p className="text-sm text-muted-foreground">{item.sublabel}</p>
            ) : null}
          </AnimatedOnView>
        ))}
      </dl>
    </section>
  )
}
