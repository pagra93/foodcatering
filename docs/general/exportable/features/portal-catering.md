# Portal Catering

**Subdominio**: `<catering>.plati.es` (ej: `deliciasexpress.plati.es`)
**Path prefix**: `/catering/*`
**Roles**: `ADMIN_CATERING`, `CHEF`, `COCINERO`, `REPARTIDOR`, `FINANZAS_CATERING`
**Páginas**: 14

## Layout

Dos layouts anidados:

- `app/(catering)/layout.tsx` — valida sesión + rol CATERING + tenant
  tipo CATERING. Si no → redirect a `/login` o `/unauthorized`.
- `app/(catering)/catering/layout.tsx` — sidebar + navbar + banner de
  impersonación. Carga datos del tenant/restaurant una vez.

Sidebar (`CateringSidebar`):
- Dashboard
- Menús semanales
- Platos
- Producción (sub: Cocina, Empaquetado)
- Rutas de reparto
- Facturación
- Incidencias

Algunos items se ocultan según rol:
- `COCINERO` solo ve: Dashboard, Producción (Cocina).
- `REPARTIDOR` solo ve: Dashboard, Rutas (en móvil, sin sidebar
  desktop).
- `FINANZAS_CATERING` solo ve: Dashboard, Facturación.

## Páginas

### 1. Raíz

**URL**: `/catering`
**File**: `app/(catering)/catering/page.tsx`

Server redirect a `/catering/dashboard`.

### 2. Dashboard

**URL**: `/catering/dashboard`
**File**: `app/(catering)/catering/dashboard/page.tsx`

Query: `getCateringDashboard(tenantId)` — KPIs + alertas + actividad
reciente.

KPIs (`DashboardKPIs`):
- Pedidos de hoy (vs capacidad diaria).
- Entregas completadas / pendientes.
- Tasa de puntualidad (últimos 30 días).
- Incidencias abiertas.
- Platos activos en catálogo.
- Menús publicados próxima semana.
- Empresas asignadas.
- Rating medio (últimos 30 días).

Info del restaurante (`Restaurant`): cutoff, `dailyCapacity`,
`operationalDays`.

`DashboardAlerts`: documentos caducando, picos de incidencias, rutas
sin asignar.

`RecentActivityTable`: mezcla pedidos confirmados + incidencias +
eventos de ruta.

`QuickActionsPanel`: "+ Plato", "Publicar menú semana", "Ver cocina hoy".

### 3. Menús semanales

**URL**: `/catering/menus?week=YYYY-MM-DD`
**File**: `app/(catering)/catering/menus/page.tsx`

Query: `getWeeklyMenu(tenantId, { startDate, endDate })`.

`WeeklyMenuView` (client) renderiza calendario semanal:
- Cabecera con rango "28 abr - 4 may" y botones < > para navegar.
- 7 columnas (L M X J V S D). Si `operationalDays` no incluye S/D,
  se muestran en gris.
- Cada columna: cards por plato (1º / 2º / postre) con estado
  PUBLISHED / HIDDEN.

Click en un día → navega a `/catering/menus/dia/[date]`.

### 4. Menú por día (editor)

**URL**: `/catering/menus/dia/[date]`
**File**: `app/(catering)/catering/menus/dia/[date]/page.tsx`

Queries:
- `getDailyMenu(tenantId, date)` — `DishSchedule` del día.
- `prisma.dish.findMany({ tenantId, active: true })` — catálogo para
  añadir platos.

`DayMenuEditor` (client) permite:
- Añadir plato a una sección (1º/2º/postre) desde un modal
  (`DishSelectionModal`).
- Cambiar `stockLimit` o `priceOverride`.
- Ocultar un plato (`status = HIDDEN`).
- Eliminar un plato del día.

Server Actions: `updateDailyMenuAction`, `publishMenuAction`.

### 5. Platos (listado)

**URL**: `/catering/platos?search=&course=&active=&page=`
**File**: `app/(catering)/catering/platos/page.tsx`

Query: `getDishes(tenantId, filters)` — paginado.

`DishesView` (client) con tabs:
- **Todos** (default).
- **Activos**.
- **Inactivos**.

Filtros (`DishesFilters`):
- Búsqueda por nombre.
- Curso (FIRST / SECOND / DESSERT).
- Estado (active / inactive).

`DishesTable`:
- Columnas: imagen, nombre, curso, precio base, labels (chips), rating
  (si hay), estado, acciones.
- Acciones por fila: Editar, Clonar, Eliminar (soft-delete).

### 6. Nuevo plato

**URL**: `/catering/platos/nuevo`
**File**: `app/(catering)/catering/platos/nuevo/page.tsx`

