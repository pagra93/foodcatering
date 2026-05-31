import Link from 'next/link'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { PricingTier } from '@/lib/landing/types'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = {
  tier: PricingTier
  className?: string
}

export function PricingCard({ tier, className }: Props) {
  const isCustom = tier.priceMonthly === 'custom'
  return (
    <article
      aria-labelledby={`price-${tier.id}-title`}
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-card p-6 md:p-8',
        tier.highlight
          ? 'border-primary shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.5)]'
          : 'border-border',
        className,
      )}
    >
      {tier.highlight ? (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Más popular
        </span>
      ) : null}
      <header>
        <h3
          id={`price-${tier.id}-title`}
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {tier.name}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          {tier.description}
        </p>
      </header>

      <div className="mt-6 flex items-baseline gap-1">
        {isCustom ? (
          <span className="text-4xl font-semibold tracking-tight text-foreground">
            Custom
          </span>
        ) : (
          <>
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {formatPrice(tier.priceMonthly as number)}
            </span>
            <span className="text-sm text-muted-foreground">/ mes</span>
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tier.unit}</p>

      <ul className="mt-8 flex-1 space-y-3 text-sm">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-foreground">
            <Check
              className="mt-0.5 h-4 w-4 flex-none text-primary"
              aria-hidden="true"
            />
            <span className="leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button
          asChild
          className="w-full"
          variant={tier.highlight ? 'default' : 'outline'}
        >
          <Link href={tier.ctaHref}>{tier.ctaLabel}</Link>
        </Button>
      </div>
    </article>
  )
}
