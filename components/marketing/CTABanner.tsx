import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'

type CTA = { label: string; href: string }

type Props = {
  title: string
  subtitle?: string
  primary: CTA
  secondary?: CTA
  variant?: 'primary' | 'soft'
  className?: string
}

export function CTABanner({
  title,
  subtitle,
  primary,
  secondary,
  variant = 'primary',
  className,
}: Props) {
  return (
    <section
      className={cn('container mx-auto px-4 py-20 md:py-24', className)}
      aria-labelledby="cta-heading"
    >
      <AnimatedOnView>
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl px-6 py-12 md:px-14 md:py-16',
            variant === 'primary'
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-muted',
          )}
        >
          {variant === 'primary' ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.18),transparent_60%)]"
            />
          ) : null}
          <div className="relative mx-auto max-w-3xl text-center">
            <h2
              id="cta-heading"
              className="text-3xl font-semibold tracking-tight md:text-4xl text-balance"
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cn(
                  'mx-auto mt-4 max-w-2xl text-base md:text-lg text-pretty',
                  variant === 'primary'
                    ? 'text-primary-foreground/85'
                    : 'text-muted-foreground',
                )}
              >
                {subtitle}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                variant={variant === 'primary' ? 'secondary' : 'default'}
              >
                <Link href={primary.href}>
                  {primary.label}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              {secondary ? (
                <Button
                  asChild
                  size="lg"
                  variant={variant === 'primary' ? 'ghost' : 'outline'}
                  className={
                    variant === 'primary'
                      ? 'text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
                      : undefined
                  }
                >
                  <Link href={secondary.href}>{secondary.label}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </AnimatedOnView>
    </section>
  )
}
