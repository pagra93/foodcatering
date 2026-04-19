# Autenticación, sesiones, RBAC e impersonación

## Pila usada

- **NextAuth v5** (también conocido como Auth.js). Se instancia dos veces:
  - **Full config** (`lib/auth/config.ts` + `lib/auth/index.ts`) para
    todo el código que corre en Node (API routes, Server Components,
    Server Actions). Incluye Credentials provider con Prisma.
  - **Edge-safe config** (`lib/auth/edge-config.ts` + `lib/auth/edge.ts`)
    para `middleware.ts` que corre en Edge Runtime (sin Prisma ni
    bcrypt). Esta versión sólo lee JWT, no valida credenciales.

- **Credentials provider** con email + password (bcryptjs). No hay OAuth
  porque los usuarios son empleados de empresas clientes, no
  consumidores retail.

- **JWT strategy** (30 días de expiración). Session ID + role + tenantId
  + tenantType + impersonationToken viajan en el token firmado.

- **RBAC** custom en `lib/auth/permissions.ts` con wildcards.

## El flujo de login (paso a paso)

```
Usuario escribe en /login
  email: rrhh@acme.com
  password: xxx
  (no escribe subdominio: se infiere del host acme.sintupper.com)
    │
    ▼
POST /api/auth/callback/credentials
    │
    ▼ CredentialsProvider.authorize()
    │
    ├─ Zod valida formato email/password.
    ├─ prisma.user.findFirst({ email, status: 'ACTIVE' })
    ├─ bcrypt.compare(password, user.passwordHash)
    ├─ Si tenantSubdomain viene: user.tenant.subdomain === tenantSubdomain
    ├─ Normaliza role y tenantType (BD puede estar en minúscula).
    └─ Devuelve { id, email, name, role, tenantId, tenantType, mfaEnabled }
    │
    ▼ jwt callback
    │
    ├─ Copia los campos al token.
    └─ Retorna token firmado.
    │
    ▼ session callback
    │
    └─ Expone token.id, role, tenantId, tenantType en session.user
    │
    ▼ Cookie httpOnly 'next-auth.session-token' firmada con NEXTAUTH_SECRET
    │
    ▼ signIn callback decide redirect
    │
    └─ getDashboardPath(role, tenantType):
         SUPER_ADMIN → /admin
         ADMIN_EMPRESA/RRHH/FINANZAS/MANAGER_SEDE → /empresa/dashboard
         EMPLEADO → /empleado/menus
         ADMIN_CATERING/CHEF/… → /catering/dashboard
```

## El flujo de cada request autenticada

```
GET acme.sintupper.com/empresa/pedidos
    │
    ▼ Edge Runtime
    middleware.ts:
    ├─ auth() lee cookie, verifica firma JWT.
    ├─ Si no hay sesión y la ruta es protegida → redirect a /login.
    └─ Si hay sesión:
       ├─ Inyecta x-tenant-id: tenantId en request headers.
       └─ Inyecta x-tenant-type: EMPRESA.
    │
    ▼ Node Runtime
    app/(empresa)/empresa/layout.tsx (async Server Component):
    ├─ getRequiredSession() → sesión completa con role.
    ├─ requireRole(['ADMIN_EMPRESA','RRHH','FINANZAS','MANAGER_SEDE'])
    │  → si el rol no coincide, redirect /unauthorized.
    └─ Renderiza layout con sidebar + navbar.
    │
    ▼
    app/(empresa)/empresa/pedidos/page.tsx:
    ├─ const tenantId = await getScopedTenantId()
    ├─ const orders = await getOrders(tenantId, filters)
    └─ <OrdersTable orders={orders} />
```

## Archivos clave

### `lib/auth/config.ts`

Configuración principal. Define:

- Páginas custom (`signIn: '/login'`, etc.).
- `session.strategy = 'jwt'`.
- Credentials provider (explicado arriba).
- `jwt` callback: enriquecer token al sign-in, manejar impersonación en
  `trigger === 'update'`.
