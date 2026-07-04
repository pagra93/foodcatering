# Dossier: EPIC-003 — Auditoría de lanzamiento · Panel Súper Admin

> Generated and maintained by `age-spe-pm-producto` (modo `dossier`).
> No edites manualmente entre marcadores `<!-- AUTO:section -->` y `<!-- /AUTO:section -->`.
> Last updated: 2026-07-04T10:45:00Z

---

## 📍 Estado actual

<!-- AUTO:status -->
- **Status**: `en progreso` (EPIC-003) — Dashboard + Empresas + Caterings + Usuarios/RBAC + Catálogos/Alérgenos + **Incidencias** + **Penalizaciones** + **Reputación** + **Planes SaaS (empresa + catering)** hechos
- **Sprint**: —
- **Stories**: 19 hechas / 28 totales · `███████░░░ 68%` (Bloque A HU-015…023 + HU-024 Empresas + HU-025 Caterings + HU-039 Incidencias + HU-040 Penalizaciones + HU-041 Reputación + HU-042 Planes empresa + HU-043 Planes catering + HU-044 Asignar catering↔empresa; Usuarios/RBAC y Catálogos/Alérgenos también avanzados)
- **Siguiente recomendado**: HU-029 Facturación / HU-031 Compliance (críticos para lanzar)
- **Última actividad**: 2026-07-04 · `claude-code` (Asignar catering↔empresa desde admin: pestaña Caterings en la ficha de empresa + enforcement de maxCompanies; cierra la deuda de HU-043)
<!-- /AUTO:status -->

---

## 💡 Idea original

<!-- AUTO:idea -->
> Revisión completa del dashboard del súper admin, sección por sección: comprobar si los
> datos son reales o hardcodeados, si los botones llevan a páginas que existen, y dejar todo
> funcionando para lanzar. En su momento se construyó mucho; ahora toca verificar que todo va
> bien antes del lanzamiento.

— Origen: conversación de auditoría · 2026-06-28 · por Pablo
<!-- /AUTO:idea -->

---

## 🔬 Análisis (auditoría del Dashboard general `/admin`)

<!-- AUTO:analyze -->
Primera pasada hecha sobre el dashboard general. **Veredicto:** las queries usan Prisma (sin
datos mock inventados), **pero varias KPIs están cableadas a la query equivocada** → muestran
cifras engañosas. Gráficas no reales y un botón que promete una descarga inexistente. NO listo
para lanzar tal cual.

Hallazgos confirmados:
- 🔴 **F1** "Empresas Activas" usa `tenants.active` (empresas+caterings) → "3 en card vs 1 en
  listado". Debe usar `tenants.companies` (ya calculado, sin usar). → **HU-015**
- 🔴 **F2** "Descargar Informes" lleva a fiscal-audit, listado de solo lectura sin export. → **HU-017**
- 🔴 **F3** Click en incidencia → 404 (`/admin/quality/incidents/[id]` no existe). → **HU-018**
- 🟠 **F4** "Caterings Activos" no filtra status; inconsistencia severity HIGH vs CRITICAL. → **HU-016**
- 🟠 **F5** Gráficas = barras CSS a mano, sin librería instalada. → **HU-019**
- 🟠 **F6** Routing duplicado tenants vs empresas/caterings. → **HU-020 / HU-034**
- 🟡 **F7** Comisión hardcodeada al 10%. → **HU-021**
- 🟡 **F8** punctuality/avgResolutionTime: cómputo muerto. → **HU-022**

- **Plan / informe completo**: [~/.claude/plans/necesito-que-nos-centremos-cozy-blossom.md](../../../../../.claude/plans/necesito-que-nos-centremos-cozy-blossom.md)

— Añadido por: auditoría manual · 2026-06-28
<!-- /AUTO:analyze -->

---

## 📋 Definición (tareas)

<!-- AUTO:define -->
24 tareas agrupadas en 3 bloques bajo EPIC-003. Todas en `sin_priorizar`.

**Bloque A — Arreglos del Dashboard general (`/admin`)**

