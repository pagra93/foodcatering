# API — Admin

Endpoints restringidos a `SUPER_ADMIN` (algunos lectura `AUDITOR`).

## Tenants

### `GET /api/admin/tenants`

Lista paginada de tenants.

- **Auth**: SUPER_ADMIN, AUDITOR.
- **Query params**: `type` (EMPRESA/CATERING/ROOT), `status`
  (ACTIVE/SUSPENDED/INACTIVE), `search`, `page`, `pageSize`, `orderBy`,
  `orderDir`.
- **Response**: `{ data: Tenant[], total, page, pageSize }`.

### `POST /api/admin/tenants`

Crea un tenant genérico (sin Company ni Restaurant asociado). Útil para
testing o migración.

- **Auth**: SUPER_ADMIN.
- **Body**: `{ type, name, subdomain, ...branding }`. Validado con
  `tenantSchema` en `lib/validations/tenant.ts`.
- **Response**: `{ data: Tenant }`.

### `GET /api/admin/tenants/[id]`

Detalle completo del tenant con `_count` de relaciones (users, companies,
restaurants).

- **Auth**: SUPER_ADMIN, AUDITOR.
- **Response**: `{ data: TenantDetail }`.

### `PATCH /api/admin/tenants/[id]`

Actualiza campos del tenant.

- **Auth**: SUPER_ADMIN.
- **Body**: subset del schema.
- **Side effects**: `logAudit({ action: 'UPDATE', entity: 'Tenant' })`.

### `DELETE /api/admin/tenants/[id]`

Soft delete (marca `deletedAt`). No borra físicamente.

- **Auth**: SUPER_ADMIN.
- **Response**: `{ success: true }`.

### `GET /api/admin/tenants/[id]/status`

Estado operativo detallado del tenant: usuarios activos, relaciones, docs,
última actividad, alertas.

- **Auth**: SUPER_ADMIN, AUDITOR.

## Impersonación

### `POST /api/admin/impersonate/start`

Inicia impersonación.

- **Auth**: SUPER_ADMIN.
- **Rate limit**: 3 impersonaciones/hora/user.
- **Body**: `{ targetUserId: string }`.
- **Validaciones**:
  - Target existe y está ACTIVE.
  - Target no es SUPER_ADMIN.
- **Side effects**:
  - Crea `ImpersonationToken` con TTL 15min.
  - `session.update()` insertándolo en el JWT.
  - `logAudit({ action: 'IMPERSONATE', entity: 'User', entityId: targetUserId })`.
- **Response**: `{ redirectTo: string }` — ruta al dashboard del target.

### `POST /api/admin/impersonate/stop`

Termina impersonación y restaura la sesión original.

- **Auth**: cualquier usuario con `session.impersonationToken` activo.
- **Side effects**: `session.update({ impersonationToken: null })`,
  `logAudit({ action: 'IMPERSONATE_END' })`.
- **Response**: `{ redirectTo: '/admin' }`.

### `GET /api/admin/impersonate/status`

Estado actual de impersonación — usado por `ImpersonationBanner` para
saber si mostrar el banner.

- **Auth**: cualquier sesión.
- **Response**: `{ impersonating: bool, targetName?, expiresIn? }`.

## Nota sobre permisos vía wildcards

`SUPER_ADMIN` tiene `*:*` en `PERMISSIONS` (lib/auth/permissions.ts), por
eso todos los endpoints aquí que usan `withPermission('tenants:admin')`,
`withPermission('users:impersonate')`, etc., le dejan pasar.

`AUDITOR` tiene `*:read` — puede GET cualquier endpoint pero no puede
crear/modificar/borrar.