- `session` callback: exponer datos del token en session.user.
- `signIn` callback: bloquear si el user no está ACTIVE.
- `redirect` callback: validar URLs de redirect.
- `trustHost: true` (requerido por Next 15 en prod).

### `lib/auth/index.ts`

Instancia `NextAuth(authConfig)` y exporta `auth`, `signIn`, `signOut`,
`handlers.{GET, POST}`. El resto del código **solo** importa desde aquí.

### `lib/auth/edge-config.ts` + `lib/auth/edge.ts`

Pareja edge-safe. `edge-config.ts` tiene:

- `providers: []` (vacío — Credentials no corre en edge).
- Mismas `pages`, `session`, `trustHost`.
- Sin callbacks complejos.

`edge.ts` instancia `NextAuth(edgeAuthConfig)` y exporta `auth`. Lo usa
**solo** `middleware.ts`.

### `lib/auth/session.ts`

Helpers para Server Components / Actions / API routes:

| Helper | Qué hace |
|---|---|
| `getRequiredSession()` | Lanza si no hay sesión. Devuelve sesión tipada. |
| `requireRole(roles)` | Lanza si el rol no está en la lista. |
| `requirePermission(perm)` | Lanza si `hasPermission` falla. |
| `requireTenantAccess(tenantId)` | Lanza si el user no puede acceder al tenant. |
| `getScopedTenantId(req?)` | **El helper más importante.** Devuelve el tenant efectivo (real o impersonado) de forma segura. Para SUPER_ADMIN acepta header `x-tenant-id` pero lo verifica contra la BD. |
| `getTenantContext()` | Devuelve `{ tenantId, tenantType, role }` preempaquetado. |
| `isSuperAdmin()` | Atajo booleano. |
| `redirectToDashboard()` | Manda al dashboard adecuado según rol. |

`TenantMismatchError` se usa cuando alguien intenta cruzar tenants sin
permiso.

### `lib/auth/permissions.ts`

Matriz roles → permisos. Formato:

```ts
const PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*:*'],
  AUDITOR: ['*:read'],
  ADMIN_EMPRESA: [
    'company:*',
    'employees:*',
    'orders:read',
    'invoices:read',
    'incidents:*',
    'catering:read',
    // ...
  ],
  EMPLEADO: [
    'orders:own:*',    // propios
    'incidents:own:*', // propias
    'profile:own:*',
    'menus:read',
  ],
  // ...
}
```

`hasPermission(role, 'orders:create')` implementa wildcards:

- `*:*` > todo.
- `orders:*` > cualquier acción sobre orders.
- `*:read` > cualquier entidad, solo leer.
- `orders:read` > literal.

### `lib/auth/audit.ts`

Funciones `logLogin`, `logLogout`, `logImpersonation`, `logAudit`
genérico. Todas escriben en `audit_logs` con:

```ts
hash = sha256(actorId + action + entityId + timestamp)
```

Incluir timestamp en el hash es intencional: dos logs con los mismos
parámetros pero en momentos diferentes tienen hash distinto. Un test
unitario verifica esta propiedad (`tests/unit/auth/audit.test.ts`).

### `lib/auth/impersonation.ts`

Módulo de impersonación (SUPER_ADMIN actúa como otro usuario).

## Impersonación

Permite a un SUPER_ADMIN ver la plataforma como otro usuario sin conocer
su contraseña. Diseñada para soporte (reproducir un bug que el usuario
reporta, sin pedirle que ponga su password).

### Cómo se inicia

