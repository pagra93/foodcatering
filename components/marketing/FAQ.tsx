import { ChevronDown } from 'lucide-react'

import type { FAQ as FAQItem } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'

type Props = {
  items: FAQItem[]
  className?: string
  titleAs?: 'h2' | 'h3'
}

export function FAQ({ items, className, titleAs = 'h3' }: Props) {
  const Heading = titleAs
  return (
    <div className={cn('mx-auto max-w-3xl space-y-3', className)}>
      {items.map((item, idx) => (
        <AnimatedOnView key={item.id} delay={idx * 0.04}>
          <details className="group rounded-xl border border-border bg-card px-6 py-5 transition-colors open:border-primary/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <Heading className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                {item.question}
              </Heading>
              <ChevronDown
                className="h-5 w-5 flex-none text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-3 text-sm text-muted-foreground leading-relaxed md:text-base text-pretty">
              {item.answer}
            </div>
          </details>
        </AnimatedOnView>
      ))}
    </div>
  )
}
