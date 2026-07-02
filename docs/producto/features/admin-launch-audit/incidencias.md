# Incidencias — rediseño del módulo (cross-portal)

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-039**
> Estado: **hecho** (2026-07-02) · Rama: `chore/pmx10-v3-migration`
> Commits: `e777cc7` (F1) · `9357c81` (F2) · `ce541e3` (F3) · `a483e24` (F4)

## Por qué (problema)

El módulo de Incidencias estaba "muy mejorable". Una incidencia es un **triángulo**
sobre un pedido:

- el **empleado** la reporta (sobre *su* pedido),
- el **catering** es el responsable y la resuelve,
- la **empresa** supervisa (y puede crear/resolver),
- y **Plati (súper admin)** tiene la visión global y puede penalizar.

Problemas confirmados antes del rediseño:

1. **No había "nombre".** El listado mostraba solo el `type`, y en admin el `type`
   **en crudo** (ni siquiera la etiqueta). Imposible saber de un vistazo de qué iba.
2. **El catálogo "Motivos de Incidencia" (`IncidentReason`) estaba HUÉRFANO.** Al crear,
   el tipo salía de una lista hardcodeada (`INCIDENT_TYPES`), no del catálogo que
   gestiona el admin. Dos taxonomías desconectadas → el admin editaba motivos que nadie usaba.
3. **Constantes triplicadas y divergentes** en `lib/db/queries/{empleado,empresa,catering}-incidencias.ts`
   pese a existir `lib/incidents/constants.ts`.
4. **Sin historial de cambios de estado** (solo `updatedAt`) y **sin notificaciones**
   al crear/resolver. Las partes no se enteraban de nada.
5. Admin lo tenía metido dentro de "Calidad y SLAs" en vez de ser un módulo propio.
6. **La creación desde empresa estaba rota**: el formulario posteaba a
   `/api/empresa/incidencias`, un endpoint que **no existía**.

## Decisiones (confirmadas por Pablo)

| Decisión | Elección |
|---|---|
| Taxonomía | **Conectar las incidencias al catálogo `IncidentReason`** (los motivos del admin se usan de verdad). |
| Identidad de la incidencia | **Resumen automático + `subject` opcional** (cubre existentes y nuevas). |
| Ubicación en admin | **Sección propia "Incidencias"** en el sidebar (fuera de "Calidad y SLAs"). |

## Qué se hizo — por fases

Cada fase compila y se commiteó por separado.

### Fase 1 — Modelo + taxonomía unificada (`e777cc7`)
- **Schema** (`prisma/schema.prisma`): a `Incident` se le añadió `reasonId` (FK →
  `IncidentReason`, con back-relation `IncidentReason.incidents`) y `subject`. Se mantiene
  `type` como **legacy/fallback** para las incidencias antiguas. Migración aditiva
  `20260702160000_incident_reason_subject` aplicada a `comidas_dev`.
- **Helpers de nombre** en [`lib/incidents/constants.ts`](../../../../lib/incidents/constants.ts):
  - `incidentDisplayName({subject, reasonName, type})` → **asunto > nombre del motivo > etiqueta del tipo legacy**.
  - `incidentSummary({..., context})` → nombre + contexto (pedido/plato).

### Fase 2 — Creación conectada al catálogo (`9357c81`)
- Los formularios de crear (empleado `ReportIncidentDialog`, empresa `NewIncidentForm`)
  cargan `getIncidentReasons(tenantId)` y el usuario **elige el motivo del catálogo** (no
  la lista fija). La **severidad se pre-rellena** de `reason.defaultSeverity`; campo
  **`subject` opcional**.
- Al crear, se fija `reasonId`, `subject` y `type = reason.code` (compat) vía
  `createIncident(...)` en las queries de cada portal.
- **Se creó la API `POST /api/empresa/incidencias`** que faltaba (con auth + check de
  tenant EMPRESA + `permittedAction('emp-incident:create', ...)`), arreglando la creación
  rota de empresa.

### Fase 3 — Sección propia + listados legibles (`ce541e3`)
- **Mudanza en admin**: `git mv` de `quality/incidents` → `incidents` y de
  `quality/incident-reasons` → `incidents/reasons`. Nuevo item top-level **"Incidencias"**
  en el sidebar (con subitems Incidencias + Motivos de Incidencia). Se actualizó
  `section-permissions.ts` (prefijos `/admin/incidents[/reasons]`), `AdminBreadcrumbs`,
  back-links y la landing de Calidad (se le quitaron el KPI y la card de incidencias).
