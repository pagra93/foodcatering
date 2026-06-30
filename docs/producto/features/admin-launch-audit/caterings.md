# Auditoría módulo Caterings (`/admin/caterings`) — HU-025

> Método: dato→query→fuente · botón/enlace→destino · formularios→¿guardan? · **mock vs real** ·
> stored/stale · consistencia cross-pantalla. (Aprendizajes de Dashboard + Empresas.)

## Veredicto general
**El módulo menos terminado del panel.** El detalle Overview (KPIs, estado operativo, calidad)
usa datos reales, pero **4 de 8 pestañas son 100% mock**, los **KPIs de la lista están
hardcodeados**, los **formularios no guardan** y faltan rutas. **No es un repaso: hay que
terminar de construirlo.** Lo bueno: **las queries reales ya existen** → casi todo es *cablear*.

---

## 1. 🔴 Datos MOCK/inventados (no reales)
| Sitio | Estado | Query real que YA existe para cablear |
|---|---|---|
| **CateringsGlobalKPIs** (tarjetas de la lista) | 100% hardcoded (`5 caterings, 450 pedidos, rating 4.6`…) — `TODO` nunca hecho ([page.tsx:39-56](app/(admin)/admin/caterings/page.tsx)) | Crear `getCateringsGlobalKPIs` (espejo de `getCompaniesGlobalKPIs`) |
| **IncidentsTab** | 100% mock (`getMockIncidents`) | **`getGlobalIncidents({ tenantCatering })`** (ya usado en Empresas) |
| **BillingPaymentsTab** | 100% mock (facturas/liquidaciones/comisiones falsas) | **`catering-billing.ts`** (`getCateringBillingKPIs`, etc. — reales) |
| **DailyOperationsTab** | 100% mock con **`Math.random()`** → cambia en cada render | Query de menús/pedidos por día (parcialmente en `caterings.ts`/menús) |
| **ActivityLogTab** | 100% mock (audit log falso) — **riesgo GDPR** (sin trazabilidad real) | `AuditLog` (como `empresa-actividad.ts` `getActivityLog`) |
| MenusDishesTab / UsersPermissionsTab | Reales, pero **caen a mock si props vacío** | Quitar el fallback a mock |

## 2. 🔴 Formularios que NO guardan (stubs)
- **CateringWizard** y **CateringForm** (alta): `TODO`, redirigen sin crear. **`createCatering` ya existe** en [caterings.ts:339](lib/db/queries/caterings.ts) pero **no se llama**.
- **UploadDocumentModal**: `setTimeout` simulado, no toca BD.

## 3. 🔴 Rutas / enlaces rotos
- **`/admin/caterings/[id]/edit` no existe** → botones "Editar" en lista ([CateringsTable.tsx:354](components/admin/caterings/CateringsTable.tsx)) y detalle ([[id]/page.tsx:114](app/(admin)/admin/caterings/[id]/page.tsx)) → **404**.
- Filtros `?filter=expiring` / `?filter=incidents` en la lista: enlaces existen pero **la página no los procesa** (no filtran).

## 4. 🟠 Botones muertos (sin handler)
Ver/Resolver (IncidentsTab), Editar/Activar (MenusDishesTab), Impersonar/Suspender/Activar (CateringsTable dropdown), varios en DailyOperationsTab.

## 5. 🔴/🟠 Campos stored stale del `Restaurant` + inconsistencia de rating
- **`averageRating`** (Restaurant): **stored, NUNCA se recalcula** → stale. Se muestra en **lista, detalle y portal**. Pero `getCateringOwnRatingStats` y `getRatingsByCatering` lo calculan **en vivo** desde `OrderRating` → **número distinto**. 🔴 Rating **inconsistente y stale**.
- **`punctualityRate` / `incidentRate`** (Restaurant): stored stale; el **detalle los recalcula en vivo** (30d), pero la **lista muestra los stored stale**. 🟠
- **`commission`**: stored (valor de config por catering) — aceptable.
- `capacityNearLimit` hardcodeado a `false` en alerts ([caterings.ts:264](lib/db/queries/caterings.ts)).

