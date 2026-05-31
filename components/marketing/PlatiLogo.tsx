import { cn } from '@/lib/utils'

type SymbolTone = 'tomate' | 'tinta' | 'hueso'

const TONE_COLOR: Record<SymbolTone, string> = {
  tomate: 'var(--plati-tomate)',
  tinta: 'var(--plati-tinta)',
  hueso: 'var(--plati-hueso)',
}

/**
 * Símbolo de marca «Aro»: dos círculos concéntricos (un plato visto desde
 * arriba). Geometría equivalente a `public/brand/plati-simbolo-*.svg`, inline
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
      viewBox="0 0 64 64"
      role="img"
      aria-label="Plati"
      className={cn('h-8 w-8', className)}
    >
      <circle
        cx="32"
        cy="32"
        r="29"
        fill="none"
        stroke={color}
        strokeWidth="6"
      />
      <circle cx="32" cy="32" r="11" fill={color} />
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
              background: 'var(--plati-tomate)',
            }}
          />
        </span>
      </span>
      <span className="sr-only">Plati</span>
    </span>
  )
}

/**
 * Lockup horizontal por defecto: símbolo + wordmark. Reutilizable en navbar,
 * footer y (fase 2) portales internos.
 */
export function PlatiLogo({
  tone = 'tomate',
  symbolClassName,
  wordmarkClassName,
  className,
}: {
  tone?: SymbolTone
  symbolClassName?: string
  wordmarkClassName?: string
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <PlatiSymbol tone={tone} className={symbolClassName} />
      <PlatiWordmark className={wordmarkClassName} />
    </span>
  )
}
