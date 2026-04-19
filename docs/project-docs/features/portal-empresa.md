# Portal Empresa

**Subdominio**: `<empresa>.sintupper.com` (ej: `acme.sintupper.com`)
**Path prefix**: `/empresa/*`
**Roles**: `ADMIN_EMPRESA`, `RRHH`, `FINANZAS`, `MANAGER_SEDE`
**Páginas**: 11

## Layout

Dos layouts anidados:

- `app/(empresa)/layout.tsx` — validación de rol (grupo permitido).
  Redirige a `/unauthorized` si no.
- `app/(empresa)/empresa/layout.tsx` — sidebar + navbar. Carga
  `getCurrentTenant()` una vez por request (cached con React Cache).

Sidebar (`EmpresaSidebar`):
- Dashboard
- Empleados
- Pedidos
- Incidencias
- Catering asignado
- Facturación
- Auditoría fiscal
- Configuración
- Registro de actividad

## Páginas

### 1. Dashboard

**URL**: `/empresa/dashboard`
**File**: `app/(empresa)/empresa/dashboard/page.tsx`

Query: `getCompanyDashboardData(tenantId)` — datos completos.

Componentes:
- `DashboardKPIs` — pedidos del mes, gasto, empleados activos,
  adopción (%).
- `DashboardCharts` — tendencia de consumo últimos 3 meses.
- `DashboardAlerts` — alertas configurables (`CompanySettings`):
  cancelación >X%, adopción <X%, deductibilidad <X%.
- `RecentActivity` — últimos 20 audit logs del tenant.

Cada sección dentro de `<Suspense>` con skeleton para progressive
rendering.

### 2. Empleados (listado)

**URL**: `/empresa/empleados?search=&status=&department=&siteId=&page=`
**File**: `app/(empresa)/empresa/empleados/page.tsx`

Query: `getEmployees(tenantId, filters)` — empleados paginados con
métricas agregadas (pedidos del mes, gasto, última fecha de pedido, rating
medio dado).

Filtros:
- Búsqueda por nombre/email/número.
- Estado (ACTIVE / DISABLED / PENDING).
- Departamento (autocomplete de valores existentes).
- Sede (select de `CompanySite`).

Botones de cabecera:
- **Importar CSV** — modal con upload + validación Zod + preview +
  confirmación. Crea `User`s + `Employee`s + opcionalmente
  `EmployeeInvitation`s con email automático.
- **+ Nuevo Empleado** → `/empresa/empleados/nuevo`.

Tabla `EmployeesTable`: nombre, email, sede, departamento, nº pedidos,
gasto mes, rating medio, estado, acciones.

### 3. Nuevo Empleado

**URL**: `/empresa/empleados/nuevo`
**File**: `app/(empresa)/empresa/empleados/nuevo/page.tsx`

Renderiza `EmployeeFormComplete` (compartido con edición).

Server Action: `createEmployee(data)`:
1. Crea `User` (password provisional, status PENDING).
2. Crea `Employee` asociado.
3. Genera `EmployeeInvitation` con token 7d.
4. Envía email con link `/register?token=...` (stub hoy — log en consola).
5. `logAudit({ action: 'CREATE', entity: 'Employee' })`.

### 4. Detalle de Empleado

**URL**: `/empresa/empleados/[id]`
**File**: `app/(empresa)/empresa/empleados/[id]/page.tsx`

Query: `prisma.employee.findFirst({ where: { id, tenantId }, include: { user, site, ratings } })`.

Secciones:
1. **Información Personal** — nombre (descifrado), email, teléfono,
   número empleado, departamento, posición, fecha alta/baja.
2. **Preferencias Dietéticas** — alergias, preferencias, restricciones,
   `weeklyMenuDays`, `monthlyLimit`.

Botones: "Enviar Email" (stub), "Editar" → `/editar`.

### 5. Editar Empleado

**URL**: `/empresa/empleados/[id]/editar`
**File**: `app/(empresa)/empresa/empleados/[id]/editar/page.tsx`

`EmployeeFormComplete` en modo `edit` precargado.

Server Action: `updateEmployee(id, data)` — actualiza y loguea diff.

### 6. Pedidos (listado)

