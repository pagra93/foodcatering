# Planes SaaS dinámicos (como roles): features + cuotas + a medida + cobro

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-042**
> Estado: **hecho** (2026-07-03) · Rama: `chore/pmx10-v3-migration`
> Commits: `6a0ac64` (F1) · `848d18b` (F2) · `413ef1d` (F3) · `3f0a105` (F4)

## Por qué (auditoría)

El módulo **Planes SaaS** (`/admin/billing/plans`) no servía como control real:
1. La asociación empresa↔plan era por **enum fijo** `CompanyPlan` (STARTER/GROWTH/ENTERPRISE) →
   **imposible crear planes a medida**.
2. **Cero enforcement**: `maxEmployees`/`maxOrdersMonth`/`features` se guardaban y mostraban pero
   **no limitaban nada**.
3. La página era **solo lectura** (no crear/editar).
4. El **cobro sí existía** (`SaasInvoice` mensual Plati→empresa con `SaasPlan.monthlyPrice`), solo
   faltaba editar precio desde UI y re-clavar la key al migrar.

**Objetivo (Pablo):** que el plan funcione **como los roles** — según el plan, la empresa ve/limita
funcionalidades; planes **editables** y **a medida**; con **precio** que se cobra. Decisiones:
planes dinámicos (enum→FK), cuotas de empleados/sedes/caterings, features de todo el portal empresa,
**bloqueo duro + upsell**.

## Correspondencia con el RBAC (patrón imitado)

| RBAC | Planes |
|---|---|
| `permission-catalog.ts` | `lib/plans/feature-catalog.ts` (15 features / 7 categorías, core vs pago) |
| `Role` + `RolePermission` | `SaasPlan` + `PlanFeature` (join) + columnas de límite |
| `resolveUserPermissions`→`permissions[]` (por usuario) | `getCompanyEntitlements(tenantEmpresa)`→`{features,limits}` (por empresa) |
| `permittedAction`/`permissionsInclude` | `companyHasFeature` / `withinLimit` |
| `section-permissions`+middleware | `section-features.ts` + guard de página + candado en sidebar |
| `RoleForm`/`PermissionPicker`/`role-actions` | `PlanForm`/`FeaturePicker`/`plan-actions` |
| `seed-rbac.ts` | `seed-plans.ts` |

## Qué se hizo — por fases

### Fase 1 — Modelo dinámico + catálogo + entitlements (`6a0ac64`)
- **Schema** (migración `20260703120000_dynamic_plans` con **backfill perfecto**): `SaasPlan.code`
  enum→**String libre** + `scope SYSTEM/CUSTOM` + `tenantEmpresa` (plan privado) + `maxSites`/
  `maxCaterings`; nuevo **`PlanFeature`** (join); `Company.saasPlanId` FK; `SaasInvoice.planCode`
  enum→String. `Company.plan` (enum) queda **deprecado/legacy** (ya sin uso).
- **[`lib/plans/feature-catalog.ts`](../../../../lib/plans/feature-catalog.ts)**: mapea TODO el portal
  empresa + `SYSTEM_PLANS` (para seed). **[`lib/plans/entitlements.ts`](../../../../lib/plans/entitlements.ts)**:
  `getCompanyEntitlements`/`companyHasFeature`/`withinLimit`/`PlanLimitError`. Seed de los 3 planes.

### Fase 2 — Enforcement duro + upsell (`848d18b`)
- **Cuotas**: `createEmployee` y la API de sedes bloquean (403 + "mejora tu plan") vía
  `withinLimit`. **Features**: guard `requireCompanyFeature` (→ `UpgradeLock`), candado en el sidebar
  empresa, guard de página (Auditoría Fiscal, Actividad). **Visibilidad**: `PlanUsageCard` en
  Facturación (uso vs límites + features).

### Fase 3 — Gestión de planes como roles (`413ef1d`)
- `/admin/billing/plans` deja de ser solo lectura: lista + crear/editar. `FeaturePicker` (matriz de
  features por categoría) + `PlanForm` (precio + límites + features). `plan-actions`
  (create/update/delete, gate `plan:*`, `logAudit`). Planes SYSTEM no borrables; CUSTOM sí.
  **Planes a medida**: crear con `scope CUSTOM` + `code` único.

### Fase 4 — Dependencias + asignación + cobro (`3f0a105`)
- Asignación de plan a la empresa desde `CompanyForm` (selector por `saasPlanId`). MRR/ARR
  (`admin-billing`), generación de `SaasInvoice` y `empresa-billing` repuntados a `saasPlanId`.
  Validación `createCompanySchema` a `saasPlanId`. `companies.ts` expone el plan por nombre + id.
  MRR verificado idéntico (**1643 €/mes**).

## Modelo de datos (referencia)

- `SaasPlan`: `code String @unique`, `scope PlanScope`, `tenantEmpresa?`, `monthlyPrice`/`yearlyPrice`,
  `maxEmployees`/`maxSites`/`maxCaterings` (null=∞), `supportLevel`, `active`.
- `PlanFeature`: `@@id([planId, featureKey])` — features de pago habilitadas (las core son implícitas).
- `Company.saasPlanId` FK. `Company.plan` (enum) **deprecado**.

## Verificación

- `pnpm db:migrate` (backfill: cada empresa mantiene su plan; 0 sueltas). `pnpm tsx prisma/seed-plans.ts`.
  `pnpm type-check` + lint limpios por fase. **Reiniciar `pnpm dev` tras la migración** (cliente Prisma).
- Admin: crear plan a medida → asignarlo a una empresa; editar plan de sistema.
- Empresa: con Starter, empleado nº21 → **bloqueo + upsell**; Auditoría Fiscal con candado; subir de
  plan lo desbloquea. MRR/ARR cuadran.

## Notas / tech-debt

- **`Company.plan` (enum) queda como columna legacy** sin uso (removible en limpieza futura, requiere
  reescribir 3 seeds + migración de columna). Idem `SaasPlan.maxOrdersMonth` (no se enforca aún).
- Cuota de **caterings**: el límite existe y se muestra, pero la asignación de catering es admin-driven
  (sin path de creación empresa) → enforcement pendiente si se decide.
- La **landing** (`lib/landing/content.ts` `pricingTiers`) sigue desacoplada (marketing, precio por
  empleado).

## Enlaces
- Núcleo: [`lib/plans/`](../../../../lib/plans/) · Admin CRUD: [`components/admin/billing/`](../../../../components/admin/billing/) (PlanForm, FeaturePicker, plan-actions)
- Enforcement: `lib/plans/guard.tsx`, `components/empresa/plan/` (UpgradeLock, PlanUsageCard)
- Relacionado: patrón RBAC en `lib/auth/permission-catalog.ts` · memoria `rbac-dynamic`
