import type { PricingTier } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'
import { PricingCard } from './PricingCard'

type Props = {
  tiers: PricingTier[]
  className?: string
}

export function PricingTable({ tiers, className }: Props) {
  return (
    <div
      className={cn('grid gap-6 md:grid-cols-3', className)}
      aria-label="Planes y precios"
    >
      {tiers.map((tier, idx) => (
        <AnimatedOnView key={tier.id} delay={idx * 0.06} className="h-full">
          <PricingCard tier={tier} className="h-full" />
        </AnimatedOnView>
      ))}
    </div>
  )
}
