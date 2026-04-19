# API — Empresa

Endpoints para roles de empresa. 20 endpoints.

## Catering asignado

### `GET /api/empresa/catering/menus`

Menús publicados del catering asignado, próximos 7-14 días.

### `GET /api/empresa/catering/ratings`

Ratings agregados del catering con desglose.

### `GET /api/empresa/catering/sla`

Métricas de SLA (puntualidad, incidentRate) vs SLA pactado en
`CompanyCateringAssignment`.

## Configuración

### `GET /api/empresa/configuracion/general`

Información general de la empresa (razón social, CIF, contactos).

### `PATCH /api/empresa/configuracion/general`

Actualizar datos generales.

- **Auth**: ADMIN_EMPRESA.
- **Body**: subset de `updateCompanySchema`.
- **Side effects**: logAudit + revalidate.

### `GET /api/empresa/configuracion/plan`

Info del plan contratado + política actual.

### `GET /api/empresa/configuracion/preferencias`

`CompanySettings` actual.

### `PATCH /api/empresa/configuracion/preferencias`

Actualizar `CompanySettings` (umbrales de alerta, emails, vistas por
defecto).

### `GET /api/empresa/configuracion/sedes`

Listar sedes (`CompanySite[]`) de la empresa.

### `POST /api/empresa/configuracion/sedes`

Crear sede.

- **Body**: `{ name, address, postalCode, city, latitude?, longitude?, deliveryWindow?, deliveryNotes?, active? }`.

### `GET /api/empresa/configuracion/sedes/[id]`

Detalle de sede.

### `PATCH /api/empresa/configuracion/sedes/[id]`

Actualizar sede. Soft-disable poniendo `active: false`.

### `GET /api/empresa/configuracion/documentos`

Listar documentos contractuales (contrato, CIF, certificado digital,
anexos).

### `POST /api/empresa/configuracion/documentos`

Subir documento (URL por ahora — upload real pendiente).

## Empleados

### `GET /api/empresa/empleados?search=&status=&department=&siteId=&page=`

Listado paginado con métricas agregadas por empleado.

### `POST /api/empresa/empleados`

Crear empleado. Crea `User` + `Employee` + opcional
`EmployeeInvitation`.

- **Auth**: ADMIN_EMPRESA, RRHH.
- **Body**: `{ email, name, phone?, employeeNumber?, department?, position?, siteId, dietPrefs?, sendInvitation: bool }`.

### `GET /api/empresa/empleados/[id]`

Detalle del empleado.

### `PATCH /api/empresa/empleados/[id]`

Actualizar. Cambios en `dietPrefs` se persisten como JSON.

## Pedidos

### `GET /api/empresa/pedidos/export?status=&period=&dateFrom=&dateTo=&employeeId=&siteId=`

Descarga CSV de pedidos según filtros.

- **Auth**: ADMIN_EMPRESA, RRHH, FINANZAS.
- **Rate limit**: 10/hora/tenant.
- **Response**: `Content-Type: text/csv; charset=utf-8` + header
  `Content-Disposition: attachment; filename="pedidos-YYYY-MM.csv"`.
- **Columnas**: Fecha, Empleado, Número, Departamento, Sede, 1º, 2º,
  Postre, Importe, Estado, Entregado.

## Facturación

### `GET /api/empresa/facturacion/export?period=&format=ERP_CSV|PAYROLL_CSV|SUMMARY_PDF`

Descarga exportación para ERP o nómina.

- **Auth**: ADMIN_EMPRESA, FINANZAS.
- **Side effects**: crea `CompanyExport` registrando la descarga para
  auditoría.
- **Formatos**:
  - `ERP_CSV` — estructura para SAP/A3/Sage (columnas: fecha, concepto,
    importe, cuenta contable, empleado).
  - `PAYROLL_CSV` — para nómina (copay empleado por persona y mes).
  - `SUMMARY_PDF` — PDF visual (pendiente).
