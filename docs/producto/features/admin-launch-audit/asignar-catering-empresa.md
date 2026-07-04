# Asignar catering ↔ empresa (desde admin) + enforcement de `maxCompanies`

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-044**
> Estado: **hecho** (2026-07-04) · Rama: `chore/pmx10-v3-migration`
> Commit: `c9917dc`

## Por qué

Al cerrar **HU-043** (planes de catering) quedó documentada una deuda: el límite
`maxCompanies` del plan se **mostraba y contaba** pero **no se enforzaba**, porque no existía
ningún flujo en la app que creara la relación catering↔empresa. La tabla
`CompanyCateringAssignment` **solo se poblaba desde los seeds** — ni el admin, ni la empresa, ni
el catering podían crear una asignación desde la interfaz. Era, de hecho, un **hueco funcional**
del producto, no solo la deuda del límite.

**Decisión (Pablo):** se gestiona **desde el admin** (Plati), en la ficha de la empresa.

## Qué se hizo

### UI — pestaña "Caterings" en `/admin/empresas/[id]`
- Lista los caterings que **sirven** a la empresa (principal/backup, prioridad, plan y cobro) +
  un bloque de **histórico** (asignaciones desactivadas con su motivo).
- **Asignar catering** (dialog): selector de caterings disponibles que muestra el uso de cada
  plan (`empresas 3/10`) y **deshabilita** los que están **al límite**; tipo (Principal/Backup) y
  prioridad.
- **Quitar** (soft-delete): desactiva la asignación conservando el histórico, con motivo opcional.
- Los controles solo aparecen con permiso (`empresa:assign-catering`).

### Server actions (`components/admin/companies/catering-assignment-actions.ts`)
- `assignCateringAction`: valida, comprueba permiso, y **enforca el límite del plan del catering**
  (`getCateringPlanUsage` + `withinLimitOf(maxCompanies, empresasServidas)`) → si está al tope,
  error con mensaje de upsell. Si existía una asignación **histórica**, la **reactiva** (en vez de
  duplicar). Registra `assignedBy` y audita.
- `deactivateCateringAssignmentAction`: soft-delete (`active=false` + `deactivatedAt/By/Reason`),
  audita.
- Ambas revalidan `/admin/empresas/[tenantId]` (la ruta usa el tenantId de la empresa, no el
  `Company.id`).

### Queries (`lib/db/queries/catering-assignments.ts`)
- `getCompanyCateringAssignments(companyId)`: asignaciones activas + históricas, con nombre del
  catering y su cobro (derivado del plan).
- `getAssignableCaterings(companyId)`: caterings activos **no** ya asignados, cada uno con
  `companiesUsed` / `maxCompanies` / `atLimit` para mostrar y limitar en la UI.

### RBAC
Nueva acción no-pública cableada al catálogo: **`empresa:assign-catering`**
(`permission-catalog.ts` → `seed-rbac.ts`). Enforcement en el server action con
`permissionsInclude`; la UI oculta los controles sin el permiso.

## Deuda de HU-043 → **saldada**

El límite `maxCompanies` ya no es solo informativo: **se enforca en el momento de asignar**. Un
catering `cat-basico` (máx. 3) que ya sirve a 3 empresas no admite una cuarta (opción deshabilitada
en el selector + rechazo en el server action con mensaje de subir de plan).

## Ficheros clave
- `app/(admin)/admin/empresas/[id]/page.tsx` (pestaña + carga de datos + permiso).
- `components/admin/companies/CompanyCateringsTab.tsx` (UI cliente).
- `components/admin/companies/catering-assignment-actions.ts` (server actions).
- `lib/db/queries/catering-assignments.ts` (queries).
- `lib/auth/permission-catalog.ts` (`empresa:assign-catering`).

## Verificación
- `pnpm type-check` + `pnpm lint` limpios (solo warnings preexistentes).
- Smoke test en `comidas_dev`: asignados e "asignables" con su uso/límite correctos
  (p.ej. ACME → Delicias Express PRIMARY 5%; resto de caterings 1/10, ninguno al límite).
- RBAC sembrado: permiso `empresa:assign-catering` presente.

## Notas de alcance
- La asignación la hace **Plati (admin)**. No se abrió un flujo para que la empresa elija proveedor
  (fuera de alcance; se puede añadir luego reutilizando estas queries/acciones).
- El **tipo** (`PRIMARY`/`BACKUP`) y la **prioridad** ya existían en el modelo; los pedidos que
  resuelven "qué catering sirve" siguen usando la asignación `PRIMARY` activa (sin cambios).
