# API — Catering

Endpoints para roles de catering. 33 endpoints agrupados por dominio.

## Dashboard

### `GET /api/catering/dashboard`

KPIs + alertas + actividad reciente del catering.

- **Auth**: roles CATERING.
- **Response**: `{ kpis, alerts, recentActivity }`.

Query: `getCateringDashboard(tenantId)`.

## Platos

### `GET /api/catering/platos`

Listado paginado.

- **Query params**: `search`, `course`, `active`, `page`, `pageSize`.
- **Response**: paginado.

### `POST /api/catering/platos`

Crear plato.

- **Body**: `createDishSchema`.
- **Response**: `{ data: Dish }`.

### `GET /api/catering/platos/[id]`

Detalle del plato.

### `PATCH /api/catering/platos/[id]`

Actualizar.

- **Body**: `updateDishSchema`.
- **Side effects**: invalida cache, logAudit.

### `DELETE /api/catering/platos/[id]`

Soft delete (marca `deletedAt`).

### `POST /api/catering/platos/[id]/clonar`

Duplica el plato con `name + " (copia)"`.

- **Response**: `{ data: Dish (nuevo) }`.

## Menús semanales

### `GET /api/catering/menus/semanal?week=YYYY-MM-DD`

Menús de la semana (todos los días + platos publicados).

### `GET /api/catering/menus/dia/[date]`

Menú de un día específico (`DishSchedule` del día + platos activos
disponibles).

### `POST /api/catering/menus/publicar`

Publica un menú semanal (marca `DishSchedule.status = PUBLISHED`).

- **Body**: `{ weekStart: Date, dishes: [{ dishId, date, stockLimit?, priceOverride?, visibleTo? }] }`.
- **Validaciones**: `validateMenuBeforePublish` — hay 1º/2º/postre
  suficientes, no hay conflictos de alérgenos masivos, etc.
- **Side effects**: notifica a empresas asignadas (futuro).

## Producción

### `GET /api/catering/produccion/cocina?date=YYYY-MM-DD&type=primeros|segundos|postres&companyId?`

Datos para Kitchen Display. Consolida `Order.selection` en totales por
plato.

### `POST /api/catering/produccion/cocina`

Marcar plato como listo/en proceso (para un futuro KDS interactivo — hoy
es display only).

### `GET /api/catering/produccion/empaquetado?date=YYYY-MM-DD&companyId?`

Datos para Packing Display. Granularidad por empleado.

### `POST /api/catering/produccion/empaquetado`

Marcar empaquetado (stub).

### `POST /api/catering/produccion/etiquetas`

Generar etiquetas térmicas (PDF) para empaquetado. Stub hoy.

## Rutas

### `GET /api/catering/rutas?date=&status=&deliveryUserId=&page=`

Listar rutas con filtros.

### `POST /api/catering/rutas`

Crear ruta (admin).

- **Body**: `{ name, date, deliveryUserId?, sites: [{ companySiteId, sequence }] }`.

### `GET /api/catering/rutas/[id]`

Detalle con `DeliveryRouteSite[]` + pedidos + eventos.

### `PATCH /api/catering/rutas/[id]`

Actualizar.

### `DELETE /api/catering/rutas/[id]`

Eliminar (solo si `status = PENDING`).

### `POST /api/catering/rutas/[id]/iniciar`

Marca `status = IN_PROGRESS`, `startedAt = now()`, crea
`DeliveryRouteEvent(ROUTE_STARTED)`.

- **Auth adicional**: el repartidor asignado o admin.

### `POST /api/catering/rutas/[id]/completar`

Marca `status = COMPLETED`, `completedAt = now()`, crea evento.

- **Validación**: todos los pedidos deben estar DELIVERED o FAILED.

## Entregas

### `POST /api/catering/entregas/confirmar`

Confirma entrega de un pedido.

- **Body**: `{ orderId, deliveredAt, deliveryMethod, proofType, proofUrl?, recipientName?, latitude?, longitude? }`.
- **Side effects**:
  - Crea `DeliveryProof`.
  - Crea `DeliveryEvent(DELIVERED)`.
  - Actualiza `Order.status = DELIVERED`.
  - `logAudit({ action: 'ORDER_DELIVERED' })`.

### `POST /api/catering/entregas/incidencia`

Reportar incidencia in-situ.

- **Body**: `{ orderId, type, description, severity }`.
- **Side effects**: crea `Incident` con `reportedBy = user.id`, cambia
  `Order.status = ISSUE_REPORTED`.

## Incidencias

### `GET /api/catering/incidencias/[id]`

Detalle de incidencia.

### `PATCH /api/catering/incidencias/[id]`

Actualizar estado, asignar, resolver.

- **Body**: `{ status?, assignedTo?, resolution? }`.

## Facturación

### `GET /api/catering/facturas?period=&status=&empresaId=&page=`

Listar facturas emitidas por este catering.

### `POST /api/catering/facturas`

Crear factura individual (raro — normalmente se usa `generar`).

### `POST /api/catering/facturas/generar`

Genera facturas automáticas del mes para **todas las empresas** con
pedidos DELIVERED del período.

- **Body**: `{ period: "YYYY-MM" }`.
- **Llama internamente**: `generateInvoice()` por cada empresa.
- **Side effects**: crea `Invoice` + `InvoiceLine[]` por cada empresa,
  guarda `snapshot`, calcula `integrityHash`.

### `GET /api/catering/facturas/[id]`

Detalle de factura con líneas.

### `PATCH /api/catering/facturas/[id]`

Actualizar (cambios permitidos según estado — ej: no se puede editar
PAID salvo anulación).

### `DELETE /api/catering/facturas/[id]`

Solo permitido si `status = DRAFT`.

### `POST /api/catering/facturas/[id]/pagar`

Marca como PAID.

- **Body**: `{ paidAt, paymentMethod, transactionReference }`.
- **Side effects**: `logAudit({ action: 'INVOICE_PAID' })`.
