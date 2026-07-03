import { Check, Lock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanUsage } from '@/lib/plans/entitlements'
import { FEATURE_CATALOG } from '@/lib/plans/feature-catalog'

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number | null }) {
  const unlimited = limit == null
  const pct = unlimited ? 0 : Math.min(100, Math.round((current / Math.max(1, limit)) * 100))
  const full = !unlimited && current >= limit
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={cn('font-medium', full && 'text-red-600')}>
          {current} {unlimited ? '· ∞' : `/ ${limit}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full', full ? 'bg-red-500' : 'bg-emerald-500')}
          style={{ width: unlimited ? '8%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Tarjeta de plan actual: uso vs límites + features incluidas. Solo lectura. */
export function PlanUsageCard({ data }: { data: PlanUsage }) {
  const { entitlements: ent, usage } = data
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Tu plan</p>
          <h3 className="text-lg font-bold">{ent.planName ?? '—'}</h3>
        </div>
        <Badge variant="outline">Suscripción SaaS</Badge>
      </div>

      <div className="space-y-3">
        <UsageBar label="Empleados" current={usage.employees} limit={ent.limits.maxEmployees} />
        <UsageBar label="Sedes" current={usage.sites} limit={ent.limits.maxSites} />
        <UsageBar label="Caterings" current={usage.caterings} limit={ent.limits.maxCaterings} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
          Funcionalidades
        </p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {FEATURE_CATALOG.filter((f) => !f.core).map((f) => {
            const on = ent.features.has(f.key)
            return (
              <li
                key={f.key}
                className={cn('flex items-center gap-2 text-sm', !on && 'text-gray-400')}
              >
                {on ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-gray-300" />
                )}
                {f.label}
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}
