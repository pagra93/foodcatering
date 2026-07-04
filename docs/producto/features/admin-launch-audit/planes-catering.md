# Planes SaaS para CATERINGS: comisión/precio fijo + límite de empresas + features

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-043**
> Estado: **hecho** (2026-07-04) · Rama: `chore/pmx10-v3-migration`
> Commits: `5fb15e4` (F1) · `30efd7f` (F2) · `3dd097e` (F3) · `de108fc` (F4)

## Por qué (auditoría)

Ya existían **planes SaaS para empresas** ([`planes-saas.md`](./planes-saas.md)), pero el catering
**no tenía plan**:

1. Su cobro a Plati vivía en un campo suelto **`Restaurant.commission`** (Decimal, def 5%) que
   alimentaba el **`Settlement`** mensual (`commissionAmount = Σ(Invoice.total del mes) × commission`).
2. **No había límite** de nº de empresas servidas ni **gating de funcionalidades** en el portal catering.
3. El catering **no veía su plan** (sí sus facturas y liquidaciones, pero no las condiciones).

**Objetivo (Pablo):** planes de catering que definan **cuántas empresas** puede servir, **cómo se le
cobra** y **qué funcionalidades** tiene; y que el catering **vea su plan + facturación** como la empresa.

**Decisiones confirmadas:**
- **Cobro (por plan)**: **ambos modelos** — comisión **%** o **precio fijo mensual** (cada plan elige).
- **Base de la comisión**: sobre **lo facturado en el mes** (Σ `Invoice.total`) — como el Settlement de hoy.
- **Límite**: nº de **empresas** servidas (`maxCompanies`).
- **Features gated** (catering): Producción (KDS), Repartos (rutas), Calidad y Reputación, Analítica,
  Branding/API. **Core** (siempre): Dashboard, Platos, Menús, Empresas, Incidencias, Facturación.

## Diseño: `SaasPlan` pasa a ser **tipado**

Un único `SaasPlan` con `planType EMPRESA|CATERING` reutiliza toda la infra de los planes de empresa:

| Empresa (`planType = EMPRESA`) | Catering (`planType = CATERING`) |
|---|---|
| `monthlyPrice` / `yearlyPrice` | `pricingModel COMMISSION\|FIXED` |
| `maxEmployees` / `maxSites` / `maxCaterings` | `commissionPct` (si COMMISSION) / `flatMonthlyFee` (si FIXED) |
| `Company.saasPlanId` | `maxCompanies` · `Restaurant.saasPlanId` |
| `getCompanyEntitlements` | `getCateringEntitlements` / `getCateringPlanUsage` |

Features namespaced por portal (`cat-*`) para evitar colisiones; core implícitas en runtime,
no-core en `PlanFeature`.

## Qué se hizo — por fases

### Fase 1 — Modelo tipado + catálogo/entitlements + seed/backfill
- **Schema** (`20260704120000_catering_plans`): enums `PlanType`/`PricingModel`; `SaasPlan` gana
  `planType` + campos de catering; `Restaurant.saasPlanId` FK. Backfill: todos los caterings (5%) →
  plan `cat-estandar` → Settlement idéntico antes/después.
- `lib/plans/feature-catalog.ts`: `portal` en features/categorías; 12 features de catering; 4 planes
  de sistema de catering (`cat-basico` 8%/3, `cat-estandar` 5%/10, `cat-premium` 3%/∞, `cat-cuota-fija`
  299 €/mes). Helpers por portal.
- `lib/plans/entitlements.ts`: `getCateringEntitlements` / `cateringHasFeature` / `getCateringPlanUsage`.
- `prisma/seed-plans.ts`: siembra planes de catering + backfill `Restaurant.saasPlanId`.

### Fase 2 — Cobro por plan + gating de features
- **Settlement por plan** (`generateMonthBillingAction`): `COMMISSION` → `gross × commissionPct`;
  `FIXED` → `flatMonthlyFee` (rate 0). Igual en la conciliación de empresa (`empresa-facturacion.ts`,
  solo COMMISSION).
