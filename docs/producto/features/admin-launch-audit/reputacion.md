# Reputación — rediseño completo de Rating y Reputación (cross-portal)

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-041**
> Estado: **hecho** (2026-07-02) · Rama: `chore/pmx10-v3-migration`
> Commits: `6459052` (F1) · `5ab465e` (F2) · `8e417d2` (F3) · `cd75735` (F4) · `e424e9a` (F5)

## Por qué (el módulo no servía)

Auditoría del módulo "Rating y Reputación" — problemas confirmados:

1. **Nadie creaba valoraciones.** `OrderRating` solo se generaba en los seeds; no existía UI ni
   server action para que el empleado valorara → todos los datos eran ficticios.
2. **Era por pedido, no por plato.** `OrderRating` (orderId único + rating global + sabor/porción/
   presentación) no tenía `dishId` → imposible saber qué plato gusta.
3. **La única vista "por plato" estaba rota.** `getCateringDishRatings` leía
   `order.selection.dish_ids`, pero los pedidos guardan `selection.{first,second,dessert}.dishId`
   → siempre vacía.
4. **`Restaurant.averageRating` deprecado/stale** (solo se escribía en seed).
5. No conectaba la relación clave: **cómo puntúa cada empresa a su catering**.

**Visión (Pablo):** los empleados puntúan **cada plato después de cada día** → datos reales para que
el catering mejore su menú, la empresa vea el servicio que recibe y Plati vea la reputación por
catering y por relación **catering×empresa**. Ventaja: `Order.selection` ya lleva `dishId` por plato.

## Decisiones confirmadas

| Decisión | Elección |
|---|---|
| Detalle | **1 estrella por plato (1–5) + comentario del día** opcional (rápido, uso diario). |
| Entrada del empleado | **Historial** (botón Valorar) **+ aviso proactivo** en la portada de menús. |
| Ubicación admin | **Sección propia "Reputación"** (fuera de "Calidad y SLAs"). |

## Qué se hizo — por fases

### Fase 1 — Modelo + capa canónica + datos (`6459052`)
- **Schema**: nuevo modelo **`DishRating`** (una fila por plato valorado): `orderId`, `dishId`,
  `course`, `employeeId`, `rating` (1–5), `comment?`, y **denormalizado** `tenantCatering` /
  `tenantEmpresa` / `serviceDate` para agregar rápido. `@@unique([orderId, dishId])`. `OrderRating`
  queda como legacy. Migración aditiva `20260702190000_dish_rating`.
- **[`lib/db/queries/ratings.ts`](../../../../lib/db/queries/ratings.ts)** — fuente única reusada en
  los 4 portales: `getCateringReputation` / `getCateringDishLeaderboard` /
  `getCateringReputationByCompany` / `getCateringComments`, `getCompanyCateringReputation`,
  `getGlobalReputation` / `getReputationByCatering` / `getReputationCompanyMatrix` /
  `getGlobalDishLeaderboard` / `getGlobalRatingComments`, `getEmployeePendingRatings`.
- Repunta `getCateringQualityMetrics` a `DishRating`; arregla `getCateringDishRatings` (leía el JSON
  inexistente). `dishesFromSelection` movido a `lib/ratings/selection.ts` (puro, cliente+servidor).
- **Datos**: `seed-demo` genera `DishRating`; backfill no destructivo de las 283 `OrderRating`
  existentes → 558 `DishRating` en dev (nada aparece vacío).

### Fase 2 — El empleado valora (el corazón) (`5ab465e`)
- **Server action `rateDishesAction`** (`components/empleado/rating/actions.ts`): valida que el
  pedido es del empleado y está `DELIVERED`; upsert de un `DishRating` por plato + comentario. RBAC:
  nuevo permiso **`emp-rating-own:create`** (sembrado en el rol empleado).
- **`RateMealDialog`** (estrellas por plato + comentario) reutilizable. **Historial**: columna
  "Valoración" (botón Valorar / estado Valorado ⭐). **Menús**: aviso proactivo `PendingRatingPrompt`
  ("valora la comida de ayer") con `getEmployeePendingRatings`.

### Fase 3 — El catering ve (`8e417d2`)
- Pestaña de Calidad del catering: platos mejor/peor valorados **reales**, comentarios con el plato,
  y **"Valoración por empresa cliente"** (`getCateringReputationByCompany`). Retirada la card muerta
  de dimensiones.

### Fase 4 — La empresa ve (`cd75735`)
- Nuevo `CompanyRatingsTab` (server-driven, `getCompanyCateringReputation`): media + tendencia
  mensual + distribución de estrellas + platos que más/menos gustan a la plantilla + comentarios.
  Elimina el `CateringRatingsTab` cliente y la API route `/api/empresa/catering/ratings` (muertos,
  leían OrderRating por pedido).

### Fase 5 — Admin: sección propia "Reputación" (`e424e9a`)
- `git mv quality/ratings → reputation`; item top-level en el sidebar (icono Star, permiso
  `rating:view`), `section-permissions`, breadcrumbs; subitem retirado de Calidad.
- Página reescrita: media global + distribución, **matriz catering×empresa** (insight clave),
  ranking de caterings, leaderboards de platos de la plataforma, comentarios. "Calidad y SLAs" queda
  con auditorías + penalizaciones.

## Modelo de datos (referencia)

`DishRating`: `orderId`→Order, `dishId`→Dish, `course DishCourse`, `employeeId`→Employee,
`tenantCatering`/`tenantEmpresa`/`serviceDate` (denormalizados), `rating Int` 1–5, `comment?`.
`@@unique([orderId, dishId])`. `OrderRating` se conserva como legacy (no se lee en el sistema nuevo).

## Verificación

- `pnpm type-check` + `pnpm lint` limpios en las 5 fases; migración aplicada a `comidas_dev` sin drift.
- Rutas `/admin/reputation` y `/empleado/historial` compilan (307 → login), sin 500.
- Datos reales en dev (558 DishRating): catering reputation 3.9, matriz 2×2, leaderboards con señal.

## Notas / pendientes

- Las sesiones de empleado ya abiertas necesitan **re-login** para recibir `emp-rating-own:create`
  (comportamiento RBAC conocido; el rol ya lo tiene sembrado).
- Quedan como legacy sin uso las queries `getGlobalRatingStats/getRatingsByCatering/
  getRecentRatingComments` (OrderRating) en `admin-quality.ts` — candidatas a borrar en limpieza.
- Cierra la parte de **ratings** del módulo Calidad (HU-028); queda auditar audits/SLA fino.

## Enlaces

- Capa: [`lib/db/queries/ratings.ts`](../../../../lib/db/queries/ratings.ts) · [`lib/ratings/selection.ts`](../../../../lib/ratings/selection.ts)
- Empleado: [`components/empleado/rating/`](../../../../components/empleado/rating/)
- Catering: `components/catering/calidad/CalidadTabs.tsx` · Empresa: `components/empresa/catering/CompanyRatingsTab.tsx`
- Admin: `app/(admin)/admin/reputation/page.tsx`
- Relacionado: [`incidencias.md`](./incidencias.md) · [`penalizaciones.md`](./penalizaciones.md)
