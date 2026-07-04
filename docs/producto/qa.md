# QA Audit Trail — comidas

Append-only. Cada /review deja una entrada aqui.

## Format

```
## YYYY-MM-DD — Feature/Story revisada
**Tests**: pass/fail
**Code review**: notas
**Audit**: cumplimiento de rules
**Evaluator score**: X/10 en 4 dimensiones
**Action items**: que hay que arreglar
```

## Reviews

## 2026-07-02 — HU-041 Rediseño de Rating y Reputación (cross-portal, por plato)
**Tests**: `pnpm type-check` + `pnpm lint` limpios en las 5 fases (0 errores; warnings preexistentes). Migración `20260702190000_dish_rating` aplicada a `comidas_dev` sin drift. Rutas `/admin/reputation` y `/empleado/historial` compilan (307→login), sin 500. Verificado el output de la capa canónica con datos reales (558 DishRating tras backfill): reputación catering 3.9, matriz 2×2, leaderboards con señal. Sin tests automatizados nuevos.
**Code review**: capa canónica única (`lib/db/queries/ratings.ts`) reusada en los 4 portales — evita el descuadre histórico entre pantallas. Modelo `DishRating` denormaliza `tenantCatering/tenantEmpresa/serviceDate` para agregar sin joins; `@@unique([orderId,dishId])` hace idempotente el upsert. Server action con RBAC (`emp-rating-own:create`) + validación de propiedad (pedido del empleado y DELIVERED). `dishesFromSelection` extraído a módulo puro para no arrastrar Prisma al cliente. Se borró código muerto (CateringRatingsTab + API route que leían OrderRating).
**Audit**: cumple CLAUDE.md — Server Action para la mutación, filtrado por tenant/propiedad, schema como fuente de verdad, sección nueva cableada al RBAC (sidebar + section-permissions + `rating:view`). Arregla la vista rota que leía `selection.dish_ids`.
**Evaluator score**: 8.5/10 — Correctness alta, Completeness alta (crea el dato + lo explota en 4 portales + insight catering×empresa), Consistency alta (métrica única). −puntos por falta de tests automatizados y por dejar queries legacy de rating sin borrar.
**Action items**:
- [ ] Borrar queries legacy `getGlobalRatingStats/getRatingsByCatering/getRecentRatingComments` (OrderRating) en `admin-quality.ts`.
- [ ] Tests: valorar un pedido entregado → aparece en catering/empresa/admin; el aviso desaparece al valorar.
- [ ] Empleados con sesión abierta: re-login para recibir `emp-rating-own:create`.
- Doc: `docs/producto/features/admin-launch-audit/reputacion.md`.

## 2026-07-02 — HU-039 Rediseño del módulo de Incidencias (cross-portal)
**Tests**: `pnpm type-check` limpio y `pnpm lint` sin errores (solo warnings preexistentes) en las 4 fases. Migración aditiva aplicada a `comidas_dev`; `prisma migrate status` sin drift. No se añadieron tests unitarios/E2E nuevos (feature mayormente UI + queries; verificación por type-check estricto + revisión de flujo).
**Code review**: cambios alineados con las reglas del repo — Server Actions para mutaciones, filtro por tenant en las queries de cada portal, sin `as any`/`@ts-ignore`, RBAC respetado (`permittedAction('emp-incident:create')` en la API nueva de empresa). El catálogo `IncidentReason` deja de estar huérfano. Notificaciones cableadas de forma **no bloqueante** (try/catch) para no romper el flujo de creación/resolución si falla el aviso.
**Audit**: cumple CLAUDE.md (schema como fuente de verdad, taxonomía por FK; nada de stubs silenciosos). Sección nueva cableada al RBAC (sidebar + `section-permissions` + permiso `incident:view`/`incident-reason:view`).
**Evaluator score**: 8.5/10 — Correctness alta (type-check + flujo), Completeness alta (4 portales + admin), Consistency buena (helpers unificados de nombre), −puntos por **constantes aún triplicadas** en los 3 `*-incidencias.ts` (tech-debt consciente) y falta de tests automatizados.
**Action items**:
- [ ] Unificar `INCIDENT_TYPES/SEVERITY_MAP/INCIDENT_STATUS_MAP` en `lib/incidents/constants.ts` (eliminar la triplicación).
- [ ] Refactor `params` async en `app/(empresa)/empresa/incidencias/[id]/page.tsx` (patrón legacy).
- [ ] Tests: crear incidencia con motivo del catálogo → nombre legible en los 4 listados; notificación al resolver.
- Doc: `docs/producto/features/admin-launch-audit/incidencias.md`.

