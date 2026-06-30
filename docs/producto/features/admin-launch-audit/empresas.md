# Auditoría módulo Empresas (`/admin/empresas`) — HU-024

> Método (lecciones del dashboard): cada card → variable → query → fuente canónica ·
> cada botón/enlace → destino real → ¿hace lo que dice? · rutas `[id]` que tragan estáticas ·
> enums/valores hardcodeados · formularios → ¿guardan de verdad?

Estado: **en progreso**. Se audita página por página.

---

## 1. Página LISTA — `/admin/empresas` ✅ auditada

Archivos: [page.tsx](../../../../app/(admin)/admin/empresas/page.tsx) ·
queries [companies.ts](../../../../lib/db/queries/companies.ts) ·
[CompaniesGlobalKPIs.tsx](../../../../components/admin/companies/CompaniesGlobalKPIs.tsx) ·
[CompaniesTable.tsx](../../../../components/admin/companies/CompaniesTable.tsx)

### Trazado de KPIs (card → variable → query)
| Card | Variable | Query | Veredicto |
|------|----------|-------|-----------|
| Empresas | `companies.active` / `.total` / `.suspended` | count `type=EMPRESA` + status | 🟢 **Correcto** (es la fuente canónica; coincide con el fix del dashboard) |
| Empleados | `employees.active` / `.total` | total = `employee.count(status=ACTIVE)`; active = distinct en orders 30d | 🟠 "de X **registrados**" cuenta solo empleados con status ACTIVE, no todos los registrados (label engañoso) |
| Hoy | `orders.today` | `order.count({ serviceDate: today })` con `today = new Date()` | 🔴 **BUG**: compara `serviceDate` con el **timestamp exacto** (no rango del día) → casi siempre **0**. El dashboard usa `gte startOfToday / lte endOfToday`. Misma familia que el bug de fechas del dashboard |
| Incidencias | `incidents.open` | `incident.count(status OPEN/IN_PROGRESS)` global | 🟢 OK (global, pero toda incidencia tiene empresa) |
| Facturación | `financial.monthlySpend` | `Σ order.price` del mes | 🟠 Etiqueta "Facturación" pero es **volumen de pedidos** (gasto bruto), no importe facturado (el dashboard usa `invoice.total`). Inconsistencia de criterio |
| Tendencia | `orders.last30Days` | `order.count` 30d | 🟡 Muestra un conteo, no una tendencia/comparación. Label flojo |

### Trazado de botones/enlaces
| Origen | Destino | Veredicto |
|--------|---------|-----------|
| Header · **Reportes** | `/admin/empresas/reportes` | 🔴 **No existe** → cae en `[id]` → `notFound` (página fantasma). Ya registrado |
| Header · **Alertas** | `/admin/empresas/alertas` | 🔴 **No existe** → idem |
| Header · Nueva Empresa | `/admin/empresas/new` | 🟢 existe |
| Tabla · nombre / "Ver detalle" | `/admin/empresas/[id]` | 🟢 existe (pero `[id]` tiene bug `params.id`, ver §2) |
| Tabla · "Editar" | `/admin/empresas/[id]/edit` | 🟢 existe |
| Tabla · **"Invitar empleados"** | — | 🔴 **Botón muerto**: sin `href` ni `onClick`, no hace nada |

### Otros
- 🟡 **E-list-1** Tabla carga `pageSize: 100` ("sin paginación por ahora") con filtrado **client-side**. Con >100 empresas se trunca en silencio (no hay aviso). Escalabilidad.

### Hallazgos de la página lista
- **E1 🔴** "Pedidos Hoy" casi siempre muestra 0 (comparación por timestamp exacto, no por día). [companies.ts](../../../../lib/db/queries/companies.ts) `getCompaniesGlobalKPIs` → `ordersToday`.
- **E2 🔴** Botones "Reportes" y "Alertas" → `notFound` (rutas inexistentes capturadas por `[id]`).
- **E3 🔴** "Invitar empleados" (dropdown de la tabla) es un botón muerto.
- **E4 🟠** "Empleados → de X registrados" cuenta solo ACTIVE, no todos.
- **E5 🟠** "Facturación" mezcla criterio: es volumen de pedidos, no importe facturado.
- **E6 🟡** "Tendencia" es un conteo, no una tendencia.
- **E7 🟡** Tabla sin paginación real (truncado a 100).

---

## 2. Página DETALLE — `/admin/empresas/[id]` ✅ auditada

Archivos: [page.tsx](../../../../app/(admin)/admin/empresas/[id]/page.tsx) ·
query `getCompanyByIdComplete` · [CompanyOverviewTab.tsx](../../../../components/admin/companies/CompanyOverviewTab.tsx)

Tabs: Overview, Configuración, Sedes, Empleados, Usuarios — todos con datos reales de la query.
KPIs del Overview (Pedidos/Empleados/Incidencias/Gasto) trazados → correctos; severidad usa HIGH/MEDIUM (coherente con el enum, sin CRITICAL).

