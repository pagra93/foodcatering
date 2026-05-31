import { cn } from '@/lib/utils'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
  as?: 'h2' | 'h3'
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
  as = 'h2',
}: Props) {
  const Heading = as
  return (
    <div
      className={cn(
        'mx-auto max-w-3xl',
        align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      ) : null}
      <Heading
        className={cn(
          'mt-3 font-semibold tracking-tight text-foreground text-balance',
          as === 'h2' ? 'text-3xl md:text-5xl' : 'text-2xl md:text-3xl',
        )}
      >
        {title}
      </Heading>
      {subtitle ? (
        <p className="mt-5 text-base text-muted-foreground md:text-lg text-pretty">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
