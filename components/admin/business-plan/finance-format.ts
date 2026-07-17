import { formatPrice } from '@/lib/utils'

export { formatPrice }

/** €K compacto para ejes/tarjetas grandes (12.300 → 12,3k €). */
export function formatMoneyShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k €`
  return `${Math.round(n)} €`
}

export function formatPct(n: number | null, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n.toFixed(digits)}%`
}

export function formatMonths(n: number | null): string {
  if (n == null) return '∞'
  return `${n.toFixed(1)} m`
}

export function formatMultiple(n: number | null, digits = 1): string {
  if (n == null) return '—'
  return `${n.toFixed(digits)}×`
}

/** Etiqueta de mes "2026-07" → "jul 26". */
export function monthLabel(period: string): string {
  return new Date(period + '-01').toLocaleDateString('es-ES', {
    month: 'short',
    year: '2-digit',
  })
}