## 2026-07-01 — HU-040 Penalizaciones (detalle + hilo + notificaciones + liquidación)
**Tests**: `pnpm type-check` + `pnpm lint` limpios en todos los commits. Migración aditiva (ActivityMessage + Notification) aplicada a `comidas_dev`. Sin tests automatizados nuevos.
**Code review**: infraestructura de hilo + notificaciones bien encapsulada en `lib/notifications.ts` + `components/shared/activity/` y **reutilizada** después por Incidencias (buena señal de diseño). Control de acceso al hilo por `canAccessEntity` (partes de la entidad); notas internas restringidas a Plati (ROOT). Server actions para aplicar/disputar/resolver.
**Audit**: cumple reglas — mutaciones como Server Actions, filtrado por tenant/partes, sin secretos en cliente. Plazo de disputa centralizado (fin del hardcode duplicado).
**Evaluator score**: 8/10 — buena reutilización y cobertura del flujo; −puntos por falta de tests y por depender de liquidación en diferido (mes en curso puede mostrar 0).
**Action items**:
- [ ] Tests del flujo aplicar→disputar→resolver y del contador de la campana.
- Doc: `docs/producto/features/admin-launch-audit/penalizaciones.md`.


## 2026-07-04 — HU-043 Planes SaaS para CATERINGS (comisión/precio fijo + límite + features)
**Tests**: `pnpm type-check` limpio y `pnpm lint` sin errores (solo warnings preexistentes) en las 4 fases. **145 tests verdes** (`pnpm exec vitest run`). Dos migraciones aplicadas a `comidas_dev`: `20260704120000_catering_plans` (aditiva, con backfill de `Restaurant.saasPlanId`) y `20260704140000_drop_restaurant_commission` (backfill defensivo → drop). Verificado en BD: 7 caterings, **0 sin plan**, columna `commission` eliminada; Settlement idéntico antes/después del backfill.
**Code review**: `SaasPlan` pasa a **tipado** (`planType EMPRESA|CATERING`) reutilizando toda la infra de planes de empresa (features namespaced `cat-*`, entitlements espejo, guard/sidebar/upsell). Cobro del catering **derivado del plan** (COMMISSION → `gross×commissionPct`; FIXED → `flatMonthlyFee`), sin fallback legacy. Alta por **selector de plan** (wizard) en vez de comisión manual. Sin `as any`/`@ts-ignore`; queries de catering filtradas por tenant; RBAC reutiliza `plan:*`.
**Audit**: cumple CLAUDE.md — schema como fuente de verdad (campo suelto `Restaurant.commission` retirado, el cobro vive en el plan como se hizo con `Company.plan`), nada de stubs. Migración no-destructiva con backfill antes del drop.
**Evaluator score**: 8.5/10 — Correctness alta (type-check + tests + verificación en BD), Completeness alta (modelo + cobro + gating + admin CRUD + vista catering + retirada del campo), −puntos por **`maxCompanies` sin enforcement** (deuda consciente: no existe flujo de asignación catering↔empresa) y falta de tests automatizados nuevos.
**Action items**:
- [ ] Cablear `withinLimit(maxCompanies)` cuando se construya "asignar catering a empresa" (crea `CompanyCateringAssignment`).
- [ ] Tests: crear plan de catering (comisión/fijo) → asignar → Settlement con el modelo correcto; candado en Producción/Rutas/Calidad según plan.
- Doc: `docs/producto/features/admin-launch-audit/planes-catering.md`.