| ID | Título | Crit. | Status |
|----|--------|-------|--------|
| HU-015 | Corregir KPI "Empresas Activas" (empresas+caterings) | high | ✅ review |
| HU-016 | Corregir "Caterings Activos" + severidad (enum real) | medium | ✅ review |
| HU-017 | "Descargar Informes" → renombrado "Auditoría Fiscal" | high | ✅ review |
| HU-018 | Crear detalle de incidencia `quality/incidents/[id]` | high | ✅ review |
| HU-019 | Gráficas reales con Recharts | medium | ✅ review |
| HU-020 | Enlaces canónicos a empresas/[id] · caterings/[id] | medium | ✅ review |
| HU-021 | Comisión real desde Settlement (fin del 10% fijo) | low | ✅ review |
| HU-022 | Eliminado cómputo muerto (puntualidad/resolución) | low | ✅ hecho |
| HU-023 | Verificación e2e del dashboard vs comidas_dev | medium | ✅ hecho |
| *(HU-015…021)* | *(ver Build)* | — | ✅ hecho |

**Bloque B — Auditoría módulo por módulo**

| ID | Título | Crit. | Status |
|----|--------|-------|--------|
| HU-024 | Empresas (auditado + arreglado: enlaces, fechas, PII, consistencia, detalle incidencia 360) | medium | ✅ hecho |
| HU-025 | Caterings (reconstruido: datos reales, formularios, consistencia, botones/filtros) | medium | ✅ hecho |
| HU-026 | Auditar Usuarios y Roles (+ RBAC dinámico DB-backed) | medium | ✅ avanzado |
| HU-027 | Auditar Catálogos (+ alérgenos relacionales) | medium | ✅ avanzado |
| HU-028 | Auditar Calidad y SLAs (incidents→HU-039, penalties→HU-040, audits ✅; falta ratings) | medium | 🟡 parcial |
| HU-029 | Auditar Facturación | high | sin_priorizar |
| HU-030 | Auditar Integraciones | medium | sin_priorizar |
| HU-031 | Auditar Compliance | high | sin_priorizar |
| HU-032 | Auditar Plantillas y Branding (3 placeholder) | low | sin_priorizar |
| HU-033 | Auditar Operación | medium | sin_priorizar |
| HU-034 | Auditar Tenants (depende de HU-020) | medium | sin_priorizar |

**Bloque C — Transversal**

| ID | Título | Crit. | Status |
|----|--------|-------|--------|
| HU-035 | Decidir destino de las 5 páginas placeholder | medium | sin_priorizar |
| HU-036 | Auditar AdminNavbar (búsqueda/notif/dark-mode) | low | sin_priorizar |
| HU-037 | Barrido global de enlaces rotos en /admin | medium | sin_priorizar |
| HU-038 | Barrido global de KPIs mal cableadas | medium | sin_priorizar |

**Bloque D — Módulos que pasaron de auditoría a rediseño propio** (cross-portal, no solo /admin)

| ID | Título | Crit. | Status |
|----|--------|-------|--------|
| HU-039 | Rediseño del módulo de Incidencias (cross-portal, 4 fases) | high | ✅ hecho |
| HU-040 | Penalizaciones: detalle + hilo + notificaciones + liquidación | high | ✅ hecho |
| HU-041 | Rediseño de Rating y Reputación (cross-portal, por plato, 5 fases) | high | ✅ hecho |

**Dependencias**: HU-023 → [HU-015, HU-016, HU-017, HU-018, HU-019] · HU-034 → [HU-020] · HU-039 → [HU-018, HU-040 (comparte infra de hilo+notif)]

— Añadido por: registro de backlog · 2026-06-28 · ampliado 2026-07-02 (HU-039/HU-040/HU-041)
<!-- /AUTO:define -->

---

## 🔨 Build

<!-- AUTO:build -->
**Bloque A completo (2026-06-28) — code-complete, `pnpm type-check` limpio.**

