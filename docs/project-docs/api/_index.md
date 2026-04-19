# API Reference

67 endpoints REST en `app/api/`. Agrupados por dominio:

| Dominio | Prefijo | Endpoints | Doc |
|---|---|:-:|---|
| Auth | `/api/auth/*` | 1 (handler NextAuth) | [auth (abajo)](#auth) |
| Admin | `/api/admin/*` | 9 | [admin.md](./admin.md) |
| Catering | `/api/catering/*` | 33 | [catering.md](./catering.md) |
| Empresa | `/api/empresa/*` | 20 | [empresa.md](./empresa.md) |
| Empleado | `/api/empleado/*` | 4 | [empleado.md](./empleado.md) |

## Cuándo usar API routes vs Server Actions

Regla en este proyecto:

- **Server Actions** para mutaciones desde el mismo portal. Viven en
  `components/<portal>/<feature>/actions.ts`. Se invocan como functions
  desde client components y formulario actions.
- **API routes** para:
  - Callers externos (app móvil futura, webhooks, integraciones B2B).
  - Endpoints de descarga grande (exports CSV — mejor streaming).
  - NextAuth (obligatorio).
  - Cron jobs internos que quizás externalicemos (Vercel Cron, BullMQ).

En la práctica, muchos endpoints de catering y empresa son **duplicados**
de Server Actions — existen para futuro acceso móvil pero no se usan hoy
desde la UI. No los borramos porque la interfaz ya está ahí.

## Convenciones comunes

### Auth

Todos los endpoints (excepto `/api/auth/*` y públicos) están protegidos:

```ts
// app/api/empresa/empleados/route.ts
import { withRoles } from '@/lib/guards/api'

export const GET = withRoles(
  ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH'],
  async (req, session) => {
    const tenantId = await getScopedTenantId(req)
    const filters = parseFilters(req)
    const employees = await getEmployees(tenantId, filters)
    return NextResponse.json(employees)
  }
)
```

Guards:
- `withAuth(handler)` — solo requiere sesión.
- `withRoles(roles, handler)` — sesión + rol en lista.
- `withPermission(perm, handler)` — sesión + permiso según matriz.

Responses:
- 401 si no autenticado.
- 403 si autenticado pero sin permisos.
- 422 si validación Zod falla.
- 500 si error interno (logueado, respuesta genérica al cliente).

### Formato de respuesta

**Success**:
```json
{ "data": { ... } }   // operaciones puntuales
{ "data": [...], "total": N, "page": 1, "pageSize": 20 }  // listados
```

**Error**:
```json
{ "error": "Mensaje legible para el usuario", "code": "VALIDATION_ERROR" }
```

### Parámetros

Query params: camelCase (`?page=1&siteId=abc&dateFrom=2026-04-01`).
Body JSON: camelCase para consistencia con TypeScript.

### Paginación

Parámetros estándar:
- `page` (default 1).
- `pageSize` (default 20, max 100).

Response incluye `total`, `page`, `pageSize`. El cliente calcula páginas
totales = `Math.ceil(total / pageSize)`.

### Validación

Todos los endpoints que reciben body lo validan con Zod ANTES de tocar
la BD. Schemas en `lib/validations/`. Si falla, 422 con detalle:

```json
{
  "error": "Datos inválidos",
  "code": "VALIDATION_ERROR",
  "details": [
    { "path": ["email"], "message": "Email inválido" }
  ]
}
```

### Rate limiting

Rutas sensibles aplican rate limiting:

- `/api/auth/*` — 5/min/IP.
- `/api/admin/impersonate/start` — 3/hora/user.
- Exports CSV — 10/hora/tenant.

Excedido: 429 con `Retry-After` header.

## Endpoints globales

### Auth

`POST|GET /api/auth/[...nextauth]`

Handler de NextAuth. Maneja:
- `/api/auth/signin` — formulario de sign-in (no usado, usamos el nuestro).
- `/api/auth/callback/credentials` — POST con email/password.
- `/api/auth/signout` — cierre de sesión.
- `/api/auth/session` — GET sesión actual (JSON).
- `/api/auth/csrf` — CSRF token.
- `/api/auth/providers` — providers configurados.

No necesita mantenerse — NextAuth v5 lo gestiona automáticamente.

## Cambios planeados

- Consolidar endpoints que duplican Server Actions a una sola capa.
- Añadir OpenAPI spec generado con `@asteasolutions/zod-to-openapi`
  desde los schemas Zod que ya tenemos. Serviría como referencia
  automática en lugar de esta documentación manual.
- Considerar tRPC si el número de endpoints crece y queremos tipado
  end-to-end en una futura app móvil.