## 2026-07-04 — HU-044 Asignar catering ↔ empresa (desde admin) + enforcement de maxCompanies
**Tests**: `pnpm type-check` limpio y `pnpm lint` sin errores (solo warnings preexistentes). Sin cambios de schema (no migración). Smoke test en `comidas_dev`: `getCompanyCateringAssignments`/`getAssignableCaterings` devuelven asignados e "asignables" con su uso vs límite correctos; permiso `empresa:assign-catering` sembrado.
**Code review**: mutaciones como **Server Actions** (no fetch desde cliente), gate por permiso con `permissionsInclude` + UI que oculta controles sin permiso; enforcement del límite del plan en el punto de asignación (`getCateringPlanUsage` + `withinLimitOf`) — no en la UI, que solo lo refleja. Reactivación de asignación histórica en vez de duplicar (respeta el `@@unique(companyId, tenantCatering)`). Auditoría en ambas acciones. `revalidatePath` corregido al tenantId (la ruta `/admin/empresas/[id]` usa tenantId, no `Company.id`).
**Audit**: cumple CLAUDE.md — acción no-pública cableada al RBAC (catálogo→seed→enforcement), no `if role===X`. Soft-delete con trazabilidad (`deactivatedBy/At/Reason`).
**Evaluator score**: 8.5/10 — Correctness alta (type-check + smoke), cierra deuda real de HU-043; −puntos por falta de tests automatizados y por no abrir (aún) el flujo desde el portal empresa (fuera de alcance).
**Action items**:
- [ ] Tests del enforcement: catering al límite → asignación rechazada (server action) y opción deshabilitada (UI).
- [ ] (Opcional) permitir que la empresa elija/solicite proveedor reutilizando estas queries/acciones.
- Doc: `docs/producto/features/admin-launch-audit/asignar-catering-empresa.md`.

## 2026-07-04 — HU-045 Centro de facturación del admin (auditoría Liquidaciones y Comisiones)
**Tests**: `pnpm type-check` limpio y `pnpm lint` sin errores (solo warnings preexistentes) en las 4 fases. **145 tests verdes**. **Sin migraciones** de schema (la "vencida" se deriva al vuelo; no se persiste). Permisos nuevos (`admin-invoice:view`, `saas-invoice:view`) sembrados en `comidas_dev`.
**Code review**: correcciones de dinero bien acotadas — comisión sobre base imponible (`Σ Invoice.subtotal`), YTD por `period`, "vencida" derivada por fecha en un único helper (`lib/billing/status.ts`) reutilizado por admin, catering y empresa (fin de la duplicación en ≥4 sitios). Queries cross-tenant `admin-invoices.ts` siguen el molde de settlements/saas-invoices. RBAC con claves propias de admin para no colisionar con el `invoice:view` del catering. Correlativo SaaS con reintento ante P2002. Edición de tasas cableada a la acción ya existente (`upsertTaxRuleAction`, gate `tax:edit`).
**Audit**: cumple CLAUDE.md — mutaciones como Server Actions, sección nueva cableada al RBAC (catálogo→seed→section-permissions), sin `as any`. Se gatearon huecos (`/admin/billing` raíz, `saas-invoices`).
**Evaluator score**: 8.5/10 — Correctness alta (fixes de cálculo verificados en dev), Completeness alta (Facturas + Estado de cuentas + fixes + pulido), −puntos por deuda anotada (IVA comida 21vs10 pendiente de negocio, Churn/LTV, componentes huérfanos de empresa, MRR anual) y falta de tests automatizados de los cálculos.
**Action items**:
- [ ] Decidir IVA de la comida (21% vs 10% vía TaxRule) — decisión de negocio.
- [ ] Tests del cálculo de comisión (base sin IVA) y de la derivación de "vencida".
- [ ] Cablear o retirar los componentes huérfanos de empresa (BillingConciliation/MonthlyBreakdown/KPIs).
- Doc: `docs/producto/features/admin-launch-audit/facturacion-centro.md`.