| HU | Cambio | Archivos |
|----|--------|----------|
| HU-015 | KPI usa `activeCompanies` + subtítulo `{companies} totales` | admin-dashboard.ts · page.tsx |
| HU-016 | Caterings filtra status; severidad alineada al enum (HIGH=máx) | admin-dashboard.ts · RecentActivityTable.tsx |
| HU-017 | Botón → "Auditoría Fiscal" | QuickActionsPanel.tsx |
| HU-018 | `getGlobalIncidentById` + página `quality/incidents/[id]` + enlace lista | admin-quality.ts · incidents/[id]/page.tsx · incidents/page.tsx |
| HU-019 | Recharts 3.9: área (pedidos) + barras (crecimiento, ingresos) | ChartsSection.tsx · package.json |
| HU-020 | Enlaces del dashboard → empresas/[id] · caterings/[id] por tipo | AlertsPanel.tsx · RecentActivityTable.tsx |
| HU-021 | Comisión = Σ `Settlement.commissionAmount` del periodo | admin-dashboard.ts |
| HU-022 | Eliminadas 2 queries muertas + cálculos sin usar | admin-dashboard.ts |

**HU-024 Empresas (2026-06-28):** auditoría de las 4 páginas + arreglos: bug de fecha "Pedidos
hoy", `params` async (Next 15), PII `nameEnc` descifrada, botones muertos retirados, "Reportes"→
fiscal-audit, **3 páginas nuevas** (`empresas/[id]/incidencias`, `[id]/pedidos`, `alertas` — reusando
queries), y **consistencia cross-pantalla** de adopción/empleados con `getCompanyAdoption` (mes + todos ACTIVE).

**HU-025 Caterings (2026-06-29):** módulo reconstruido en 4 bloques:
1. *Datos reales* — 4 pestañas que eran 100% mock cableadas a queries reales + KPIs de lista reales
   (nuevas: `getCateringsGlobalKPIs`, `getSettlementsByCatering`, `getCateringDailyOperations`).
2. *Formularios que guardan* — alta (Wizard→`createCatering`, Zod), edición nueva (`/[id]/edit`→
   `updateCatering`), documentos por URL (`addCateringDocument`→`RestaurantDocument`).
3. *Consistencia* — `getCateringQualityMetrics` (puntualidad/incidencias/rating en vivo) en detalle+lista+portal.
4. *Botones/filtros* — filtros de lista funcionales, dropdown real (suspender/activar), botones muertos fuera.

**HU-040 Penalizaciones (2026-07-01):** sanción de Plati al catering.
- *Detalle admin* (`f6f50c9`) `quality/penalties/[id]` + `PenaltyDetailActions` (aplicar/disputar/resolver).
- *Hilo + notificaciones* (`499fc4c`) — modelos `ActivityMessage`/`Notification`, `lib/notifications.ts`
  (`getEntityParties`/`notifyEntityParties`/`canAccessEntity`), `ActivityThread`. **Infra reutilizable.**
- *Campana in-app* (`46d590f`) `NotificationBell` en navbars admin/catering/empresa.
- *Cierre* (`75c57e6`) plazo de disputa centralizado, timing de liquidación, origen registrado.
- Doc: [`penalizaciones.md`](./penalizaciones.md).

**HU-039 Incidencias — rediseño cross-portal (2026-07-02):** triángulo empleado↔catering↔empresa↔Plati, 4 fases.
1. *Modelo+taxonomía* (`e777cc7`) — `Incident.reasonId` (FK al catálogo `IncidentReason`, antes **huérfano**) + `subject`;
   `type` queda legacy; helpers `incidentDisplayName`/`incidentSummary`. Migración aditiva.
2. *Creación conectada* (`9357c81`) — empleado/empresa eligen **motivo del catálogo**, severidad pre-rellenada;
   **+API `POST /api/empresa/incidencias` que faltaba** (creación de empresa estaba rota).
3. *Sección propia + listados legibles* (`ce541e3`) — "Incidencias" sale de Calidad a sección propia en el sidebar;
   los 4 portales muestran **nombre legible** en vez del `type` crudo.
4. *Feedback* (`a483e24`) — `lib/incidents/notify.ts` (notifica crear/resolver + traza en el hilo), detalle de
   incidencia del **empleado** con `ActivityThread`.
- Doc: [`incidencias.md`](./incidencias.md). Tech-debt: constantes aún triplicadas en los 3 `*-incidencias.ts`.

