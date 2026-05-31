import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Tono semántico de un estado, mapeado a la paleta Plati:
 * - success → hierba (confirmaciones, "sí")
 * - warning → yema (atención puntual)
 * - error   → tomate/destructive (problema real)
 * - info    → tinta neutro
 * - neutral → gris de tema
 */
export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const TONE_VARIANT: Record<
  StatusTone,
  'success' | 'warning' | 'destructive' | 'info' | 'secondary'
> = {
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Badge de estado unificado para listados (pedidos, incidencias, facturas,
 * calidad…). Centraliza el mapeo estado → color de marca para no repetir
 * clases rojas/verdes/ámbar a mano por toda la app.
 */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge variant={TONE_VARIANT[tone]} className={cn(className)}>
      {children}
    </Badge>
  )
}