- **Gating** (espejo empresa): `section-features.ts` `CATERING_FEATURE_RULES`; `requireCateringFeature`;
  candado en `CateringSidebar` (el layout resuelve entitlements); guard en `produccion`/`rutas`/`calidad`;
  `UpgradeLock` con CTA → `/catering/facturacion`.
- **Límite de empresas**: se muestra y cuenta; **no se enforca al asignar** porque hoy no existe flujo
  que cree `CompanyCateringAssignment` (solo seeds). Listo para cablear `withinLimit(maxCompanies)`.

### Fase 3 — Admin gestiona planes por tipo (`3dd097e`)
- `/admin/billing/plans` separa **Planes de empresa** y **Planes de catering** (crear por tipo).
- `PlanForm` adapta campos por `planType`; `FeaturePicker` filtra por portal; `plan-actions`
  (create/update) aceptan `planType` + campos de catering (el tipo no cambia al editar).
- **Asignación**: selector de plan (`Restaurant.saasPlanId`) en `CateringEditForm`, sustituyendo el
  campo de comisión manual.

### Fase 4 — El catering ve su plan + retirada de `Restaurant.commission` (`de108fc`)
- **`CateringPlanCard`** en `/catering/facturacion` (espejo de `PlanUsageCard`): cobro (comisión %/
  precio fijo), empresas usadas vs máx., funcionalidades incluidas.
- **Retirada de `Restaurant.commission`** (como se hizo con `Company.plan`): migración
  `20260704140000_drop_restaurant_commission` (backfill defensivo → drop). El **alta** (wizard) usa un
  **selector de plan**; `createCatering`/validaciones aceptan `saasPlanId`. Display (lista, detalle,
  `OperationalStatus`) muestra el cobro **derivado del plan**. Sin fallback legacy (sin plan → cobro 0).
  Seeds asignan `saasPlanId`.

## Ficheros clave

- **Núcleo**: `lib/plans/feature-catalog.ts`, `lib/plans/entitlements.ts`, `lib/plans/section-features.ts`,
  `lib/plans/guard.tsx`.
- **Cobro**: `components/admin/billing/actions.ts`, `lib/db/queries/empresa-facturacion.ts`.
- **Gating**: `components/catering/CateringSidebar.tsx`, `app/(catering)/catering/layout.tsx`,
  páginas `produccion`/`rutas`/`calidad`.
- **Admin CRUD**: `app/(admin)/admin/billing/plans/**`, `components/admin/billing/{PlanForm,plan-actions}`,
  `lib/db/queries/admin-plans-taxes.ts` (`getCateringPlanOptions`), `components/admin/caterings/CateringEditForm.tsx`.
- **Alta**: `components/admin/caterings/CateringWizard.tsx`, `app/(admin)/admin/caterings/new/page.tsx`,
  `lib/db/queries/caterings.ts`, `lib/validations/catering.ts`.
- **Portal catering**: `app/(catering)/catering/facturacion/page.tsx`, `components/catering/plan/CateringPlanCard.tsx`.

## Verificación

- `pnpm prisma migrate deploy` (backfill: comisión efectiva intacta; Settlement igual antes/después) +
  `pnpm db:generate` + **reiniciar `pnpm dev`**.
- `pnpm type-check` + **145 tests** verdes. BD `comidas_dev`: 7 caterings, 0 sin plan, columna
  `commission` eliminada.
- Admin: crear plan de catering (comisión % o fijo) y asignarlo; el tipo Empresa sigue igual.
- Catering: `/catering/facturacion` muestra su plan; Producción/Rutas/Calidad con candado si el plan
  no las incluye.

## Deuda consciente

- **Límite `maxCompanies`**: definido, mostrado y contado, pero **sin enforcement al asignar** — no
  existe flujo de creación de `CompanyCateringAssignment` en la app. Cablear `withinLimit(maxCompanies)`
  cuando se construya "asignar catering a empresa".