**HU-041 Reputación — rediseño cross-portal (2026-07-02):** el módulo no servía (nadie creaba ratings, por pedido, vista por plato rota). 5 fases.
1. *Modelo+capa* (`6459052`) — nuevo `DishRating` (por plato, denormalizado tenant/fecha) + `lib/db/queries/ratings.ts` (fuente única) + repunta `getCateringQualityMetrics` + seed/backfill 558 filas.
2. *Empleado valora* (`5ab465e`) — `rateDishesAction` (RBAC `emp-rating-own:create`) + `RateMealDialog` + columna Valorar en Historial + aviso "valora la comida de ayer" en menús.
3. *Catering ve* (`8e417d2`) — platos mejor/peor reales + **valoración por empresa cliente**.
4. *Empresa ve* (`cd75735`) — `CompanyRatingsTab` (media/tendencia/distribución/platos/comentarios); borra tab+API muertos.
5. *Admin sección propia* (`e424e9a`) — "Reputación" en el sidebar + **matriz catering×empresa** + ranking + leaderboards.
- Doc: [`reputacion.md`](./reputacion.md). Tech-debt: borrar queries legacy de rating (OrderRating) en `admin-quality.ts`.

### 🧰 Patrones y utilidades reutilizables (apoyarse en esto)
- **Métricas canónicas por entidad** (una sola definición, reusada en todas las pantallas):
  [`getCompanyAdoption`](../../../../lib/db/queries/company-metrics.ts) ·
  [`getCateringQualityMetrics`](../../../../lib/db/queries/catering-metrics.ts). **Patrón a replicar** en cada módulo nuevo.
- **Constantes de incidencias** (nombre/severidad/estado + `incidentDisplayName`/`incidentSummary`): [`lib/incidents/constants.ts`](../../../../lib/incidents/constants.ts).
- **Hilo de seguimiento + notificaciones** (compartido penalizaciones↔incidencias): [`lib/notifications.ts`](../../../../lib/notifications.ts) (`notifyEntityParties`, `getEntityParties`, `canAccessEntity`) · [`components/shared/activity/ActivityThread.tsx`](../../../../components/shared/activity/ActivityThread.tsx) · [`components/shared/NotificationBell.tsx`](../../../../components/shared/NotificationBell.tsx). **Patrón a replicar** para cualquier entidad con partes que se comunican.
- **Feedback de una entidad** (avisar + timeline al crear/cambiar estado): [`lib/incidents/notify.ts`](../../../../lib/incidents/notify.ts) como plantilla.
- **Métrica canónica multi-portal** (una definición reusada en empleado/catering/empresa/admin): [`lib/db/queries/ratings.ts`](../../../../lib/db/queries/ratings.ts) — modelo denormalizado (`tenantCatering`/`tenantEmpresa`/`serviceDate`) para agregar por entidad, por relación y por ventana temporal sin joins. **Patrón a replicar** para cualquier dato agregable cross-portal.
- **PII**: [`decryptNameSafe`](../../../../lib/crypto/pii.ts) para mostrar nombres (descifra en prod, tolera texto plano en dev).
- **Reuse de listados**: incidencias por entidad → `getGlobalIncidents({ tenantEmpresa | tenantCatering })`.
- **Gráficas**: Recharts (instalado) — patrón en `components/admin/dashboard/ChartsSection.tsx`.
- **Formularios admin**: server action + Zod (`lib/validations/*`); patrón espejo `CompanyForm`/`CateringEditForm`.

### ⚠️ Familias de bugs recurrentes (buscar en cada módulo nuevo)
1. **Fecha "hoy"**: `serviceDate: today` (timestamp exacto) → casi siempre 0. Usar `gte startOfDay / lte endOfDay`.
2. **KPI mal cableado**: card → variable → query equivocada (ej. "Empresas Activas" contaba empresas+caterings).
3. **Datos stored stale**: columnas que solo se escriben en seed y nunca se recalculan → mostrar computado en vivo. Deprecadas: `Company.adoptionRate/deductibilityRate/monthlySpend`, `Restaurant.averageRating/punctualityRate/incidentRate`.
4. **Enums fantasma**: ramas que comprueban valores inexistentes del enum (`CRITICAL`, `CLOSED`).
5. **Enlaces a rutas inexistentes** y **botones sin handler** (muertos).
6. **Datos mock/`Math.random`** dentro de componentes (Caterings tenía 4 pestañas así).