```
SUPER_ADMIN pulsa "Impersonar" en /admin/users/[id]
  │
  ▼ POST /api/admin/impersonate/start body: { targetUserId }
  │
  ▼ Valida:
  ├─ requireSuperAdmin()
  ├─ rate limit: 3 impersonaciones/hora/user
  ├─ target user existe y está ACTIVE
  └─ target role no es SUPER_ADMIN (no puedes impersonar a otro super)
  │
  ▼ Crea ImpersonationToken:
  {
    originalUserId: superAdmin.id,
    originalRole: 'SUPER_ADMIN',
    originalTenantId: rootTenantId,
    targetUserId,
    targetRole,
    targetTenantId,
    issuedAt: now(),
    expiresAt: now() + 15min,
    jti: uuid()   // para revocar
  }
  │
  ▼ Llama session.update({ impersonationToken })
  │  (actualiza el JWT con el token insertado)
  │
  ▼ logAudit({ action: 'IMPERSONATE', entity: 'User', entityId: targetUserId })
  │
  ▼ Redirect al dashboard del target (ej: /empresa/dashboard si target es ADMIN_EMPRESA)
```

### Durante la impersonación

- `getScopedTenantId()` devuelve `token.targetTenantId`, NO el del
  super admin.
- `session.user.role` = rol del target.
- Banner naranja (`<ImpersonationBanner>`) en todas las páginas: "Estás
  actuando como Laura García (ADMIN_EMPRESA en ACME) — [Salir]".
- Cualquier mutación se audita con `actorId = originalUserId` (super
  admin) pero con flag `impersonatedBy` — queda claro quién hizo qué.

### Cómo se termina

- Botón "Salir" en el banner → `POST /api/admin/impersonate/stop`.
- Restaura sesión original (el JWT callback recarga los datos del
  super admin).
- Audit log con acción `IMPERSONATE_END`.
- Expira automáticamente a los 15 minutos — nueva request tras expiración
  fuerza redirect al dashboard del super admin.

### Riesgos mitigados

| Riesgo | Mitigación |
|---|---|
| Super admin queda impersonando indefinidamente | Expiración 15 min |
| Otro super admin "ayuda" sin que quede constancia | Todo impersonation log queda con `actorId` del super |
| Revocación urgente (super admin comprometido) | `jti` en el token permite blacklist (pendiente de implementar) |
| Impersonar a otro super admin | Bloqueado en start: `targetRole !== 'SUPER_ADMIN'` |
| Rate limiting ausente | `impersonationRateLimiter` (3/hora/user) |

## Cookies y secrets

- Cookie `next-auth.session-token` (HttpOnly, Secure en prod, SameSite).
- Firma con `NEXTAUTH_SECRET` (mínimo 32 chars; en `.env`). Rotarla
  invalida todas las sesiones.
- `NEXTAUTH_URL` debe coincidir con el dominio — en dev
  `http://localhost:3000`, en prod `https://sintupper.com`.

## Recuperación de contraseña

- `/forgot-password` → usuario mete email → se genera token aleatorio
  con TTL 1 h, se envía email con link a `/reset-password?token=…`.
- Al llegar, token se valida, se pide nueva password, se hashea con
  bcrypt, se actualiza `User.passwordHash`.
- Invalidamos todas las sesiones activas del user (rotando su
  `User.sessionNonce`, pendiente de implementar — hoy solo se invalida
  implícitamente cuando expire).

## MFA

Campo `User.mfaEnabled` presente en el schema pero **no implementado**
end-to-end. Planeado: TOTP (Google Authenticator) para SUPER_ADMIN y
ADMIN_EMPRESA opcional. Siguiente sprint tras la Fase B de despliegue.

## Relación con los guards

Ver [../../architecture/security.md](./security.md) para detalles de los
guards (`lib/guards/api.ts`, `lib/guards/PermissionGuard.tsx`). Resumen:

- Server Components importan `getRequiredSession` / `requireRole` / etc.
- API routes envuelven el handler con `withAuth(handler)` o
  `withRoles(['ADMIN_EMPRESA'], handler)`.
- Lanzan excepciones que el framework traduce a 401/403.
