import type { TrustBadge } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

type Props = {
  items: TrustBadge[]
  className?: string
}

export function TrustBadges({ items, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-muted-foreground',
        className,
      )}
      aria-label="Cumplimiento y certificaciones"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
