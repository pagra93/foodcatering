/**
 * Tarjeta de KPI reutilizable para el dashboard
 * Diseño limpio y moderno
 */

import { type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type KPICardProps = {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

const variantStyles = {
  default: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
  info: 'text-purple-600',
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: KPICardProps) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Icon y Trend en la parte superior */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn('p-2 rounded-lg bg-gray-50', variantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-semibold flex items-center gap-1',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '↑' : '↓'}
                {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>

        {/* Título */}
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>

        {/* Valor principal - más grande y destacado */}
        <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>

        {/* Subtitle más sutil */}
        {subtitle && (
          <p className="text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </Card>
  )
}