**URL**: `/empresa/pedidos?search=&status=&period=&dateFrom=&dateTo=&employeeId=&siteId=&page=`
**File**: `app/(empresa)/empresa/pedidos/page.tsx`

Query: `getOrders(tenantId, filters)` con scope empresa
(`tenantEmpresa = tenantId`).

KPIs: total pedidos del período, gasto, empleados que pidieron,
incidencias asociadas.

Filtros:
- Búsqueda (nombre empleado, ID pedido).
- Estado (enum `OrderStatus`).
- Período (hoy / esta semana / este mes / mes anterior / custom).
- Rango de fechas (si `period = custom`).
- Empleado (autocomplete).
- Sede.

Botones:
- **Export CSV** → `/api/empresa/pedidos/export?...` (descarga CSV con
  los pedidos según filtros aplicados).
- **Informe Mensual** (stub).

### 7. Detalle de Pedido

**URL**: `/empresa/pedidos/[id]`
**File**: `app/(empresa)/empresa/pedidos/[id]/page.tsx`

Query: `getOrderById(id, tenantId)` — pedido + empleado + sitio +
`OrderHistory` + `Incident[]` + `DeliveryProof`.

Secciones:
1. **Overview** — empleado, fecha, sede, platos seleccionados (con
   nombre legible), precio, estado actual, badges.
2. **Trazabilidad fiscal** — cumplimiento IRPF:
   - Importe ≤ 11€ o no.
   - Día laborable (según `CompanyPolicy.daysActive` y calendario).
   - Tiene `DeliveryProof`.
   - No tiene incidencia abierta.
   Cada check con ✅ o ⚠️.
3. **Historial** — `OrderHistory` ordenado cronológico con `changeReason`
   y diff.
4. **Incidencias** — si hay, listado con severidad y estado.

Botón "Descargar Justificante" (stub — pendiente generador PDF).

### 8. Incidencias (listado)

**URL**: `/empresa/incidencias?page=`
**File**: `app/(empresa)/empresa/incidencias/page.tsx`

Queries: `getIncidentsKPIs(tenantId)` + `getIncidents(tenantId, filters)`.

KPIs: total, abiertas, en progreso, resueltas, compensadas.

Lista paginada con filtros por severidad y estado.

Botón **"+ Nueva Incidencia"** → `/empresa/incidencias/nueva`.

### 9. Nueva Incidencia

**URL**: `/empresa/incidencias/nueva`
**File**: `app/(empresa)/empresa/incidencias/nueva/page.tsx`

Renderiza `NewIncidentForm` (client component). Campos:
- Tipo (select del catálogo).
- Severidad.
- Pedido asociado (opcional, autocomplete últimos 30 días).
- Descripción.
- Adjuntos (stub por ahora).

Server Action: `createIncident(data)` — crea `Incident` + audit log.

### 10. Detalle de Incidencia

**URL**: `/empresa/incidencias/[id]`
**File**: `app/(empresa)/empresa/incidencias/[id]/page.tsx`

Secciones:
1. **Header** — ID, tipo, severidad, estado, badges.
2. **Pedido asociado** — link al pedido si existe.
3. **Resolución** — si `status = RESOLVED|COMPENSATED`: tipo,
   importe, detalles, fecha.

No editable desde aquí — el catering la gestiona.

### 11. Catering asignado

**URL**: `/empresa/catering`
**File**: `app/(empresa)/empresa/catering/page.tsx`

Query: `getAssignedCatering(tenantId)` — Restaurant + docs + última
auditoría + ratings agregados.

Si no hay catering asignado → `<Alert variant="destructive">` pidiendo
que el super admin lo asigne.

Tabs:
1. **Información** — `CateringInfoTab`: contacto, dirección, horarios,
   zonas.
2. **Menús** — `CateringMenusTab`: menús publicados próximas semanas.
3. **SLA y Calidad** — `CateringSLATab`: puntualidad, tasa de incidencias,
   cumplimiento de SLA pactado.
4. **Valoraciones** — `CateringRatingsTab`: ratings desglose por
   dimensión (sabor/porción/presentación), últimos comentarios.

### 12. Facturación

**URL**: `/empresa/facturacion`
**File**: `app/(empresa)/empresa/facturacion/page.tsx`

