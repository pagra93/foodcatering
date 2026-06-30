# Plan de arreglo — Empresas + sistema de Incidencias (HU-024 + cross-cutting)

> Principio rector (indicación del usuario): **reutilizar, no duplicar**. Es un sistema global
> (superadmin ↔ empresas ↔ catering ↔ empleado) donde **todo se relaciona**. Antes de crear una
> pantalla, comprobar que no exista ya en otro portal. Planificar a fondo, luego ejecutar.

## Contexto del sistema (mapa, ya investigado)

**Incidencias** — modelo único `Incident` (tenantEmpresa + tenantCatering + orderId? + resolution JSON).
Cada portal tiene su vista, con distinto nivel de riqueza:
| Portal | Lista | Detalle | Acciones | Queries |
|--------|-------|---------|----------|---------|
| Admin (Calidad/SLA) | `/admin/quality/incidents` | `/admin/quality/incidents/[id]` (la que creé, **pobre**) | solo lectura/auditoría | `admin-quality.ts` (`getGlobalIncidents` acepta `tenantEmpresa`/`tenantCatering`) |
| Empresa | `/empresa/incidencias` | `/empresa/incidencias/[id]` | crear, resolver | `empresa-incidencias.ts` |
| Catering | `/catering/incidencias` | **modal** `ResolveIncidentDialog` | responder/resolver/compensar | `catering-incidencias.ts` |
| Empleado | `/empleado/incidencias` | card/modal | reportar | `empleado-incidencias.ts` |

**Duplicación detectada (deuda):** `INCIDENT_TYPES`, `SEVERITY_MAP`, `INCIDENT_STATUS_MAP` están **copiados en los 4 portales** con variaciones. Además `empresa-incidencias.ts` usa un estado **`CLOSED` que NO existe** en el enum (`OPEN/IN_PROGRESS/RESOLVED/COMPENSATED`) — misma familia que el `CRITICAL` muerto del dashboard. **No hay componentes compartidos.**

**Reportes / Pedidos ya existentes (reutilizables):**
- Reportes fiscales: `/admin/compliance/fiscal-audit` (`getGlobalFiscalReports`) y `/empresa/auditoria` (`getOrGenerateFiscalReport`).
- Pedidos por empresa: `getOrders(tenantId, filters)` + `exportOrdersCSV` (`empresa-pedidos.ts`) + componentes `OrdersTable/OrdersFilters/OrdersKPIs`.
- Alertas: `getDashboardAlerts()` (global) y alertas por empresa en `empresa-dashboard.ts`. No hay página admin dedicada de alertas.

---

## Parte 1 — Los 4 enlaces rotos (estrategia reuse-first)

| Botón | Hoy (roto) | Decisión | Por qué |
|-------|-----------|----------|---------|
| **Incidencias** (detalle empresa, "Ver todas") | `/admin/empresas/[id]/incidencias` (404) | **Reapuntar** a `/admin/quality/incidents?tenantEmpresa=<id>` + extender esa lista global para leer el searchParam `tenantEmpresa` (la query ya lo soporta) | Cero duplicación; la lista global ya existe y filtra |
| **Reportes** (header lista empresas) | `/admin/empresas/reportes` (fantasma) | **Reapuntar** a `/admin/compliance/fiscal-audit` | El reporte global por empresa ya existe ahí |
| **Pedidos** (detalle empresa, "Ver todos") | `/admin/empresas/[id]/pedidos` (404) | **Crear** página fina `/admin/empresas/[id]/pedidos` reusando `getOrders(id, filters)` + tabla | No hay vista admin de pedidos; la query ya existe |
| **Alertas** (header lista empresas) | `/admin/empresas/alertas` (fantasma) | **Crear** página fina reusando el subconjunto "empresas" de `getDashboardAlerts()` (empresas inactivas + picos de cancelación) | No hay página dedicada; reutiliza query existente |

> Nota: "Pedidos" y "Alertas" se crean porque no existen en admin, pero **reusando queries**, no
> reinventándolas. "Incidencias" y "Reportes" ni siquiera necesitan página nueva.

---

## Parte 2 — Rediseño del detalle de incidencia del admin (lo que "entra mal")

**Problema:** `/admin/quality/incidents/[id]` muestra el `type` crudo, el `resolution` como JSON volcado,
y emails sueltos. Pobre frente a las vistas de empresa/catering (tipo con etiqueta+icono, empleado,
desglose de compensación, timeline).

