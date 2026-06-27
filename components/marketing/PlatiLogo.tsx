import Image from 'next/image'

import { cn } from '@/lib/utils'

type SymbolTone = 'tomate' | 'tinta' | 'hueso'

const TONE_COLOR: Record<SymbolTone, string> = {
  tomate: 'hsl(var(--plati-tomate))',
  tinta: 'hsl(var(--plati-tinta))',
  hueso: 'hsl(var(--plati-hueso))',
}

/**
 * Símbolo de marca «Aro»: dos círculos concéntricos (un plato visto desde
 * arriba). Geometría idéntica a `public/brand/plati-simbolo-*.svg`, inline
 * para poder recolorearlo según el contexto.
 */
export function PlatiSymbol({
  tone = 'tomate',
  className,
}: {
  tone?: SymbolTone
  className?: string
}) {
  const color = TONE_COLOR[tone]
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Plati"
      className={cn('h-8 w-8', className)}
    >
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="5.5"
      />
      <circle
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke={color}
        strokeWidth="5.5"
      />
    </svg>
  )
}

/**
 * Wordmark «Plati» con la tilde de la *i* convertida en el punto tomate de
 * marca. La *i* se construye a mano (tronco dotless + punto tomate) para que el
 * motif sea fiel en cualquier render.
 */
export function PlatiWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-2xl font-extrabold leading-none tracking-[-0.04em]',
        className,
      )}
    >
      <span aria-hidden="true">
        Plat
        <span className="relative inline-block">
          {'ı'}
          <span
            className="absolute left-1/2 top-0 block -translate-x-1/2 rounded-full"
            style={{
              width: '0.17em',
              height: '0.17em',
              marginTop: '-0.04em',
              background: 'hsl(var(--plati-tomate))',
            }}
          />
        </span>
      </span>
      <span className="sr-only">Plati</span>
    </span>
  )
}

/**
 * Lockup horizontal por defecto: símbolo + wordmark.
 *
 * Renderiza el lockup oficial de marca (`public/brand/png/plati-logo-horizontal-
 * transparent.png`, 821×312) para que la tipografía sea fiel. Pensado para
 * fondos claros (navbar, footer claro, login). El `className` controla el alto
 * (`w-auto` mantiene la proporción 2,63:1).
 */
export function PlatiLogo({
  className,
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/brand/png/plati-logo-horizontal-transparent.png"
      alt="Plati"
      width={821}
      height={312}
      priority={priority}
      className={cn('h-8 w-auto', className)}
    />
  )
}