## 6. 🟠 Consistencia cross-pantalla (mismas familias que Empresas)
- **Rating**: list/detalle/portal (stored) vs calidad (en vivo, sin filtro de fecha) → distintos.
- **Puntualidad/incidencias**: lista (stored) vs detalle/portal (en vivo 30d), con desajuste de granularidad de fecha (`subDays(new Date())` vs `subDays(startOfDay())`).
- **Tasa de incidencias**: numerador por `Incident.createdAt`, denominador por `Order.serviceDate` (campos de fecha distintos).
- **Facturación catering** "pendiente cobrar" sin filtro de año (mezcla años).

---

## Plan de arreglo propuesto (reuse-first) — POR PRIORIZAR
**Bloque 1 — Quitar datos falsos (cablear a queries reales que ya existen):**
1. IncidentsTab → `getGlobalIncidents({ tenantCatering })`.
2. BillingPaymentsTab → `catering-billing.ts`.
3. CateringsGlobalKPIs → nueva `getCateringsGlobalKPIs` (espejo de empresas).
4. ActivityLogTab → `AuditLog` real (o, si no hay datos, ocultar hasta que los haya).
5. DailyOperationsTab → query real (o marcar "próximamente" si la fuente no está lista).
6. Quitar fallbacks a mock en Menus/Users.

**Bloque 2 — Formularios reales:**
7. Alta de catering: llamar a `createCatering` (Wizard/Form). 8. Subida de documentos: persistir de verdad. 9. Crear `[id]/edit` + `updateCatering`.

**Bloque 3 — Rating/consistencia + stored:**
10. Unificar rating: calcular **en vivo** desde `OrderRating` en todas las pantallas (o un cron que actualice `averageRating`); deprecar/no leer el stored. 11. Lista: usar puntualidad/incidencias **computadas** (no stored). 12. Unificar granularidad de fechas + `capacityNearLimit` real.

**Bloque 4 — Botones/filtros:**
13. Cablear o retirar botones muertos. 14. Procesar `?filter=` en la lista.

## Decisiones a confirmar (scope de lanzamiento)
Este módulo es grande. Hay que decidir **qué entra para lanzar** vs **qué se oculta/aplaza**.

---

## Revisión profunda del DETALLE (2026-06-29) — pestaña Calidad pendiente

Tras reconstruir 4 pestañas (B1) se revisó el detalle entero. La página renderiza (200) y
Overview/Estado Operativo/Alertas usan datos reales. **Pero la pestaña "Calidad & Cumplimiento"
(`QualityComplianceTab`) quedó fuera de la reconstrucción y tiene datos falsos:**

- 🔴 **Auditorías**: siempre "No hay auditorías registradas". El modelo **`RestaurantAudit` existe**
  (schema:983) → debe cablearse (query por catering). Botón "Planificar Auditoría" muerto.
- 🔴 **Sanciones por SLA**: siempre "Sin sanciones". El modelo **`Penalty` existe** (schema:1461) →
  cablear por catering.
- 🔴 **Política de Alérgenos**: **100% hardcodeado** ("14 alérgenos", "100% platos etiquetados",
  "15/11/2025 hace 1 día"). No viene de datos.
- 🟠 **Enums mal mapeados** (la tabla de documentos, que sí es real, muestra etiquetas/estados crudos):
  - tipo usa `SANITARY_REGISTRATION…` pero el enum real es `REGISTRO_SANITARIO/RC/MANIPULADORES/OTROS`.
  - estado usa `EXPIRING_SOON` pero el enum real es `EXPIRING`.
- 🟠 **Botones muertos** en filas de documentos (Eye/Download sin handler; podrían abrir `fileUrl`).
- 🟡 **Bonificaciones**: empty-state (no hay modelo) → dejar como "próximamente" o retirar.

**Otra inconsistencia (menor):**
- 🟠 `kpis.incidentsCount` = `incidents.length` con `take: 10` en `getCateringById` → el contador
  "Incidencias (N)" del tab y el badge del Overview se **topan en 10**, mientras la pestaña
  Incidencias (getGlobalIncidents) muestra el total real. Usar un `count` real para el contador.

### Plan de arreglo (mismo método que B1)
1. Cablear Auditorías → `RestaurantAudit` (query por catering) y Sanciones → `Penalty`.
2. Arreglar mapeos de enum (tipo y estado de documento) — reusar labels del modal ya corregido.
3. Alérgenos: calcular desde los `labels` de los platos del catering **o** retirar las cifras fabricadas.
4. Botones de documento: abrir `fileUrl` (Ver/Descargar) o retirarlos.
5. `incidentsCount`: contar real (no `take: 10`).