**Plan (coherencia global + matar duplicación):**
1. **Crear fuente única de constantes** `lib/incidents/constants.ts` con `INCIDENT_TYPES`
   (label + icono + descripción), `SEVERITY_META`, `STATUS_META` — alineados al enum real
   (`OPEN/IN_PROGRESS/RESOLVED/COMPENSATED`, **sin `CLOSED`**). Los 4 portales pasan a importar de aquí
   (refactor incremental; al menos admin las usa ya).
2. **Enriquecer el detalle admin** para que sea la "vista 360" (el admin es quien lo ve todo):
   - Cabecera: tipo (label+icono), severidad, estado, días abierta.
   - Partes implicadas: empresa (link a su ficha) · catering (link a su ficha) · empleado afectado
     (nombre **descifrado**, ver Parte 3-PII) · pedido asociado (link).
   - **Resolución desglosada** (no JSON crudo): tipo (REPLACEMENT/REFUND/DISCOUNT/APOLOGY/OTHER),
     importe de compensación, detalles, resuelto por, resuelto el.
   - **Timeline**: reportada → (asignada) → resuelta/compensada, con quién y cuándo.
3. **Read-only** (el admin audita; resolver/compensar es de catering/empresa) — pero añadir enlace
   "ver en contexto" si aporta. Confirmar si el admin debe poder actuar (decisión de negocio).

---

## Parte 3 — Críticos de datos/UX de Empresas (el usuario aprobó arreglarlos ya)

- **E1 (fecha "Pedidos Hoy" = 0):** en `getCompaniesGlobalKPIs` usar `gte startOfToday / lte endOfToday`
  (copiar patrón ya corregido en el dashboard). Revisar si `ordersThisMonth/today` tienen el mismo vicio.
- **E8 (`params.id` síncrono):** `params: Promise<{id}>` + `await params` en
  `empresas/[id]/page.tsx` y `empresas/[id]/edit/page.tsx` (alinear con la página de incidencia que ya hice bien).
- **E3 / E9 / E14 (botones muertos):** "Invitar empleados" (tabla), "Invitar usuario" (detalle),
  "Cancelar" (form) → cablear (a su flujo real) o retirar si el flujo no existe aún.
- **E12 (PII `nameEnc` en crudo):** helper compartido para **descifrar nombres** antes de render.
  Afecta a tabs Empleados/Usuarios del detalle y al RecentActivityTable del dashboard → **candidato a
  fix sistémico**. Verificar la función de descifrado existente en `lib/crypto`.
- **E13 (label "Crear Empresa" en modo editar):** el form debe distinguir create/update.

---

## Parte 4 — Menores (pulido, no bloquean lanzamiento)
E4 ("registrados"=ACTIVE), E5 ("Facturación"=volumen), E6 ("Tendencia"=conteo), E7 (tabla sin paginación),
E15 (`alert()`), E16 (sin validación inline), E17 (`any`). Se agrupan al final.

---

## Orden de ejecución propuesto
1. **Reapuntar enlaces que no necesitan página** (Incidencias→global filtrada, Reportes→fiscal-audit) + extender lista global con `tenantEmpresa`. *(rápido, mata 2 de 4 rotos)*
2. **`lib/incidents/constants.ts`** (fuente única) + **rediseño del detalle de incidencia admin**. *(núcleo del "entra mal")*
3. **Críticos Empresas**: E1, E8, E12, E3/E9/E14, E13.
4. **Crear** `/admin/empresas/[id]/pedidos` y `/admin/empresas/alertas` (reusando queries).
5. **Menores** (Parte 4).

## Verificación
- `pnpm type-check` limpio tras cada bloque.
- En vivo (`/admin`): los 4 botones resuelven a contenido real; el detalle de incidencia muestra la
  vista 360 con datos descifrados; "Pedidos Hoy" deja de ser 0.
- No quedan rutas `[id]` tragando estáticas; no quedan botones muertos en Empresas.

## Decisiones de negocio (CONFIRMADAS por el usuario)
1. **Incidencias** → **página propia** en la ficha: crear `/admin/empresas/[id]/incidencias` (reusando la
   query `getGlobalIncidents({ tenantEmpresa })`, sin duplicar lógica de datos).
2. **Detalle de incidencia admin** → **solo lectura** (vista 360 de auditoría, sin resolver/compensar).
3. **Botones "Invitar empleados" / "Invitar usuario"** → **retirar** por ahora (no hay flujo de invitación).
   El botón "Cancelar" del form se cablea a "volver" (UX esperada), no se retira.
