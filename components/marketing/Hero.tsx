import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { AnimatedOnView } from './AnimatedOnView'

type CTA = {
  label: string
  href: string
}

type Props = {
  eyebrow?: string
  title: ReactNode
  subtitle: string
  bullets?: string[]
  primaryCta: CTA
  secondaryCta?: CTA
  visual?: ReactNode
  alignment?: 'split' | 'center'
  className?: string
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  bullets,
  primaryCta,
  secondaryCta,
  visual,
  alignment = 'split',
  className,
}: Props) {
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background',
        className,
      )}
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]"
        aria-hidden="true"
      />
      <div className="container mx-auto px-4 pb-20 pt-16 md:pb-28 md:pt-24">
        <div
          className={cn(
            'mx-auto grid items-center gap-12',
            alignment === 'split' && visual
              ? 'lg:max-w-none lg:grid-cols-[1.05fr_1fr]'
              : 'max-w-3xl text-center',
          )}
        >
          <AnimatedOnView>
            {eyebrow ? (
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1
              id="hero-heading"
              className="mt-5 text-4xl font-semibold tracking-tight text-foreground text-balance sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {title}
            </h1>
            <p
              className={cn(
                'mt-6 text-lg text-muted-foreground md:text-xl text-pretty',
                alignment === 'center' ? 'mx-auto max-w-2xl' : 'max-w-xl',
              )}
            >
              {subtitle}
            </p>
            {bullets && bullets.length > 0 ? (
              <ul
                className={cn(
                  'mt-6 space-y-2 text-sm text-muted-foreground md:text-base',
                  alignment === 'center' ? 'mx-auto max-w-xl text-left' : '',
                )}
              >
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-primary"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div
              className={cn(
                'mt-8 flex flex-wrap gap-3',
                alignment === 'center' ? 'justify-center' : '',
              )}
            >
              <Button asChild size="lg">
                <Link href={primaryCta.href}>
                  {primaryCta.label}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              {secondaryCta ? (
                <Button asChild variant="outline" size="lg">
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                </Button>
              ) : null}
            </div>
          </AnimatedOnView>

          {alignment === 'split' && visual ? (
            <AnimatedOnView delay={0.1} className="relative">
              {visual}
            </AnimatedOnView>
          ) : null}
        </div>
      </div>
    </section>
  )
}