**Tech debt pendiente**:
- HU-020 · `/admin/tenants/*` huérfano del dashboard. Decidir si se retira.
- HU-021 · `Settlement` mensual en diferido → mes en curso puede mostrar 0 comisiones.
- Subida de ficheros: **no hay storage** en todo el proyecto (docs van por URL manual). Feature futura.
- Listas admin sin paginación real (cargan 100 + filtro cliente) y N+1 al calcular métricas por fila.

— Actualizado por: claude-code · 2026-06-29
<!-- /AUTO:build -->

---

## 🗂 Decisiones críticas tomadas

<!-- AUTO:decisions -->
- 2026-06-28 — Pablo — **HU-018**: el enlace roto de incidencias se resuelve **creando** la
  página de detalle (no quitando el enlace).
- 2026-06-28 — Pablo — Primer paso: **registrar el backlog en `/pm` sin tocar código**; priorizar después.
- 2026-06-28 — Pablo — **Empresas/incidencias**: página propia en la ficha; detalle de incidencia **solo lectura** (auditoría); botones "Invitar" **retirados**.
- 2026-06-28 — Pablo — **Métricas canónicas**: denominador = **todos los empleados ACTIVE**; periodo = **mes natural**. Columnas stored muertas **deprecadas** (no migrar).
- 2026-06-29 — Pablo — **Caterings**: construir las fuentes de datos reales (no ocultar). Documentos **por URL** (sin storage de binarios). Sub-funciones sin modelo (histórico comisiones, coste/operador rutas) **simplificadas/retiradas**.
- 2026-07-02 — Pablo — **Incidencias · taxonomía**: conectar las incidencias al **catálogo `IncidentReason`** que gestiona el admin (los motivos se usan de verdad; se acaba con el catálogo huérfano).
- 2026-07-02 — Pablo — **Incidencias · identidad**: **resumen automático + `subject` opcional** (nombre legible que cubre incidencias antiguas por fallback al tipo).
- 2026-07-02 — Pablo — **Incidencias · navegación**: **sección propia "Incidencias"** en el sidebar admin, fuera de "Calidad y SLAs".
- 2026-07-02 — Pablo — **Reputación · granularidad**: valoración **por plato** (1–5) + comentario del día; el empleado puntúa cada plato tras la entrega. Media de menú/catering computadas.
- 2026-07-02 — Pablo — **Reputación · entrada**: el empleado valora desde **Historial** + **aviso proactivo** en la portada de menús.
- 2026-07-02 — Pablo — **Reputación · navegación**: **sección propia "Reputación"** en el sidebar admin, fuera de "Calidad y SLAs".
<!-- /AUTO:decisions -->

---

## 📎 Artefactos relacionados

<!-- AUTO:artifacts -->
- `_events.jsonl` — timeline cronológico de esta feature
- Plan/auditoría: `~/.claude/plans/necesito-que-nos-centremos-cozy-blossom.md`
- Código auditado: `app/(admin)/admin/page.tsx`, `lib/db/queries/admin-dashboard.ts`, `components/admin/dashboard/`
- Informes por módulo (Bloque B): se generarán en esta misma carpeta como `<modulo>.md`
- [`incidencias.md`](./incidencias.md) — rediseño completo del módulo de Incidencias (HU-039)
- [`penalizaciones.md`](./penalizaciones.md) — detalle + hilo + notificaciones + liquidación (HU-040)
- [`reputacion.md`](./reputacion.md) — rediseño de Rating y Reputación por plato (HU-041)
- [`empresas.md`](./empresas.md) · [`caterings.md`](./caterings.md) · [`catalogos-alergenos.md`](./catalogos-alergenos.md)
<!-- /AUTO:artifacts -->

---

## 📝 Notas del usuario

<!-- USER:notes -->
_Esta sección está fuera de los marcadores AUTO — edítala libremente, el PM nunca la sobrescribe._

<!-- /USER:notes -->
