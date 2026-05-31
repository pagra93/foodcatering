import type { Feature } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

type Props = {
  feature: Feature
  className?: string
}

export function FeatureCard({ feature, className }: Props) {
  const Icon = feature.icon
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm',
        className,
      )}
      aria-labelledby={`feat-${feature.id}-title`}
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3
        id={`feat-${feature.id}-title`}
        className="mt-5 text-lg font-semibold tracking-tight text-foreground"
      >
        {feature.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty">
        {feature.description}
      </p>
    </article>
  )
}
