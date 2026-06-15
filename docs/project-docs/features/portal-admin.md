# Portal Súper Admin

**Subdominio**: `admin.plati.es`
**Path prefix**: `/admin/*`
**Roles**: `SUPER_ADMIN` (operativos) / `AUDITOR` (solo lectura)
**Páginas**: 16

## Layout

`app/(admin)/admin/layout.tsx` (Server Component async).

Protección: requiere rol `SUPER_ADMIN` o `AUDITOR`. Si no → redirect a
`/unauthorized`.

Componentes fijos:
- `AdminSidebar` — navegación principal (10 módulos según PRD).
- `AdminNavbar` — branding, user menu, notificaciones.
- `AdminBreadcrumbs` — breadcrumbs dinámicos.
- `ImpersonationBanner` — banner naranja si hay impersonación activa.

## Páginas

### 1. Dashboard

**URL**: `/admin`
**File**: `app/(admin)/admin/page.tsx`

Dashboard global con KPIs en tiempo real. Queries consumidas
(`lib/db/queries/admin-dashboard.ts`):

- `getDashboardKPIs()` — empresas activas, caterings activos, pedidos
  hoy, incidencias abiertas, facturado mensual, adopción agregada.
- `getDashboardCharts()` — series temporales 30-90 días para tendencias.
- `getDashboardAlerts()` — alertas críticas (docs caducando, caterings
  suspendidos, picos de cancelación).
- `getRecentActivity()` — últimos audit logs cross-tenant.

Componentes:
- `DashboardKPIs` (fila superior, 6 cards).
- `ChartsSection` dentro de `<Suspense>` con skeleton.
- `AlertsPanel` a la derecha.
- `RecentActivityTable` abajo.
- `QuickActionsPanel` con botones a "Crear Catering", "Crear Empresa",
  "Ver incidencias críticas".

### 2. Listado de Caterings

**URL**: `/admin/caterings`
**File**: `app/(admin)/admin/caterings/page.tsx`

Queries: `getCaterings(filters)` + `getCateringsGlobalKPIs()`.

KPIs: total, activos, suspendidos, en revisión.

Tabla (`CateringsTable`) con columnas: nombre, CIF, subdomain, operational
status, docs status, punctuality rate, incidents rate, avg rating,
empresas asignadas, creado.

Botones de cabecera:
- **Docs por Caducar** — filtra tabla por `documentsStatus = WARNING|EXPIRED`.
- **Incidencias Críticas** — abre panel lateral con caterings con alta
  tasa de incidencias.
- **+ Crear Catering** — navega a `/admin/caterings/new`.

### 3. Crear Catering

**URL**: `/admin/caterings/new`
**File**: `app/(admin)/admin/caterings/new/page.tsx`

Renderiza `CateringWizard` (multi-paso):

1. Datos legales (nombre, CIF, IBAN, billing address).
2. Contacto (persona, email, teléfono).
3. Configuración operativa (horarios, días, zonas, capacidad).
4. Configuración comercial (comisión, minimum billing, payment cycle).
5. Documentación (URLs o upload de Registro Sanitario, RC, Manipuladores).
6. Revisión y confirmación.

Server Action: `createCatering(data)` — crea Tenant + Restaurant en
transacción. Rollback si alguno falla.

### 4. Detalle de Catering

**URL**: `/admin/caterings/[id]`
**File**: `app/(admin)/admin/caterings/[id]/page.tsx`

Query: `getCateringById(id)` — devuelve tenant + restaurant +
documentos + platos + usuarios + KPIs + alertas.

8 tabs:

1. **Overview** — KPIs, estado operativo, contactos, config económica.
2. **Calidad & Cumplimiento** — documentos con vencimiento, auditorías.
3. **Operación Diaria** — cutoff, horarios, días, capacidad.
4. **Menús & Platos** — catálogo resumen.
5. **Facturación** — pagos, comisiones, histórico.
6. **Incidencias** — reportes pendientes y resueltas.
7. **Usuarios** — miembros del tenant con rol.
8. **Actividad** — audit log del tenant.

Header: logo del catering o inicial con color primario, badges de status.

Alertas críticas (si existen) se muestran arriba con `<Alert variant="destructive">`.

### 5. Listado de Empresas

**URL**: `/admin/empresas`
**File**: `app/(admin)/admin/empresas/page.tsx`

Queries: `getCompanies(filters)` + `getCompaniesGlobalKPIs()`.

KPIs: total empresas, gasto agregado del mes, empleados totales,
adopción media.

Tabla: `CompaniesTable` con nombre, CIF, plan, empleados, gasto mensual,
adopción, creado.

### 6. Crear Empresa

**URL**: `/admin/empresas/new`
**File**: `app/(admin)/admin/empresas/new/page.tsx`

Renderiza `CompanyForm` en modo `create`.

Server Action: `createCompany(data)` — crea en transacción Tenant +
Company + CompanyPolicy inicial + CompanySite por defecto.

### 7. Detalle de Empresa

**URL**: `/admin/empresas/[id]`
**File**: `app/(admin)/admin/empresas/[id]/page.tsx`

Query: `getCompanyByIdComplete(id)` — tenant + company + policy + sites
+ employees + users + assignments.

5 tabs:

1. **Overview** — KPIs, alertas, pedidos recientes, incidencias.
2. **Configuración** — política (cutoff, días, límites, copays),
   contactos RRHH/Finanzas.
