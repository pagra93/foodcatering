# Arquitectura general

## Diagrama de 10 000 metros

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NAVEGADOR                                 │
│  acme.sintupper.com · deliciasexpress.sintupper.com · ...           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router (Node)                     │
│                                                                     │
│  middleware.ts (Edge Runtime)                                       │
│  └─ NextAuth edge-safe → valida JWT → inyecta x-tenant-id header    │
│  └─ Redirige subdominio/ → /login                                   │
│                                                                     │
│  Route groups:                                                      │
│  (admin)   /admin/*        → Portal Súper Admin                     │
│  (empresa) /empresa/*      → Portal Empresa                         │
│  (catering)/catering/*     → Portal Catering                        │
│  (empleado)/empleado/*     → Portal Empleado                        │
│  (auth)   /login,/register → Auth pages                             │
│  (landing) /               → Landing pública                        │
│  api      /api/*           → REST endpoints (para externos/móvil)   │
│                                                                     │
│  Páginas: 95% Server Components (async). Interactividad en          │
│  sub-componentes 'use client'. Mutaciones → Server Actions.         │
│                                                                     │
│  Capa lib/:                                                         │
│  - lib/auth        → NextAuth v5, RBAC, impersonación, audit        │
│  - lib/db/queries  → Una función por operación, filtro tenant       │
│  - lib/db/prisma   → Prisma singleton + middleware dev              │
│  - lib/crypto      → AES-256-GCM para PII                           │
│  - lib/guards      → Protección Server Components + API routes      │
│  - lib/ratelimit   → Rate limiting in-memory                        │
│  - lib/validations → Zod schemas por dominio                        │
│  - lib/tenant      → Resolución tenant desde subdominio             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Prisma Client
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Hetzner)                            │
│                                                                     │
│  BD: comidas_dev  ← dev local (laptop)                              │
│  BD: comidas_prod ← prod (Coolify)                                  │
│                                                                     │
│  Usuarios separados con GRANT estricto:                             │
│  - comidas_dev_user  → ALL en comidas_dev, 0 en comidas_prod        │
│  - comidas_prod_user → ALL en comidas_prod, 0 en comidas_dev        │
│                                                                     │
│  35 modelos · 28 enums · 3 migraciones activas                      │
│  RLS preparado (policies escritas) pero no activado aún.            │
└─────────────────────────────────────────────────────────────────────┘
```

## Capas, de arriba abajo

### 1. Middleware (Edge Runtime)

**Archivo**: `middleware.ts` (raíz).

Corre en Edge Runtime de Next.js para todas las requests. Responsabilidades:

- Extraer subdominio del `Host` header (`acme` de `acme.sintupper.com`).
- Validar sesión JWT con NextAuth edge-safe (`lib/auth/edge.ts`).
- Si no hay sesión y la ruta está protegida → redirect a `/login`.
- Si hay sesión → inyectar headers `x-tenant-id` y `x-tenant-type` en la
  request para que las pages y API routes los lean sin volver a
  consultar la BD.
- Bypass para `/api/*`, `/_next/*`, assets estáticos.

**Por qué Edge**: rápido y no bloquea el cold-start. Por qué edge-safe:
Prisma y bcrypt no corren en Edge; NextAuth v5 tiene un patrón oficial
(split edge/node) para esto — ver [auth.md](./auth.md).

### 2. Páginas (Server Components) y Layouts

**Ubicación**: `app/(portal)/.../page.tsx`.

- 95% de las páginas son **Server Components async**. Hacen sus queries
  al servidor, devuelven HTML ya renderizado.
- Sub-componentes interactivos (formularios, tabs con estado,
  selectores) son `'use client'`. Viven en `components/<portal>/...`.
- Cada portal tiene su layout en `app/(portal)/layout.tsx` que:
  - Valida rol mínimo (si un empleado intenta entrar a `/catering/*` →
    redirect a `/unauthorized`).
  - Carga datos del tenant actual (logo, nombre, colores) una sola vez.
  - Pinta sidebar, navbar y `ImpersonationBanner` si está activo.

### 3. Server Actions (mutaciones)

**Ubicación**: `components/<portal>/<feature>/actions.ts`.

Mutaciones desde la UI (crear plato, actualizar empleado, enviar
factura) pasan por Server Actions, no `fetch('/api/...')`. Ventajas:

- Sin endpoint intermedio — Next.js compila la función y la expone como
  endpoint RPC interno.
- Tipado end-to-end: el client-component tipa el import de la action.
- `revalidatePath()` automático para invalidar cachés de páginas.
- Auditoría centralizada: cada action llama a `logAudit()` con el
  contexto del usuario y el diff.

### 4. API Routes (para callers externos)

**Ubicación**: `app/api/.../route.ts`. 67 endpoints.

Reservadas para:

- Webhooks (`/api/webhooks/coolify`).
- Aplicaciones móviles nativas (hoy no hay, pero se reserva).
- Integraciones B2B (SII, SAP, A3).
- NextAuth callbacks (`/api/auth/[...nextauth]`).
- Exports (`/api/empresa/pedidos/export` descarga un CSV grande).

No se usan desde páginas del mismo portal — eso son Server Actions.

### 5. Capa de acceso a datos (queries)

**Ubicación**: `lib/db/queries/<dominio>.ts`. 25 archivos.

Patrón: **una función por operación**. No queries inline en las páginas.

Ventajas:

1. Reutilizable (la misma query la usa la page y una API route).
2. Testeable (tests unitarios contra mocks).
3. Filtrado por tenant obligatorio y centralizado.

Ejemplo:

```ts
// lib/db/queries/empresa-pedidos.ts
export async function getOrders(tenantId: string, filters: OrderFilters) {
  return prisma.order.findMany({
    where: {
      tenantEmpresa: tenantId,   // ← filtro tenant SIEMPRE
      status: filters.status,
      serviceDate: { gte: filters.from, lte: filters.to },
    },
    include: { employee: true, incidents: true },
    orderBy: { serviceDate: 'desc' },
    skip: (filters.page - 1) * filters.limit,
    take: filters.limit,
  })
}
```

### 6. Prisma Client

**Archivo**: `lib/db/prisma.ts`. 

Singleton pattern para no crear conexiones múltiples en dev (HMR
reinstancia módulos). Dos funcionalidades añadidas:

1. **Middleware dev de tenant-check**: si detecta una query sobre un
   modelo multi-tenant sin `tenantId`/`tenantEmpresa`/`tenantCatering` en
   el `where`, **avisa por consola** (no bloquea). Sirve para pillar
   olvidos durante desarrollo.

2. **`withTenantContext(tenantId, role, fn)`**: wrapper para activar
   Row-Level Security. Dentro de la transacción setea
   `app.tenant_id` y `app.role` como variables de sesión Postgres, que
   las policies RLS consumen. Hoy no está activo (policies escritas pero
   no aplicadas); se activará progresivamente.

### 7. PostgreSQL

- Una instancia en Hetzner (container Docker gestionado por Coolify).
- Dos BDs: `comidas_dev` + `comidas_prod` en la misma instancia.
- Usuarios separados con GRANT estricto como defensa.
- 35 modelos, 28 enums. Algunos campos JSON donde la forma varía
  (ej: `CompanyPolicy.daysActive`, `Dish.labels`, `Order.selection`).
- Backups diarios de prod (cron en el servidor → `/var/backups/comidas/`
  con retención 30 días).

## Patrones transversales

### Multi-tenancy

Detallado en [multi-tenant.md](./multi-tenant.md). Resumen:

- Cada operación empieza con `getScopedTenantId()` (en `lib/auth/session.ts`)
  que devuelve el tenant efectivo (real o impersonado, nunca el del
  header confiando en el cliente).
- Queries filtran por ese tenant.
- Roles `SUPER_ADMIN` saltan el filtro (acceso cross-tenant).

### Auditoría

Toda acción relevante escribe en `audit_logs`:

```
{
  tenantId, actorId, action: 'UPDATE',
  entity: 'Order', entityId,
  diff: { before: {...}, after: {...} },
  ip, userAgent, timestamp,
  hash: sha256(actorId + action + entityId + timestamp)
}
```

El hash hace el log **tamper-evident**: si alguien modifica un registro,
el hash ya no cuadra y el auditor lo detecta.

### Validaciones

Todo input cliente pasa por un schema Zod (`lib/validations/<dominio>.ts`)
antes de tocar la BD. No se confía nunca en los datos del cliente.

### Caching

- Next.js Static/ISR: `getStaticProps` no se usa; toda página es
  dinámica por naturaleza multi-tenant.
- React Cache (`cache()`): `getCurrentTenant()` está cacheado dentro del
  request para no consultar 20 veces por página.
- `revalidatePath()`/`revalidateTag()`: tras una mutación, se invalidan
  las páginas afectadas.
- Cache de resolución de subdominio: 5 min TTL en memoria
  (`lib/middleware/tenant.ts`).

### Rate limiting

In-memory (single-instance) con interfaz preparada para swap Upstash
Redis cuando escalemos:

- `authRateLimiter`: 5 intentos de login / min / IP.
- `impersonationRateLimiter`: 3 impersonaciones / hora / user.
- `exportRateLimiter`: 10 exports / hora / tenant.

## Deploy

```
Laptop                                 Servidor Hetzner
  │                                          │
  │  git push origin main                    │
  ▼                                          │
GitHub                                       │
  │                                          │
  │  webhook                                 ▼
  │──────────────────────────────────►  Coolify detecta
  │                                     Build Docker multi-stage
  │                                     Cambia contenedor
  │                                     Ejecuta docker-entrypoint.sh:
  │                                        ├─ prisma migrate deploy
  │                                        └─ next start
  │                                     sintupper.com sirve versión nueva
  │                                          ▲
  │                                          │
  │  GitHub Actions CI:                     │
  │   - pnpm type-check                     │
  │   - pnpm lint                           │
  │   - pnpm exec vitest run                │
  │   - pnpm build                          │
  │                                          │
```

Detalles en [../guides/deployment.md](../guides/deployment.md) y el
[`RUNBOOK`](../../despliegue/RUNBOOK.md).
