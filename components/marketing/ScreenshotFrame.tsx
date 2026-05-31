import Image from 'next/image'
import { cn } from '@/lib/utils'

type Props = {
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
}

export function ScreenshotFrame({
  src,
  alt,
  caption,
  width = 1440,
  height = 900,
  priority = false,
  className,
}: Props) {
  return (
    <figure
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.25)]',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-destructive/40"
        />
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-warning/50"
        />
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-success/50"
        />
        {caption ? (
          <span className="ml-4 truncate text-xs font-medium text-muted-foreground">
            {caption}
          </span>
        ) : null}
      </div>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(min-width: 1024px) 640px, 100vw"
        className="h-auto w-full"
      />
    </figure>
  )
}

export function ScreenshotPlaceholder({
  caption,
  label,
  className,
}: {
  caption?: string
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.25)]',
        className,
      )}
      role="img"
      aria-label={label}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-destructive/40"
        />
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-warning/50"
        />
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-success/50"
        />
        {caption ? (
          <span className="ml-4 truncate text-xs font-medium text-muted-foreground">
            {caption}
          </span>
        ) : null}
      </div>
      <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary/5 via-background to-primary/10" />
    </div>
  )
}
