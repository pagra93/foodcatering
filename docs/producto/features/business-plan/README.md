# Business Plan / Modelo Financiero (super admin)

> Feature nueva · Rama: `feat/business-plan`
> Commits: `c750c63` (F1) · `d9be1f4` (F2) · `9484ffd` (F3)

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

- **Motor** `lib/finance/*` (TS puro, testeable): `project.ts` (P&L mensual), `metrics.ts` (unit
  economics + `summarizeModel`), `plan-vs-real.ts` (varianza + semáforo), `scenarios.ts` (comparativa +
  sensibilidad tornado), `index.ts` (`runModel`). Supuestos: `lib/validations/finance.ts` (Zod →
  `Assumptions`). 17 tests Vitest.
- **Datos** `lib/db/queries/admin-business-plan.ts`: escenarios, costes reales, snapshots, y
  `getBusinessPlanActuals` (fusión de lo real).
- **UI** `/admin/business-plan` + `BusinessPlanWorkspace` (selector de escenario, guardar) con tabs:
  **Proyección P&L** (KPIs + gráficas ingresos/coste/EBITDA y caja/runway + tabla 36m), **Métricas**
  (MRR/ARR, churn/NRR, ARPA, CAC, LTV, LTV/CAC, payback, Rule of 40, burn multiple), **Plan vs Real**
  (selector de métrica + tabla/gráfica con varianza + editor de costes reales + capturar snapshot),
  **Escenarios** (comparativa base/optimista/pesimista + tornado de sensibilidad), **Supuestos**
  (edición tipo Excel + "anclar a real").
- **Server Actions** `components/admin/business-plan/actions.ts`: `saveScenarioAction`,
  `saveActualsAction`, `captureMrrSnapshotAction` (gate `business-plan:edit`, auditan).
- **RBAC**: permiso `business-plan:view/edit` (catálogo + section-permissions + sidebar, icono
  `LineChart`). Regenerado `scripts/rbac-catalog.json` para el seed prod.

## Modelo (fórmulas clave)

Por mes: empresas = anterior − churn + altas; MRR = empresas × precio medio (mix normalizado); GMV =
empleados × pedidos × ticket; comisión = GMV × %; ingreso = MRR + comisión; COGS = hosting+soporte por
empresa + %pago×GMV; OpEx = (marketing + CAC×altas) + R&D + G&A; EBITDA = margen − OpEx; caja acumula
el cashflow (+rondas); runway = caja/burn; break-even = primer mes con EBITDA ≥ 0.

## Verificación
- `pnpm type-check` + `pnpm lint` limpios (ficheros de la feature); **193 tests verdes** (17 del motor).
- Migración `20260708150000_business_plan` aplicada a `comidas_dev` + `seed-finance` (3 escenarios) +
  `seed-rbac`. Smoke: ancla real 7 empresas/6 caterings → MRR 868€, break-even 2028-01; snapshot y
  costes reales upsert/delete OK.

## Deuda / notas de alcance
- Los ingresos/crecimiento son reales; los **costes son input manual** (no hay contabilidad conectada).
- El snapshot de MRR construye histórico **hacia adelante** (los meses pasados de MRR no se pueden
  reconstruir). **Cron automático** del snapshot = mejora futura (hoy es botón manual).
- CRUD completo de escenarios (crear/duplicar/borrar/marcar default) y export CSV/print quedan como
  siguiente iteración; ahora se editan los 3 escenarios de sistema.
