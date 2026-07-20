# Business Plan / Modelo Financiero (super admin)

> Feature nueva · Rama: `feat/business-plan`
> Commits: `c750c63` (F1) · `d9be1f4` (F2) · `9484ffd` (F3) · `2eda61b` (docs/cierre HU-049)
> Mejoras: `85884b0` (comisión por plan + calculadora "¿y si?") · `83925c3` (modo menús/día)

## Qué es

Sección `/admin/business-plan` para trabajar el business plan de Plati como una startup: un **modelo
financiero editable (tipo Excel)** con todas las variables, que compara lo **planificado** con lo
**real** de la plataforma, y muestra rentabilidad, unit economics y escenarios. Pensado como un CFO/
inversor (referencias: a16z SaaS metrics, Point Nine SaaS model, Rule of 40, LTV/CAC, P&L de startup).

## Principio de diseño

**No se persiste nada derivado.** Solo se guardan los *inputs*: supuestos por escenario
(`FinancialScenario.assumptions` JSON), costes reales mensuales (`FinancialActual`) y snapshots de MRR
(`MrrSnapshot`). La proyección, las métricas y el plan-vs-real se **recomputan** en el motor puro
`lib/finance/*`, que corre igual en SSR y en cliente (`useMemo` → recálculo instantáneo al editar).

## Datos: real vs planificado

- **REAL** (de la plataforma): ingresos (comisiones + SaaS neto), GMV, y crecimiento (altas/bajas de
  empresas). Vía `getBillingMonthlySeries` + `getDashboardCharts`. MRR/empresas/caterings reales solo
  del mes actual salvo que se capturen **snapshots** mensuales (`MrrSnapshot`) que construyen la serie
  hacia adelante.
- **PLANIFICADO / MANUAL**: los **costes/OPEX** de Plati **no existen** en el sistema → se planifican en
  los supuestos y, además, se introducen los **reales a mano** (`ActualsEditor` → `FinancialActual`)
  para un P&L real (rentabilidad/EBITDA/burn vs plan).

## Estructura

- **Motor** `lib/finance/*` (TS puro, testeable): `project.ts` (P&L mensual + `cateringPricing`),
  `metrics.ts` (unit economics + `summarizeModel`), `plan-vs-real.ts` (varianza + semáforo),
  `scenarios.ts` (comparativa + sensibilidad tornado), `what-if.ts` (`whatIfCommission` retroactivo),
  `index.ts` (`runModel`). Supuestos: `lib/validations/finance.ts` (Zod → `Assumptions`). Tests Vitest
  en `tests/unit/lib/finance-*.test.ts` (project incl. `cateringPricing`/`byMenus`, what-if, scenarios,
  plan-vs-real).
- **Datos** `lib/db/queries/admin-business-plan.ts`: escenarios, costes reales, snapshots, y
  `getBusinessPlanActuals` (fusión de lo real).
- **UI** `/admin/business-plan` + `BusinessPlanWorkspace` (selector de escenario, guardar) con tabs:
  **Proyección P&L** (KPIs + gráficas ingresos/coste/EBITDA y caja/runway + tabla mensual con columna
  **Menús/día**), **Métricas** (MRR/ARR, churn/NRR, ARPA, CAC, LTV, LTV/CAC, payback, Rule of 40, burn
  multiple), **Plan vs Real** (selector de métrica + tabla/gráfica con varianza + editor de costes
  reales + capturar snapshot), **¿Y si? comisiones** (calculadora retroactiva sobre datos reales — ver
  abajo), **Escenarios** (comparativa base/optimista/pesimista + tornado de sensibilidad), **Supuestos**
  (edición tipo Excel + "anclar a real" + toggle de modo de volumen).
- **Server Actions** `components/admin/business-plan/actions.ts`: `saveScenarioAction`,
  `saveActualsAction`, `captureMrrSnapshotAction` (gate `business-plan:edit`, auditan).