- **Listados legibles** en los 4 portales (admin, empresa, catering, empleado): muestran
  `incidentDisplayName` en vez del `type` crudo, con el tipo como subtítulo. Las queries
  incluyen la relación `reason` (`reasonName`) y el campo `subject`. La búsqueda global
  admin cubre asunto, motivo y descripción.

### Fase 4 — Feedback: notificaciones + timeline + detalle empleado (`a483e24`)
- Nuevo helper [`lib/incidents/notify.ts`](../../../../lib/incidents/notify.ts) (reutiliza
  `notifyEntityParties` + el hilo `ActivityMessage`):
  - `notifyIncidentCreated` → al crear (empleado o empresa) avisa al **catering + Plati**.
  - `notifyIncidentStatusChange` → al resolver/compensar/cambiar estado deja una **traza en
    el hilo** (autorada por el actor) y notifica a **la otra parte + Plati**.
- Cableado **no bloqueante** (try/catch) en las 5 mutaciones: `createIncident`
  (empleado/empresa), `updateIncidentStatus` y `resolveIncident` (catering), `resolveIncident`
  (empresa). `postMessageAction` revalida también el detalle de catering y empleado.
- **Detalle del empleado nuevo** (`app/(empleado)/empleado/incidencias/[id]/page.tsx`):
  ficha + respuesta del catering + `ActivityThread` (canPostInternal=false) para dar
  seguimiento; la lista del empleado enlaza "Ver seguimiento".
- Los títulos de los detalles admin/catering/empresa usan `incidentDisplayName`.

## Modelo de datos (referencia)

`Incident` (campos relevantes tras el rediseño):

| Campo | Tipo | Nota |
|---|---|---|
| `type` | String | Legacy/fallback (código del motivo). |
| `reasonId` | String? → `IncidentReason` | **Nuevo.** Fuente preferida de taxonomía. |
| `subject` | String? | **Nuevo.** Asunto libre opcional. |
| `severity` | `IncidentSeverity` (LOW/MEDIUM/HIGH) | Se pre-rellena de `reason.defaultSeverity`. |
| `status` | OPEN / IN_PROGRESS / RESOLVED / COMPENSATED | |
| `resolution` | JSON | `{type, details, amount, resolvedBy, resolvedAt}`. |
| `tenantEmpresa` / `tenantCatering` | String | Las dos partes del triángulo. |

`IncidentReason` (catálogo admin, antes huérfano): `code` (unique), `name`, `defaultSeverity`,
`category`, `requiresCompensation`, `scope` (SYSTEM/TENANT), `active`.

## Verificación

- `pnpm type-check` y `pnpm lint` limpios en las 4 fases (solo warnings preexistentes).
- Migración aditiva aplicada a `comidas_dev`, `prisma migrate status` sin drift.
- Flujo E2E de diseño: crear incidencia eligiendo motivo del catálogo → aparece con nombre
  legible en los 4 listados; resolver desde catering → empresa/empleado reciben notificación
  (campana) y el hilo muestra el cambio de estado; el empleado responde desde su detalle.

## Notas / tech-debt

- Las constantes `INCIDENT_TYPES/SEVERITY_MAP/INCIDENT_STATUS_MAP` **siguen triplicadas** en
  los 3 ficheros `*-incidencias.ts` (formas divergentes: catering tiene icon+color, empleado
  description+icon, empresa color). No se unificaron en un big-bang por riesgo; los helpers de
  nombre y estado sí viven ya en `lib/incidents/constants.ts`. **Unificar es tech-debt abierto.**
- Las notificaciones son **por tenant** (no al usuario concreto): el empleado ve el aviso a
  nivel de su tenant empresa, igual que el patrón de penalizaciones.
- El detalle de empresa (`app/(empresa)/empresa/incidencias/[id]/page.tsx`) usa `params`
  síncrono (patrón legacy que aún type-checkea); no se refactorizó por estar fuera de alcance.

## Enlaces

- Helpers: [`lib/incidents/constants.ts`](../../../../lib/incidents/constants.ts) · [`lib/incidents/notify.ts`](../../../../lib/incidents/notify.ts)
- Notificaciones + hilo: [`lib/notifications.ts`](../../../../lib/notifications.ts) · [`components/shared/activity/`](../../../../components/shared/activity/)
- Queries por portal: `lib/db/queries/{empleado,empresa,catering}-incidencias.ts` · `lib/db/queries/admin-quality.ts`
- Relacionado: [`penalizaciones.md`](./penalizaciones.md) (comparten hilo + notificaciones)
