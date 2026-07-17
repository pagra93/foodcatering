'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Assumptions } from '@/lib/validations/finance'

function Num({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  suffix?: string
  hint?: string
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="h-8"
        />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{children}</div>
    </Card>
  )
}

export function AssumptionsTab({
  value,
  onChange,
  onAnchor,
  canAnchor,
}: {
  value: Assumptions
  onChange: (a: Assumptions) => void
  onAnchor?: () => void
  canAnchor?: boolean
}) {
  const upd = (mut: (a: Assumptions) => void) => {
    const next = structuredClone(value)
    mut(next)
    onChange(next)
  }
  const g = value.growth
  const p = value.pricing
  const c = value.costs

  return (
    <div className="space-y-4">
      <Group title="Crecimiento">
        <Num label="Empresas iniciales" value={g.startingCompanies} onChange={(v) => upd((a) => { a.growth.startingCompanies = v })} />
        <Num label="Caterings iniciales" value={g.startingCaterings} onChange={(v) => upd((a) => { a.growth.startingCaterings = v })} />
        <div className="flex items-end">
          <div className="w-full">
            <Label className="text-xs">Modo de alta</Label>
            <div className="flex gap-1">
              {(['absolute', 'percent'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => upd((a) => { a.growth.growthMode = mode })}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${g.growthMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}
                >
                  {mode === 'absolute' ? 'Nº/mes' : '% MoM'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {g.growthMode === 'absolute' ? (
          <Num label="Nuevas empresas/mes" value={g.newCompaniesPerMonth} step={0.5} onChange={(v) => upd((a) => { a.growth.newCompaniesPerMonth = v })} />
        ) : (
          <Num label="Crecimiento empresas" value={g.companyGrowthRatePct} step={0.5} suffix="%" onChange={(v) => upd((a) => { a.growth.companyGrowthRatePct = v })} />
        )}
        <Num label="Churn empresas" value={g.monthlyChurnRatePct} step={0.5} suffix="%/mes" onChange={(v) => upd((a) => { a.growth.monthlyChurnRatePct = v })} />
        <Num label="Nuevos caterings/mes" value={g.newCateringsPerMonth} step={0.5} onChange={(v) => upd((a) => { a.growth.newCateringsPerMonth = v })} />
        <Num label="Churn caterings" value={g.cateringChurnRatePct} step={0.5} suffix="%/mes" onChange={(v) => upd((a) => { a.growth.cateringChurnRatePct = v })} />
        <Num label="Empleados/empresa" value={g.employeesPerCompany} onChange={(v) => upd((a) => { a.growth.employeesPerCompany = v })} />
        <Num label="Pedidos/empleado/mes" value={g.ordersPerEmployeePerMonth} onChange={(v) => upd((a) => { a.growth.ordersPerEmployeePerMonth = v })} />
        <Num label="Ticket medio" value={g.avgTicket} step={0.5} suffix="€" onChange={(v) => upd((a) => { a.growth.avgTicket = v })} />
      </Group>

      <Group title="Planes de empresa (SaaS) — precio y mix (pesos)">
        <Num label="Precio Starter" value={p.planPrices.starter} suffix="€/mes" onChange={(v) => upd((a) => { a.pricing.planPrices.starter = v })} />
        <Num label="Precio Growth" value={p.planPrices.growth} suffix="€/mes" onChange={(v) => upd((a) => { a.pricing.planPrices.growth = v })} />
        <Num label="Precio Enterprise" value={p.planPrices.enterprise} suffix="€/mes" onChange={(v) => upd((a) => { a.pricing.planPrices.enterprise = v })} />
        <Num label="Mix Starter" value={g.planMix.starter} onChange={(v) => upd((a) => { a.growth.planMix.starter = v })} />
        <Num label="Mix Growth" value={g.planMix.growth} onChange={(v) => upd((a) => { a.growth.planMix.growth = v })} />
        <Num label="Mix Enterprise" value={g.planMix.enterprise} onChange={(v) => upd((a) => { a.growth.planMix.enterprise = v })} />
      </Group>

      <Group title="Planes de catering — comisión por plan y reparto (pesos)">
        <Num label="Comisión Básico" value={p.cateringCommission.basico} step={0.5} suffix="% GMV" onChange={(v) => upd((a) => { a.pricing.cateringCommission.basico = v })} />
        <Num label="Comisión Estándar" value={p.cateringCommission.estandar} step={0.5} suffix="% GMV" onChange={(v) => upd((a) => { a.pricing.cateringCommission.estandar = v })} />
        <Num label="Comisión Premium" value={p.cateringCommission.premium} step={0.5} suffix="% GMV" onChange={(v) => upd((a) => { a.pricing.cateringCommission.premium = v })} />
        <Num label="Cuota fija" value={p.cateringFixedFee} step={10} suffix="€/mes" onChange={(v) => upd((a) => { a.pricing.cateringFixedFee = v })} />
        <Num label="Reparto Básico (8%)" value={p.cateringMix.basico} onChange={(v) => upd((a) => { a.pricing.cateringMix.basico = v })} />
        <Num label="Reparto Estándar (5%)" value={p.cateringMix.estandar} onChange={(v) => upd((a) => { a.pricing.cateringMix.estandar = v })} />
        <Num label="Reparto Premium (3%)" value={p.cateringMix.premium} onChange={(v) => upd((a) => { a.pricing.cateringMix.premium = v })} />
        <Num label="Reparto Cuota fija" value={p.cateringMix.fija} onChange={(v) => upd((a) => { a.pricing.cateringMix.fija = v })} />
      </Group>

      <Group title="Costes — COGS y OpEx">
        <Num label="Hosting/empresa" value={c.cogs.hostingPerCompany} suffix="€/mes" onChange={(v) => upd((a) => { a.costs.cogs.hostingPerCompany = v })} />
        <Num label="Procesamiento pago" value={c.cogs.paymentProcessingPct} step={0.1} suffix="% GMV" onChange={(v) => upd((a) => { a.costs.cogs.paymentProcessingPct = v })} />
        <Num label="Soporte/empresa" value={c.cogs.supportPerCompany} suffix="€/mes" onChange={(v) => upd((a) => { a.costs.cogs.supportPerCompany = v })} />
        <Num label="CAC" value={c.sAndM.cac} step={10} suffix="€/empresa" onChange={(v) => upd((a) => { a.costs.sAndM.cac = v })} />
        <Num label="Marketing/mes" value={c.sAndM.marketingMonthlyBudget} step={100} suffix="€" onChange={(v) => upd((a) => { a.costs.sAndM.marketingMonthlyBudget = v })} />
        <Num label="Ingenieros" value={c.rAndD.engineers} onChange={(v) => upd((a) => { a.costs.rAndD.engineers = v })} />
        <Num label="Salario ing./mes" value={c.rAndD.avgSalaryPerMonth} step={100} suffix="€" onChange={(v) => upd((a) => { a.costs.rAndD.avgSalaryPerMonth = v })} />
        <Num label="Salarios G&A/mes" value={c.gAndA.salariesPerMonth} step={100} suffix="€" onChange={(v) => upd((a) => { a.costs.gAndA.salariesPerMonth = v })} />
        <Num label="Alquiler/mes" value={c.gAndA.rentPerMonth} step={50} suffix="€" onChange={(v) => upd((a) => { a.costs.gAndA.rentPerMonth = v })} />
        <Num label="Herramientas/mes" value={c.gAndA.toolsPerMonth} step={50} suffix="€" onChange={(v) => upd((a) => { a.costs.gAndA.toolsPerMonth = v })} />
        <Num label="Legal/mes" value={c.gAndA.legalPerMonth} step={50} suffix="€" onChange={(v) => upd((a) => { a.costs.gAndA.legalPerMonth = v })} />
      </Group>

      <Group title="Caja">
        <Num label="Caja inicial" value={value.cash.startingCash} step={1000} suffix="€" onChange={(v) => upd((a) => { a.cash.startingCash = v })} />
      </Group>

      {onAnchor && (
        <Button variant="outline" size="sm" onClick={onAnchor} disabled={!canAnchor}>
          Anclar mes 0 a los datos reales
        </Button>
      )}
    </div>
  )
}
