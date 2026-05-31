import type { Feature } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'
import { FeatureCard } from './FeatureCard'

type Props = {
  items: Feature[]
  columns?: 2 | 3
  className?: string
}

export function FeatureGrid({ items, columns = 3, className }: Props) {
  return (
    <div
      className={cn(
        'grid gap-5 sm:grid-cols-2',
        columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
        className,
      )}
    >
      {items.map((item, idx) => (
        <AnimatedOnView key={item.id} delay={idx * 0.05}>
          <FeatureCard feature={item} />
        </AnimatedOnView>
      ))}
    </div>
  )
}