`DishCreateForm` (client). Campos:
- Nombre (requerido).
- Curso (FIRST / SECOND / DESSERT).
- Descripción.
- Ingredientes (texto libre).
- Imagen (URL o upload — stub).
- **Alérgenos** (`AllergenTagSelector`): checkboxes de los 14 alérgenos
  EU — gluten, lactose, eggs, fish, crustaceans, molluscs, peanuts,
  treenuts, soy, celery, mustard, sesame, sulphites, lupin.
- **Tags nutricionales**: vegan, vegetarian, low-cal, high-protein,
  low-carb, keto, gluten-free, lactose-free.
- **Nutrición** (`NutritionInput`): kcal, protein, carbs, fat.
- Precio base.
- Estado activo / inactivo.

Server Action: `createDishAction(data)` → llama a
`createDish(tenantId, data)` en `lib/db/queries/catering-dishes.ts`.

### 7. Editar plato

**URL**: `/catering/platos/[id]`
**File**: `app/(catering)/catering/platos/[id]/page.tsx`

Query: `getDishById(id, tenantId)` + info de menús publicados donde
aparece.

`DishEditForm` precargado. **Alert importante**: si el plato está en
menús publicados, cambios de precio/ingredientes **no retroactivan**;
los pedidos ya hechos mantienen sus valores congelados en `Order.price`.

Server Actions: `updateDishAction`, `cloneDishAction`,
`toggleDishActiveAction`, `deleteDishAction`.

### 8. Producción — Dashboard

**URL**: `/catering/produccion`
**File**: `app/(catering)/catering/produccion/page.tsx`

Panel de control para abrir pantallas de producción en tablet. No es un
KDS en sí — es el selector.

Links:
- Cocina — Primeros → `/catering/produccion/cocina/primeros?date=HOY`
- Cocina — Segundos → `/catering/produccion/cocina/segundos?date=HOY`
- Cocina — Postres → `/catering/produccion/cocina/postres?date=HOY`
- Empaquetado → `/catering/produccion/empaquetado?date=HOY`

KPIs rápidos: pedidos hoy, 1º hoy, 2º hoy, empresas distintas hoy.

Instrucciones para fullscreen.

Botones (stubs): Imprimir etiquetas, Ver historial.

### 9. Cocina (KDS)

**URL**: `/catering/produccion/cocina/[type]?date=YYYY-MM-DD&companyId=`
**File**: `app/(catering)/catering/produccion/cocina/[type]/page.tsx`

`type` = `primeros` | `segundos` | `postres`.

`KitchenDisplay` (client) — optimizado para tablet fullscreen:
- Tipografía grande.
- Layout de cards con consolidación: "Gazpacho × 45", "Ensalada mixta × 32", etc.
- Auto-refresh cada 30s.
- Sin sidebar/navbar (full-screen ready).

Query: `getKitchenDisplay(tenantId, date, type, companyId?)` —
consolida `Order.selection` en cantidades por `Dish`.

Datos viene de `KitchenSheet` si ya se consolidó, o se computa on-the-fly
si aún no.

### 10. Empaquetado

**URL**: `/catering/produccion/empaquetado?date=YYYY-MM-DD&companyId=`
**File**: `app/(catering)/catering/produccion/empaquetado/page.tsx`

`PackingDisplay` (client) — también tablet fullscreen pero con grano
individual: una card por empleado con sus platos + alérgenos + sede.

Útil para armar cada paquete y evitar errores de asignación.

Query: `getPackingDisplay(tenantId, date, companyId?)` — basa en
`PackingSheet`.

### 11. Rutas — Dashboard

**URL**: `/catering/rutas`
**File**: `app/(catering)/catering/rutas/page.tsx`

Dashboard administrativo de rutas. KPIs: rutas del día, en curso,
completadas, repartidores activos.

**Nota**: UI admin para crear/editar rutas está pendiente (stub con
indicaciones). Las APIs existen:

- `POST /api/catering/rutas` — crear.
- `PATCH /api/catering/rutas/[id]` — actualizar.
- `POST /api/catering/rutas/[id]/iniciar` — iniciar.
- `POST /api/catering/rutas/[id]/completar` — completar.

Instrucciones explican cómo el repartidor usa su vista móvil
(`/catering/ruta/[id]`).

### 12. Ruta (vista móvil del repartidor)

**URL**: `/catering/ruta/[id]`
**File**: `app/(catering)/catering/ruta/[id]/page.tsx`

Query: `getRouteById(tenantId, id)` — ruta con `DeliveryRouteSite[]`
ordenados por `sequence` + pedidos en cada parada.

**Protección especial**: si rol es `REPARTIDOR`, solo puede ver la ruta
donde `route.deliveryUserId === session.user.id`. Admins pueden ver
cualquiera.