3. **Sedes** — grid de sedes con info + empleados por sede.
4. **Empleados** — listado de activos, filtrable.
5. **Usuarios** — usuarios del tenant con rol.

### 8. Editar Empresa

**URL**: `/admin/empresas/[id]/edit`
**File**: `app/(admin)/admin/empresas/[id]/edit/page.tsx`

Renderiza `CompanyForm` en modo `edit` precargado. Server Action:
`updateCompany(id, data)`. Cambios de política crean
`CompanyPolicyHistory`.

### 9. Listado de Tenants (genérico)

**URL**: `/admin/tenants`
**File**: `app/(admin)/admin/tenants/page.tsx`

Vista genérica de **todos los tenants** (ROOT + EMPRESA + CATERING).
Útil para operaciones cross-cutting (ej: suspender múltiples).

Filtros avanzados (`TenantsFilters`):
- Búsqueda por nombre/subdomain.
- Tipo (EMPRESA / CATERING / ROOT).
- Estado (ACTIVE / SUSPENDED / INACTIVE).
- Orden (creado asc/desc, actualizado asc/desc, nombre alf).
- Paginación.

### 10. Crear Tenant (genérico)

**URL**: `/admin/tenants/new`
**File**: `app/(admin)/admin/tenants/new/page.tsx`

`TenantForm` en modo `create`. Para casos donde no se quiere pasar por
el wizard específico (ej: crear tenant vacío para testing).

### 11. Detalle de Tenant

**URL**: `/admin/tenants/[id]`
**File**: `app/(admin)/admin/tenants/[id]/page.tsx`

Query: `getTenantById(id)`. 4 tabs:

1. **Resumen** — totales (_count), info general.
2. **Configuración** — regional (timezone, moneda, idioma), branding
   (color, logo).
3. **Usuarios** — tabla de usuarios del tenant.
4. **Actividad** — audit log (stub, "Próximamente").

### 12. Editar Tenant

**URL**: `/admin/tenants/[id]/edit`
**File**: `app/(admin)/admin/tenants/[id]/edit/page.tsx`

`TenantForm` en modo `edit`.

### 13. Listado de Usuarios

**URL**: `/admin/users`
**File**: `app/(admin)/admin/users/page.tsx`

Query: `prisma.user.findMany({ include: { tenant: true }})` — TODOS los
usuarios del sistema (scope SUPER_ADMIN).

KPIs: total, activos, deshabilitados, pendientes (por `status`).

Para cada user: email, nombre (descifrado vía `decryptPII`), rol, tenant
asociado, estado, fecha de creación.

Botón "Ver Detalle" → `/admin/users/[id]`.

### 14. Crear Usuario

**URL**: `/admin/users/new`
**File**: `app/(admin)/admin/users/new/page.tsx`

**Placeholder** — la creación de usuarios se hace desde el portal empresa
(RRHH invita a empleados) o desde el seed script. Esta página muestra un
mensaje informativo.

### 15. Detalle de Usuario

**URL**: `/admin/users/[id]`
**File**: `app/(admin)/admin/users/[id]/page.tsx`

Query: `prisma.user.findUnique({ include: { tenant: true }})`.

Secciones:
1. **Información Básica** — email, teléfono (descifrado), rol, estado, fechas.
2. **Tenant Asociado** — nombre, tipo, estado del tenant.
3. **Seguridad** — MFA habilitado (sí/no).

Botón **"Impersonar"** (solo visible para `SUPER_ADMIN`, no para `AUDITOR`):
- Abre modal con aviso + confirmación.
- Al confirmar, llama a `POST /api/admin/impersonate/start` con
  `targetUserId`.
- Redirige al dashboard correspondiente al rol del target.
- Ver [../architecture/auth.md](../architecture/auth.md).

### 16. Editar Usuario

**URL**: `/admin/users/[id]/edit`
**File**: `app/(admin)/admin/users/[id]/edit/page.tsx`

**Placeholder** — por ahora, edición desde portal empresa o directamente
en BD vía Prisma Studio.

## Módulos de la sidebar

Según el PRD, el portal admin planea 10 módulos. Hoy implementados:

| Módulo | Estado | Páginas |
|---|---|---|
| Dashboard | ✅ | 1 |
| Caterings | ✅ | 4 |
| Empresas | ✅ | 4 |
| Tenants | ✅ | 4 |
| Usuarios | 🟡 | 3 (2 placeholder) |
| Auditoría | ⏳ planeado | — |
| Facturación | ⏳ planeado | — |
| Incidencias | ⏳ planeado | — |
| Reportes | ⏳ planeado | — |
| Configuración | ⏳ planeado | — |

## APIs específicas del portal

- `/api/admin/tenants` (GET, POST) — listar y crear.
- `/api/admin/tenants/[id]` (GET, PATCH, DELETE) — CRUD.
- `/api/admin/tenants/[id]/status` (GET) — estado detallado.
- `/api/admin/impersonate/start` (POST) — iniciar impersonación.
- `/api/admin/impersonate/stop` (POST) — terminar impersonación.
- `/api/admin/impersonate/status` (GET) — estado de la sesión impersonada.

Ver [../api/admin.md](../api/admin.md).

## Permisos efectivos

- `SUPER_ADMIN`: wildcard `*:*` — puede todo.
- `AUDITOR`: `*:read` — puede ver todo pero no mutar nada (botones de
  acción se ocultan vía `PermissionGuard`).