### Hallazgos
- **E8 🔴** `params.id` **síncrono** (`params: { id }`, se usa `params.id` directo). Viola Next 15 (`sync-dynamic-apis`, warning en log) y **romperá en Next 16**. Mismo patrón en la página EDIT.
- **E9 🔴** Botón **"Invitar usuario"** (tab Usuarios) → muerto (sin handler).
- **E10 🔴** "Ver todos" (Pedidos Recientes) → `/admin/empresas/[id]/pedidos` → **no existe (404)**.
- **E11 🔴** "Ver todas" (Incidencias Recientes) → `/admin/empresas/[id]/incidencias` → **no existe (404)**.
- **E12 🟠** Tabs **Empleados y Usuarios muestran `user.name` = `nameEnc`** (PII **cifrada**) sin descifrar → en prod se verá texto cifrado/ilegible. **Sistémico** (también pasa en el RecentActivityTable del dashboard). Revisar capa de descifrado de nombres.
- 🟢 "Catering Asignado → Ver detalle" → `/admin/caterings/[id]` existe.

## 3. Página EDIT — `/admin/empresas/[id]/edit` ✅ auditada

Server action `updateCompanyAction` → Zod `updateCompanySchema.parse` → `updateCompany` (transacción real). **Guarda de verdad.**
- **E8 🔴** (compartido) `params: { id }` síncrono → `getCompanyById(params.id)`.
- Hereda los hallazgos de `CompanyForm` (§4).

## 4. Página NEW — `/admin/empresas/new` ✅ auditada (+ `CompanyForm` compartido)

Server action `createCompanyAction` → Zod `createCompanySchema.parse` → `createCompany` (Tenant+Company+Policy+Site en **transacción atómica**) → redirect a detalle. **Guarda de verdad** ✅.

### Hallazgos de `CompanyForm` (usado por NEW y EDIT)
- **E13 🟠** Botón de envío **siempre dice "Crear Empresa"**, incluso en modo EDIT (debería ser "Guardar cambios"). El form no distingue create vs update en la etiqueta.
- **E14 🟠** Botón **"Cancelar"** (`type="button"`, sin `onClick`) → muerto (no vuelve atrás).
- **E15 🟡** Manejo de error con `alert('Error al guardar la empresa')` + `console.error` (UX cruda; sin errores inline por campo).
- **E16 🟡** Validación: si `*.parse()` falla en la server action, lanza y muestra la página de error genérica de Next (sin feedback amigable).
- **E17 🟡** `initialData?: any` y `company: any` → deuda de tipos (`any` que el proyecto quiere evitar).

---

## Resumen consolidado del módulo Empresas

**Patrones que se repiten del dashboard (lecciones aplicadas):**
- 🔗 **Enlaces a rutas inexistentes** (como el 404 de incidencias del dashboard): E2 (Reportes/Alertas), E10 (pedidos), E11 (incidencias). → 4 destinos rotos.
- 🪦 **Botones muertos**: E3 (Invitar empleados), E9 (Invitar usuario), E14 (Cancelar).
- 📅 **Bug de fechas** (idéntico al del dashboard): E1 ("Pedidos Hoy" compara timestamp exacto, no rango de día).
- 🏷 **Datos mal etiquetados** (como "3 vs 1"): E4 ("registrados"=ACTIVE), E5 ("Facturación"=volumen).
- 🔐 **PII `nameEnc` en crudo**: E12 (sistémico, también en dashboard).

**Críticos (🔴):** E1, E2, E3, E8, E9, E10, E11 (+ E12 en frontera 🟠/🔴 por PII).
**Medios (🟠):** E4, E5, E12, E13, E14.
**Menores (🟡):** E6, E7, E15, E16, E17.

**Lo que SÍ funciona bien:** KPI "Empresas" (fuente canónica), formularios NEW/EDIT guardan de verdad con transacción + Zod, tabla con filtros, tabs del detalle con datos reales, severidad coherente con el enum.

### Plan de arreglo propuesto (cuando toque ejecutar)
1. **Rutas/enlaces** — decidir por cada destino roto: crear página o quitar botón.
   - Reportes/Alertas (E2), pedidos (E10), incidencias (E11): probablemente listados filtrados → reutilizan queries existentes (`getCompanyActivity`, incidencias por empresa).
2. **Date fix E1** — usar `gte startOfToday / lte endOfToday` (copiar patrón del dashboard ya corregido).
3. **Botones muertos** E3/E9/E14 — cablear o retirar.
4. **`params` async** E8 — `params: Promise<{id}>` + `await params` en detalle y edit (alinear con la página de incidencia que ya creé bien).
5. **PII E12** — descifrar `nameEnc` antes de render (capa común; afecta a varias pantallas → candidato a helper compartido).
6. **Labels** E4/E5/E13 + UX de errores E15/E16 — pulido.
