# Centro de facturación del admin (Liquidaciones y Comisiones): auditoría + mejoras

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-045**
> Estado: **hecho** (2026-07-04) · Rama: `chore/pmx10-v3-migration`
> Commits: `ff273c0` (F1) · `7ee4ec6` (F2) · `eecda06` (F3) · `bf8daf1` (F4)

## Por qué (auditoría)

La sección `/admin/billing/*` debía ser **"donde Plati revisa las facturas, pendientes y totales"**.
Cubría bien los **ingresos de Plati** (Liquidaciones, Facturas SaaS, Comisiones, Planes, Tasas,
Métricas — todo con datos reales), pero tenía un **hueco central** y **errores de cálculo** que la
hacían poco fiable. Los tres flujos de dinero: (a) empresa→catering por la comida (`Invoice`),
(b) catering→Plati por comisión (`Settlement`), (c) empresa→Plati por suscripción (`SaasInvoice`).

**Decisiones (Pablo):** centro de facturación completo (Facturas + Estado de cuentas); comisión sobre
**base imponible**; "vencidas" **al vuelo**; IVA de la comida **se deja como está (21%)** — Plati presta
el SaaS, no la comida.

## Hallazgos corregidos

- 🔴 **Comisión sobre total con IVA** → ahora sobre **base imponible** (`Σ Invoice.subtotal`). El IVA lo
  recauda el catering para Hacienda, no es facturación suya (`generateMonthBillingAction`). En dev, la
  comisión 5% baja de 45.43€ a 41.30€.
- 🔴 **`OVERDUE` nunca se asignaba** (KPIs "vencidas" siempre 0) → **derivado al vuelo** por fecha
  (`lib/billing/status.ts` `effectiveStatus`), sin cron ni escritura en BD.
- 🔴 **Admin sin vista de las facturas de comida** → nueva sección **Facturas** (cross-tenant).
- 🟠 **YTD por `createdAt`** descuadraba el ejercicio → ahora por **`period`**, como gross y series.
- 🟡 **Edición de tasas** era un stub → **cableada** (`upsertTaxRuleAction` + `TaxRuleManager`).
- 🟡 **Correlativo SaaS** con carrera → **reintento** ante colisión de número.
- 🟡 **Navegación**: "Facturas SaaS" no estaba en el sidebar ni gateada; `/admin/billing` raíz sin
  gate → arreglado. Mapeo de estado duplicado en ≥4 sitios → **centralizado**.

## Qué se hizo — por fases

### Fase 1 — Correctness (`ff273c0`)
Comisión sobre base imponible; `lib/billing/status.ts` (estado efectivo + mapas `INVOICE_STATUS`/
`SETTLEMENT_STATUS`/`SAAS_STATUS` reutilizando `StatusBadge`); KPIs de liquidaciones/SaaS con "vencida"
por fecha; YTD del dashboard por `period`.

### Fase 2 — Sección "Facturas de comida" (`7ee4ec6`)
`lib/db/queries/admin-invoices.ts` (`getAdminInvoices`/`getAdminInvoicesKPIs`/`getInvoiceFilterOptions`,
cross-tenant, molde de settlements/saas-invoices). Página `/admin/billing/invoices` (KPIs, filtros por
catering/empresa/estado/periodo, tabla con base/IVA/total + estado derivado + PDF, paginación). RBAC:
permisos `admin-invoice:view` y `saas-invoice:view` en portal ADMIN (claves propias para no colisionar
con el `invoice:view` del catering) + seed; sidebar + section-permissions (incluida la raíz con `exact`)
+ tarjeta en el dashboard.

### Fase 3 — "Estado de cuentas" (`eecda06`)
`getAccountsOverview()` (facturado/cobrado/pendiente/vencido por flujo). Página
`/admin/billing/estado-cuentas`: dos KPIs de cabecera (pendiente/vencido a favor de Plati) + tres
tarjetas de flujo con barra de cobro y enlace al detalle.

### Fase 4 — Pulido y cierre de stubs (`bf8daf1`)
Estado centralizado también en catering `CateringBillingTabs` y empresa `BillingTabs`; edición de tasas
cableada (`TaxRuleManager` + dialog); correlativo SaaS robusto (reintento ante P2002).

## Ficheros clave
- Núcleo: `lib/billing/status.ts`, `lib/db/queries/admin-invoices.ts`, `lib/db/queries/admin-billing.ts`
  (`getAccountsOverview`), `components/admin/billing/actions.ts`.
- Páginas: `app/(admin)/admin/billing/{invoices,estado-cuentas,taxes,settlements,saas-invoices,page}.tsx`.
- UI: `components/admin/billing/TaxRuleManager.tsx`, `components/shared/StatusBadge.tsx` (reutilizado).
- RBAC/nav: `lib/auth/permission-catalog.ts`, `lib/auth/section-permissions.ts`,
  `components/admin/AdminSidebar.tsx`, `prisma/seed-rbac.ts`.

## Verificación
- `pnpm type-check` + `pnpm lint` limpios y **145 tests verdes** en las 4 fases.
- Smoke en `comidas_dev`: comisión base vs total (41.30€ vs 45.43€); facturas cross-tenant listadas;
  estado de cuentas cuadra con los tres detalles; permisos `admin-invoice:view`/`saas-invoice:view`
  sembrados. **Sin migraciones** de schema (todo derivado al vuelo).

## Deuda consciente (anotada, no en esta pasada)
- **IVA de la comida (21% vs 10%)**: la generación de `Invoice` (portal catering) usa 21% fijo. Decisión
  de negocio pendiente; Plati presta el SaaS, no la comida.
- **Churn & LTV**: sigue placeholder en Métricas (requiere histórico ≥6 meses).
- **Componentes huérfanos de empresa** (`BillingConciliation`, `BillingMonthlyBreakdown`, `BillingKPIs`):
  existen sin usarse; cablearlos o retirarlos en una pasada del portal empresa.
- **MRR/ARR**: usa `monthlyPrice` e ignora planes anuales (no hay ciclo de facturación por empresa).
- **Generación de `Invoice`** sigue siendo manual del catering; no hay validación cruzada
  pedidos-entregados ↔ facturas antes de liquidar.