Queries:
- `getBillingSum(tenantId)` — resumen anual.
- `getMonthlyBreakdown(tenantId, year, month)` — detalle del mes.
- `getConciliationReport(tenantId, year, month)` — conciliación
  pedidos ↔ factura.

3 tabs:
1. **Resumen** — `BillingKPIs`: gasto YTD, promedio mensual,
   tendencia, comparación año anterior. Gráfica barras.
2. **Desglose Mensual** — `BillingMonthlyBreakdown`: tabla de pedidos del
   mes con empleado, fecha, concepto, importe, flag facturable.
3. **Conciliación** — `BillingConciliation`: suma de pedidos ↔ subtotal
   de factura. Discrepancias resaltadas.

### 13. Auditoría fiscal

**URL**: `/empresa/auditoria`
**File**: `app/(empresa)/empresa/auditoria/page.tsx`

Queries:
- `getOrGenerateFiscalReport(tenantId, year, month)` — `FiscalReport` del
  mes (lo crea si no existe).
- `getAnnualFiscalSummary(tenantId, year)` — resumen de los 12 meses.
- `checkFiscalCompliance(tenantId, companyId, year, month)` — problemas
  de cumplimiento detectados.

Alerta de cumplimiento arriba: OK (verde) o problemas (rojo con listado).

KPIs: total pedidos, importe, deducible, tasa deductibilidad %.

Tabla anual con desglose mensual.

Botón "Exportar Dossier Fiscal" → PDF + CSVs comprimidos (pendiente).

Sección "Integridad y Firma": muestra `signatureHash` del reporte y
explica cómo verificarlo.

### 14. Configuración

**URL**: `/empresa/configuracion`
**File**: `app/(empresa)/empresa/configuracion/page.tsx`

Query: `getCompanyConfiguration(tenantId)`.

4 tabs:
1. **Información general** — `ConfigGeneralTab`: razón social, CIF,
   dirección, contactos.
2. **Plan y límites** — `ConfigPlanTab`: plan contratado (STARTER /
   GROWTH / ENTERPRISE), política (cutoff, días, copays, límites).
   Cambios aquí crean `CompanyPolicyHistory`.
3. **Preferencias** — `ConfigPreferencesTab`: umbrales de alerta,
   emails de notificación, vistas por defecto.
4. **Documentación** — `ConfigDocumentationTab`: contrato, certificado
   digital, anexos. Upload con `DocumentUploadDialog`.

Alert informativo: cambios de política afectan a pedidos futuros; no
retroactivo.

### 15. Registro de actividad

**URL**: `/empresa/actividad?page=`
**File**: `app/(empresa)/empresa/actividad/page.tsx`

Queries: `getActivityStats(tenantId)` + `getActivityLog(tenantId, {page, limit})`.

KPIs del mes: total acciones, por tipo (CREATE/UPDATE/DELETE), usuarios
activos.

Tabla paginada con: fecha, usuario, acción, recurso afectado, IP.
Colores por tipo de acción.

## Server Actions usadas

Cada feature tiene `components/empresa/<feature>/actions.ts` con sus
acciones. Ejemplos:

- `components/empresa/empleados/actions.ts`: `createEmployeeAction`,
  `updateEmployeeAction`, `deleteEmployeeAction`,
  `importEmployeesCSVAction`.
- `components/empresa/pedidos/actions.ts`: `exportOrdersCSVAction`.
- `components/empresa/configuracion/actions.ts`:
  `updateGeneralInfoAction`, `updatePolicyAction`,
  `updatePreferencesAction`, `uploadDocumentAction`.
- `components/empresa/incidencias/actions.ts`: `createIncidentAction`.

Todas usan `revalidatePath` para invalidar la página actualizada.

## APIs específicas del portal

Ver [../api/empresa.md](../api/empresa.md).

Principales:
- `/api/empresa/empleados` (GET, POST).
- `/api/empresa/empleados/[id]` (GET, PATCH).
- `/api/empresa/configuracion/*`.
- `/api/empresa/pedidos/export` (GET).
- `/api/empresa/facturacion/export` (GET).
- `/api/empresa/catering/*` (info del catering asignado).