- **RBAC**: permiso `business-plan:view/edit` (catálogo + section-permissions + sidebar, icono
  `LineChart`). Regenerado `scripts/rbac-catalog.json` para el seed prod.

## Modelo (fórmulas clave)

Por mes: empresas = anterior − churn + altas; MRR = empresas × precio medio (mix normalizado); GMV =
menús/mes × ticket; comisión = GMV × % mezclado + cuota fija; ingreso = MRR + comisión; COGS =
hosting+soporte por empresa + %pago×GMV; OpEx = (marketing + CAC×altas) + R&D + G&A; EBITDA = margen −
OpEx; caja acumula el cashflow (+rondas); runway = caja/burn; break-even = primer mes con EBITDA ≥ 0.

**Menús/mes** según el modo de volumen (`growth.volumeMode`): `byCompany` = empresas × empleados ×
pedidos/mes; `byMenus` = menús/día × días laborables, creciendo MoM por `menusGrowthRatePct`.
**Comisión mezclada** (`cateringPricing`): `% = Σ(peso_plan × comisión_plan) / Σpesos` sobre TODO el
GMV (los caterings de cuota fija aportan 0% aquí) + `cuota_fija × (peso_fija/Σpesos) × caterings`.

## Mejoras (comisiones + volumen)

Tres extensiones para **experimentar con los números** como pidió Pablo:

1. **Comisión por plan de catering** (proyección). Se sustituyó el `avgCommissionPct` único por la
   estructura real: `pricing.cateringCommission` (básico 8% / estándar 5% / premium 3%),
   `cateringFixedFee` (299 €/mes) y `cateringMix` (reparto en pesos). Editable en Supuestos → grupo
   "Planes de catering". El motor mezcla el % ponderado y suma la cuota fija por su peso.
2. **Calculadora "¿Y si?" sobre datos REALES** (`lib/finance/what-if.ts` → `whatIfCommission`). Coge el
   GMV y la comisión **realmente facturados** mes a mes (de `actuals`) y les aplica una comisión
   hipotética → € exacto de más/menos **sobre lo ya facturado** (retroactivo, no proyección), con delta
   total y anualizado. Tab **"¿Y si? comisiones"**.
3. **Modo de volumen "menús/día"** (`growth.volumeMode = 'byMenus'`). Permite meter menús/día directos
   (p. ej. 1000) + días laborables/mes + crecimiento MoM, sin cuadrar empresas × empleados. Los dos
   motores de ingreso quedan **desacoplados**: en `byMenus` el GMV/comisión lo fija el volumen de menús,
   mientras el MRR SaaS y los costes por empresa siguen escalando con el nº de empresas. La proyección
   añade columna **Menús/día** como lector.

> Nota de diseño del tornado: la sensibilidad pasó a medir los **ingresos totales del último mes**
> (SaaS + comisión) en vez del ARR (que es solo SaaS y no reflejaba la comisión).

## Verificación
- `pnpm type-check` + `pnpm lint` limpios; **204 tests verdes** (motor: project/what-if/scenarios/
  plan-vs-real).
- Migración `20260708150000_business_plan` aplicada a `comidas_dev` + `seed-finance` (3 escenarios,
  re-sembrados con la estructura de pricing y volumen nueva) + `seed-rbac`. Smoke: comisión mezclada
  4,70% (mix por defecto) → 6,20% al desplazar el mix al plan del 8%; modo `byMenus` 1000 menús/día ×
  22 días = 198.000 € GMV/mes; what-if aplica comisión hipotética al GMV real con delta anualizado.

## Deuda / notas de alcance
- Los ingresos/crecimiento son reales; los **costes son input manual** (no hay contabilidad conectada).
- El snapshot de MRR construye histórico **hacia adelante** (los meses pasados de MRR no se pueden
  reconstruir). **Cron automático** del snapshot = mejora futura (hoy es botón manual).
- CRUD completo de escenarios (crear/duplicar/borrar/marcar default) y export CSV/print quedan como
  siguiente iteración; ahora se editan los 3 escenarios de sistema.