`DeliveryRouteView` (client) — UI móvil con:
- Barra superior: nombre ruta, fecha, estado, progreso (X/N entregas).
- Botón "Iniciar ruta" (si status PENDING) → `startRouteAction`.
- Lista de paradas ordenadas:
  - Sede (nombre + dirección).
  - Botón "Abrir en Google Maps" (link con `latitude,longitude`).
  - Pedidos de esa sede: nombre empleado + platos.
  - Botón "Confirmar entregas" por pedido o en lote.
  - Botón "Reportar incidencia" por parada.
- Botón "Finalizar ruta" al final (si todo entregado).

Confirmar entrega → modal:
- Método (in_person / reception / locker).
- Nombre del receptor (si aplica).
- Foto/firma (`proofType` + `proofUrl` — stub por ahora, guarda URL vacía).
- Geolocalización capturada del device.

Crea `DeliveryProof` + `DeliveryEvent(DELIVERED)` + actualiza
`Order.status = DELIVERED`.

### 13. Facturación

**URL**: `/catering/facturas`
**File**: `app/(catering)/catering/facturas/page.tsx`

Dashboard de facturación. KPIs: total facturado YTD, pagadas, pendientes,
este mes.

**Nota**: UI admin para gestión de facturas está pendiente. Las APIs
existen:

- `GET /api/catering/facturas` — listar.
- `POST /api/catering/facturas` — crear individual (no lo típico).
- `POST /api/catering/facturas/generar` — generar todas las del mes
  (llamado por el cron el día 1).
- `POST /api/catering/facturas/[id]/pagar` — marcar como pagada.
- `GET /api/catering/facturas/[id]` — detalle con líneas.

Sistema implementado:
- Generación con cálculo Decimal (no flotante — precisión fiscal).
- Solo pedidos `DELIVERED` entran como `InvoiceLine`.
- `priceOverride` se considera.
- Snapshot inmutable con hash SHA-256.
- IVA 10% (comida) por defecto, configurable.
- Estados: DRAFT → ISSUED → SENT → PAID.
- Audit logs en cada transición.

### 14. Incidencias

**URL**: `/catering/incidencias`
**File**: `app/(catering)/catering/incidencias/page.tsx`

Queries:
- `getCateringIncidentStats(tenantId)` — stats.
- `getCateringIncidents(tenantId, filters)` — listado.

KPIs: total abierto, en progreso, resuelto, compensado.

Filtros (`CateringIncidentsFilters`): status, type, severity.

`CateringIncidentsList` con paginación. Link a detalle.

Detalle: endpoint `/api/catering/incidencias/[id]` (no página separada —
se usa modal o slide-over). Se puede cambiar estado y aplicar
resolución (`ResolveIncidentDialog`).

## Server Actions usadas

- `components/catering/platos/actions.ts`: `createDishAction`,
  `updateDishAction`, `deleteDishAction`, `cloneDishAction`,
  `toggleDishActiveAction`.
- `components/catering/delivery/actions.ts`: `startRouteAction`,
  `completeRouteAction`, `confirmDeliveryAction`, `reportIncidentAction`.
- `components/catering/menus/actions.ts` (si existe):
  `updateDailyMenuAction`, `publishMenuAction`, `hideMenuAction`.

## APIs específicas del portal

Ver [../api/catering.md](../api/catering.md).

Principales:
- Platos: `/api/catering/platos/*`.
- Menús: `/api/catering/menus/*` (semanal, diario, publicar).
- Producción: `/api/catering/produccion/cocina`, `.../empaquetado`,
  `.../etiquetas`.
- Rutas: `/api/catering/rutas/*`.
- Entregas: `/api/catering/entregas/confirmar`, `.../incidencia`.
- Incidencias: `/api/catering/incidencias/[id]`.
- Facturas: `/api/catering/facturas/*`.
- Dashboard: `/api/catering/dashboard`.

## Permisos efectivos (matriz por rol)

| Módulo | ADMIN_C | CHEF | COCINERO | REPARTIDOR | FINANZAS_C |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Menús (crear/publicar) | ✅ | ✅ | — | — | — |
| Menús (leer) | ✅ | ✅ | ✅ | — | ✅ |
| Platos (CRUD) | ✅ | ✅ | — | — | — |
| Producción (KDS) | ✅ | ✅ | ✅ | — | — |
| Rutas (admin) | ✅ | — | — | — | — |
| Rutas (móvil repartidor) | ✅ | — | — | ✅ | — |
| Entregas confirmar | ✅ | — | — | ✅ | — |
| Incidencias | ✅ | ✅ | — | — | — |
| Facturación | ✅ | — | — | — | ✅ |
