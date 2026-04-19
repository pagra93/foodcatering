# Diagnóstico Exhaustivo — Plataforma "comidas"

**Fecha**: 2026-04-18
**Autor**: Claude Opus 4.7 (1M context)
**Ámbito**: backend, frontend, base de datos, infraestructura, seguridad, dependencias, testing, documentación
**Estado global**: 🟡 **Base sólida de arquitectura, con vulnerabilidades críticas, deuda técnica acumulada y producción no operativa**

---

## 0. Resumen ejecutivo (para leer en 2 minutos)

Tu proyecto es ambicioso y, en el papel, está bien pensado: multi-tenant con 31 tablas, RBAC con 14 roles, workflow fiscal IRPF, auditoría con hash SHA-256, snapshots diarios, impersonación con expiración. La arquitectura de alto nivel (Next.js 15 App Router, Prisma, NextAuth v5, Zod, shadcn/ui) es moderna y correcta.

Pero al abrir el capó aparecen **3 bloqueantes críticos, 5 altos y ~15 medios** que explican por qué el proyecto se te aparcó y por qué producción (sintupper.com) no va:

| # | Hallazgo | Severidad | Dónde |
|---|---|---|---|
| 1 | **Cross-tenant bypass** en 5 rutas API (usuario A puede editar datos de tenant B manipulando header) | 🔴 Crítico | `app/api/empresa/configuracion/**`, `empleados`, `pedidos/export` |
| 2 | `logAudit()` roto en impersonación (parámetros incorrectos, enum inválido) | 🔴 Crítico | `lib/auth/impersonation.ts:129-142, 169-179` |
| 3 | **Next.js 15.5.6 con RCE crítico** + 15 CVEs más | 🔴 Crítico | `package.json` → subir a ≥15.5.14 |
| 4 | `next.config.js` **ignora errores de TS y ESLint en build** | 🟠 Alto | `next.config.js:70-76` |
| 5 | Migraciones Prisma **no están en formato estándar** (SQL suelto) | 🟠 Alto | `prisma/migrations/` |
| 6 | Seeds no idempotentes | 🟠 Alto | `prisma/seed.ts:~207,228` |
| 7 | **0 tests reales** pese a tener la infra montada | 🟠 Alto | `tests/`, `e2e/` |
| 8 | Sin CI/CD | 🟠 Alto | `.github/workflows/` no existe |
| 9 | React Query y Zustand instalados pero **sin usar** | 🟡 Medio | Todo el frontend |
| 10 | 94 documentos en `docs/` sin estructura | 🟡 Medio | `docs/` |

**Recomendación**: **no añadas features nuevas hasta cerrar los 3 críticos**. Dedica un sprint corto (3–5 días) a estabilizar: resolver bypass cross-tenant, corregir auditoría de impersonación, actualizar Next.js y reactivar `strict` en build. Después ataca deuda media (tests, CI/CD, limpieza de docs) y recién entonces retoma el roadmap de features.

---

## 1. Stack y configuración

### 1.1 Stack confirmado

**Producción**
- Next.js **15.0.3** declarado en `package.json` pero instalado **15.5.6** vía lockfile
- React **19.0.0** (19.2 instalado)
- Prisma **5.22** — cliente y CLI
- NextAuth **5.0.0-beta.25**
- PostgreSQL (extensión `pgcrypto`)
- bcryptjs 2.4.3 (hay 3.x disponible)
- Tailwind 3.4 + shadcn/ui (27 componentes UI) + Radix + Lucide + Framer Motion
- TanStack React Query 5.59 (instalada, no usada)
- Zustand 4.5 (instalada, no usada)
- Zod 3.23 + React Hook Form 7.53 + `@hookform/resolvers` 3.x (disponible 5.x)
- date-fns 4.1

**Build & deploy**
- pnpm 9.12.3 (packageManager fijado, bien)
- Node ≥20 (`.nvmrc`)
- Docker multi-stage → Coolify

**DX**
- TypeScript 5.6 en modo **estrictísimo** (ver 1.3)
- ESLint 8 + Prettier 3 + plugin tailwindcss
- Husky + lint-staged
- Vitest 2.1 + Playwright 1.48

### 1.2 Configs que están bien

- `tsconfig.json` **modélico**: `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, paths bien mapeados.
- `.eslintrc.json` con restricciones buenas (prohíbe lodash, moment, axios, redux — obliga a fetch/date-fns).
- `.prettierrc` incluye el plugin de tailwind.
- `.gitignore` estándar.
- `next.config.js` tiene cabeceras de seguridad correctas (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`).

### 1.3 Configs con problemas

#### 🟠 `next.config.js:70-76` — **build ciego**

```js
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```

Puesto como TODO "temporal". El resultado: el build pasa aunque haya errores reales de TS (por ejemplo el de `logAudit` del crítico #2). **Revertir esto destapará bugs**. Hacerlo de manera controlada: activar primero solo `eslint`, luego `typescript`, arreglando lo que salga.

#### 🟡 Tres middleware en el repo

- `middleware.ts` (activo)
- `middleware-simple.ts` (incompleto — no inyecta headers de tenant)
- `middleware-complex-backup.ts` (backup descartado)

Los dos backups son **código muerto versionado**. Bórralos — el historial git ya los conserva.

#### 🟡 `.env` local con claves placeholder

Visto: `NEXTAUTH_SECRET="cambiar-en-produccion..."`. En local es aceptable, pero confirma que producción usa un secret real generado con `openssl rand -base64 32`.

---

## 2. Base de datos (Prisma)

### 2.1 Lo bueno

- **31 modelos** bien diseñados cubriendo todo el dominio: tenants, users, empresas, sedes, políticas con historial versionado, restaurantes, platos, menús, pedidos con historial versionado (FSM completa), delivery events, delivery proofs, facturas + líneas, incidencias, audits, daily snapshots, informes fiscales, integraciones, webhooks, notificaciones, ratings, invitaciones de empleados, company catering assignments.
- Enums estrictos para estado y tipos (21 enums).
- **Índices** compuestos donde tocan: `@@index([tenantId, status])`, `@@index([tenantEmpresa, serviceDate])`, `@@index([employeeId, serviceDate])`, etc.
- **Uniques** correctos: `[tenantId, email]` en User, `[tenantEmpresa, employeeId, serviceDate]` en Order, `[tenantCatering, tenantEmpresa, period]` en Invoice.
- **Soft delete** con `deletedAt` en entidades sensibles.
- **Auditoría**: `audit_logs` con hash SHA-256, `order_history`, `company_policy_history`.
- Extensión `pgcrypto` habilitada.
- Campos PII marcados como "Enc" (`nameEnc`, `phoneEnc`) — buena intención.

### 2.2 Lo malo

#### 🟠 Migraciones **no** en formato Prisma estándar

`prisma/migrations/` contiene:
```
add_company_enhancements.sql
add_company_portal_tables.sql
```

Prisma espera directorios `YYYYMMDDHHMMSS_nombre/migration.sql`. Tu `docker-entrypoint.sh:30` hace `find ... -mindepth 1 -maxdepth 1 -type d` y al no encontrarlos cae en `prisma db push --accept-data-loss`. **Eso es exactamente lo que no quieres en producción** — puede borrar columnas/tablas.

**Fix**:
1. Reestructurar a `prisma/migrations/20250117000001_company_portal_tables/migration.sql` y `20251117000001_company_enhancements/migration.sql`.
2. Crear `migration_lock.toml` con `provider = "postgresql"`.
3. Marcar como aplicadas (`prisma migrate resolve --applied <name>`) en cada entorno.
4. En producción usar **solo** `prisma migrate deploy`, nunca `db push`.

#### 🟡 Cifrado PII declarado pero no implementado

Los campos `nameEnc`/`phoneEnc` son `String` plano en Postgres. No vi ningún helper de cifrado/descifrado en `lib/`. O es trabajo pendiente o la "Enc" es solo intención. Si es pendiente: `pgcrypto` ya está cargada → usar `pgp_sym_encrypt/decrypt` con clave en KMS/Vault.

#### 🟡 `password_hash` opcional en `User`

```prisma
passwordHash String? @map("password_hash")
```

¿Por qué nullable? Probablemente pensando en SSO/invitaciones, pero permite usuarios sin password. El login en `lib/auth/config.ts` ya valida que exista. Dejar documentado *por qué* es nullable o forzar NOT NULL y manejar los casos SSO con una columna separada.

#### 🟡 Sin enforcement automático de `tenant_id` en queries

No hay middleware de Prisma ni RLS (Row-Level Security) de Postgres. **Todo el aislamiento depende de que el desarrollador recuerde poner `where: { tenantId }` en cada query**. Ya se ha olvidado al menos una vez (ver `lib/db/queries/empresa-empleados.ts:468` donde un `findUnique` no filtra por tenant).

**Opciones**:
1. Middleware de Prisma + contexto `AsyncLocalStorage`.
2. Postgres RLS (más complejo pero blindado: Postgres se niega a devolver filas de otros tenants aunque el código haga tonterías).
3. Helper obligatorio `tenantPrisma(tenantId)` que devuelva un proxy con todas las queries pre-filtradas.

Dado lo crítico del compliance fiscal, **recomiendo opción 2 (RLS)** a medio plazo.

### 2.3 Seeds

- **`seed.ts`** (711 líneas): usa `upsert` para tenants/users principales → correcto. Pero crea empleados y algunos registros secundarios con `create()` directo sin comprobar existencia → **no idempotente**. Segunda ejecución casca por unique constraint.
- **`seed-caterings.ts`** y **`seed-companies.ts`** están mejor (helpers tipo `createUserIfNotExists`).

**Fix**: convertir todos los `prisma.X.create()` en `prisma.X.upsert()` con clave única apropiada.

### 2.4 Scripts peligrosos

- `scripts/reset-db.sh` (17 líneas): `prisma migrate reset --force --skip-seed` + `db:seed`. **Sin guardia `NODE_ENV`**. Si alguien lo ejecuta en prod por error → pérdida total de datos.
- `scripts/seed-production.sh` (41 líneas): pese al nombre hace `migrate reset --force` + `db push --accept-data-loss`. **Esto NO es seguro para producción** pese al nombre. Renómbralo a `seed-staging.sh` y añade guardia.

**Fix mínimo** para los dos:
```bash
if [ "$NODE_ENV" = "production" ]; then
  echo "❌ No ejecutar en producción"
  exit 1
fi
```

---

## 3. Backend — autenticación, autorización, API

### 3.1 `lib/auth/` — arquitectura bien pensada

| Archivo | Estado |
|---|---|
| `config.ts` | JWT y Session callbacks correctos. Normaliza rol a mayúscula. Importa `bcryptjs` dinámicamente (bien para Edge). |
| `index.ts` | Exports de handlers. |
| `session.ts` | `getRequiredSession()` helper. |
| `permissions.ts` | RBAC con 14 roles, ~50 permisos, soporta wildcards (`tenants:*`). Muy limpio. |
| `audit.ts` | Hash SHA-256 de integridad. Helpers `logLogin`, `logLogout`, `logImpersonation`. |
| `impersonation.ts` | Restricciones correctas (solo SUPER_ADMIN, expiración 15 min, no impersonar a otro SUPER_ADMIN, no doble impersonación). **Pero la auditoría está rota — ver 3.2.** |
| `get-tenant.ts` | Lee del header `x-tenant-id` con cache `React.cache()`. |

### 3.2 🔴 Crítico #2 — `logAudit()` roto en impersonación

`lib/auth/audit.ts:10-19` define el contrato:

```ts
type AuditLogInput = {
  tenantId?: string | null
  actorId: string
  action: AuditAction   // enum Prisma: CREATE|UPDATE|DELETE|IMPERSONATE|POLICY_CHANGE|BILLING_RUN
  entity: string
  entityId: string
  diff?: Record<string, unknown>
  ip?: string
  userAgent?: string
}
```

`lib/auth/impersonation.ts:129-142` y `:169-179` llaman con **otro shape**:

```ts
await logAudit({
  userId: session.user.id,             // ❌ debería ser actorId
  tenantId: session.user.tenantId,
  action: 'impersonation_started',     // ❌ no es AuditAction válido
  resource: 'user',                    // ❌ debería ser entity
  resourceId: targetUser.id,           // ❌ debería ser entityId
  details: {...}                       // ❌ debería ser diff
})
```

El bug pasa el linter porque `next.config.js` ignora errores de TS en build. En tiempo de ejecución, Prisma lanza error al crear el `AuditLog` con un enum inválido → la impersonación se inicia pero **la auditoría silenciosamente falla** (el catch en `audit.ts:57` la traga con `console.error`).

**Agravante**: existe ya un helper correcto en `audit.ts:116`:

```ts
export async function logImpersonation(adminUserId, targetUserId, targetTenantId, req?)
```

→ no se usa. **Fix**:

```ts
// impersonation.ts:129
await logImpersonation(session.user.id, targetUser.id, targetUser.tenantId)

// impersonation.ts:169
await logImpersonation(token.originalUserId, token.targetUserId, token.targetTenantId)
```

(o si necesitas incluir más contexto, llamar a `logAudit` con los nombres de campo correctos y `action: 'IMPERSONATE'`).

### 3.3 🔴 Crítico #1 — Cross-tenant bypass en API

#### El flujo roto

El `middleware.ts:15-21` excluye explícitamente `/api/*`:

```ts
if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon')) {
  return NextResponse.next()
}
```

→ las rutas `/api/*` **no pasan por la inyección de `x-tenant-id` desde la sesión**. El cliente envía el header que quiera.

5 rutas leen ese header y lo usan directamente como filtro en la query, **sin comparar contra `session.user.tenantId`**:

| Ruta | Método | Línea del fallo |
|---|---|---|
| `app/api/empresa/configuracion/general/route.ts` | PATCH | `:42` lee, `:57` usa |
| `app/api/empresa/configuracion/plan/route.ts` | PATCH | `:25` lee |
| `app/api/empresa/configuracion/preferencias/route.ts` | PATCH | `:28` lee |
| `app/api/empresa/empleados/route.ts` | POST | `:34` lee, `:49` usa |
| `app/api/empresa/pedidos/export/route.ts` | GET | `:12` lee |

**PoC del ataque**: un usuario autenticado con rol `ADMIN_EMPRESA` en tenant A hace:

```bash
curl -X PATCH https://<host>/api/empresa/configuracion/general \
  -H "Cookie: next-auth.session-token=<su cookie>" \
  -H "x-tenant-id: <id tenant B>" \
  -H "Content-Type: application/json" \
  -d '{"legalName":"Hackeado"}'
```

→ actualiza la razón social de tenant B. Aplica lo mismo a plan, preferencias, creación de empleados y export de pedidos.

#### El fix canónico

```ts
const session = await getRequiredSession()
const headerTenantId = request.headers.get('x-tenant-id')
const tenantId = session.user.tenantId

// Si además se envía el header, debe coincidir (salvo SUPER_ADMIN)
if (headerTenantId && headerTenantId !== tenantId && session.user.role !== 'SUPER_ADMIN') {
  return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 })
}
```

**Mejor todavía**: dejar de leer del header para rutas de tenant normal y **usar siempre `session.user.tenantId`**. El header solo tiene sentido cuando un SUPER_ADMIN impersona.

Las guardas `lib/guards/api.ts` ya ofrecen `requireTenantAccess()` y `withAuth()` HOCs; migrar estas rutas a ese patrón cierra el agujero de un plumazo.

### 3.4 Otras rutas — mapa rápido

Total: ~45 rutas. Estado por bloque:

| Bloque | Auth | Rol | Tenant | Nota |
|---|---|---|---|---|
| `/api/admin/tenants/**` | ✅ | ✅ SUPER_ADMIN | ✅ | OK |
| `/api/admin/impersonate/**` | ✅ | ✅ SUPER_ADMIN | ✅ | OK (salvo audit roto) |
| `/api/empresa/empleados/[id]/**` | ✅ | ✅ | ✅ session | OK |
| `/api/empresa/configuracion/sedes/**` | ✅ | ✅ | ✅ session | OK |
| `/api/empresa/configuracion/documentos` | ✅ | ✅ | ✅ session | OK |
| `/api/empresa/facturacion/export` | ✅ | ✅ | ✅ | OK |
| `/api/empresa/catering/ratings`, `/sla` | ✅ | ✅ | ✅ valida contra session | OK |
| `/api/catering/**` (9 bloques) | ✅ | ✅ | ✅ session | OK |
| `/api/empleado/**` | ✅ | ✅ | ✅ | OK |
| **`/api/empresa/configuracion/general`, `plan`, `preferencias`** | ✅ | ✅ | ❌ **header** | 🔴 |
| **`/api/empresa/empleados` (POST)** | ✅ | ✅ | ❌ **header** | 🔴 |
| **`/api/empresa/pedidos/export`** | ✅ | ✅ | ❌ **header** | 🔴 |

### 3.5 `lib/db/queries/` — 25 archivos especializados

Patrón general correcto: filtro por `tenantId` + `deletedAt: null`. Un par de olvidos:

- `lib/db/queries/empresa-empleados.ts:468` — `findUnique({ where: { id } })` sin tenant. Debería ser `findFirst({ where: { id, tenantId } })`.
- `lib/db/queries/catering-invoices.ts:121` — `dish.findMany` sin tenant, pero confía en que los IDs vienen filtrados aguas arriba. Frágil.
- `lib/db/queries/admin-dashboard.ts` — varios queries sin filtro, pero **aquí es correcto** porque solo lo consume el SUPER_ADMIN.

### 3.6 Validaciones Zod

6 archivos en `lib/validations/`. Calidad alta: `.refine()` para reglas complejas (alérgenos sin duplicados, decimales con `multipleOf(0.01)`). Solo vi un `any` en `delivery.ts:267` (`orders: any[]`) y unos pocos `as any` en route handlers.

### 3.7 Code smells backend

- **51 usos de `any`** en `lib/` + `app/api/`. La mayoría en catch blocks (`error: any`), filtros de listado (`const filters: any = {}`) y casts JSON. Cada uno es pequeño pero en conjunto erosionan la seguridad de tipos.
- **0 `@ts-ignore`**: bien.
- `console.log`/`console.error` en producción paths: `lib/auth/config.ts:247,251` loguea login y logout con email a stdout. Quitar o mover a `logLogin/logLogout`.
- **Cache de tenant en memoria** (`lib/middleware/tenant.ts:13-21`): Map en memoria con TTL 5 min. No escala a múltiples instancias/pods.

---

## 4. Frontend — App Router, componentes, UX

### 4.1 Estructura de rutas (50 pages totales)

| Portal | Pages | Completitud | Observaciones |
|---|---|---|---|
| `(admin)` | 16 | ~90% | Dashboard con KPIs reales, CRUDs tenants/empresas/caterings/usuarios. Wizard de catering parcial. |
| `(empresa)` | 15 | ~85% | Dashboard OK, empleados con CRUD, pedidos/incidencias/facturación. Auditoría y actividad son stubs. |
| `(catering)` | 14 | ~80% | Menús y platos funcionales; producción (KDS) más esqueleto. |
| `(empleado)` | 5 | ~75% | Menús semanales OK, historial, perfil, incidencias. |
| `(auth)` | 6 | 100% | login, register, forgot, reset, verify, error. |
| `(landing)` | 1 | estática | |

### 4.2 Antipatrones en App Router

#### 🟠 Varias pages del portal catering son client components con fetch manual

- `app/(catering)/catering/platos/page.tsx:1-240`: `'use client'` + `useEffect(() => fetch('/api/catering/platos'))` + `useState<any[]>` para listado. Pierde SSR, streaming, cache.
- `app/(catering)/catering/menus/page.tsx` — idem.
- `app/(catering)/catering/platos/[id]/page.tsx`, `platos/nuevo/page.tsx`, `ruta/[id]/page.tsx` — idem.

**Patrón correcto** para listados:
```tsx
// Server Component
export default async function Page() {
  const dishes = await getDishes(tenantId)
  return <DishesTable dishes={dishes} />
}
// Client Component solo para interactividad (filtros, selección)
```

#### 🟡 `any` en state de páginas

~20 archivos de `app/` + `components/` usan `any` en `useState`, props, o catch. Se acumulan con los del backend.

### 4.3 Componentes (129 en total)

| Carpeta | Cantidad |
|---|---|
| `components/ui` (shadcn) | 27 |
| `components/admin` | 30 |
| `components/empresa` | 34 |
| `components/catering` | 23 |
| `components/empleado` | 14 |
| `components/shared` | 1 |

**Duplicación detectada** en dashboard primitives:

- `KPICard` implementado 4 veces (`admin/dashboard/KPICard.tsx`, `empresa/dashboard/DashboardKPIs.tsx`, `catering/dashboard/DashboardKPIs.tsx`, `empleado/historial/HistorialKPIs.tsx`).
- `RecentActivityTable` repetido en admin, catering, empresa.
- `AlertsPanel` repetido en los tres.

**Acción**: consolidar en `components/shared/` con props polimórficas. Ahorra ~2000 líneas en total.

### 4.4 Providers y hooks

- `components/providers.tsx` envuelve QueryClient + SessionProvider + ThemeProvider con defaults razonables (`staleTime: 60s`, `refetchOnWindowFocus: false`, `retry: 1`). Sensato.
- Solo **2 custom hooks**: `use-debounce.ts` y `use-toast.ts`. Faltan: `useAuth()`, `useTenant()`, `usePagination()`, `useImpersonation()` (hay una exportada desde `ImpersonationBanner.tsx` que debería estar en `hooks/`).

### 4.5 React Query y Zustand: instalados pero nunca importados

Grep confirma 0 usos de `useQuery`, `useMutation` o `create()` de Zustand en `app/` y `components/` (salvo el provider). Dos bibliotecas pesadas en el bundle para nada.

Decisión a tomar:
- **Usarlas de verdad** en los portales con listados largos y mutaciones (catering/platos, empresa/empleados, admin/caterings).
- O **desinstalarlas** si el plan es 100% Server Components + Server Actions. A día de hoy son overhead.

### 4.6 Tipos globales

`types/index.ts` (195 líneas) está bien organizado: `UserSession`, `OrderStatus`, `ApiResponse<T>`, `PaginatedResponse<T>`, `FormState<T>`. `types/next-auth.d.ts` extiende correctamente `Session.user` e incluye `impersonationToken`.

Hay un cast sucio en `lib/auth/config.ts:205`:
```ts
;(session.user as any).impersonationToken = token.impersonationToken
```

El tipo ya existe en `next-auth.d.ts:24`. Eliminar el `as any`.

---

## 5. Infraestructura — Docker, Coolify, CI/CD

### 5.1 Dockerfile — **bueno**, con dos detalles

✅ Multi-stage, `node:20-slim` (Debian > Alpine para compat nativa), usuario no-root `nextjs:1001`, `output: 'standalone'`, `prisma generate` antes de `build`, entrypoint con manejo de migraciones y fallback.

Mejoras:
- Línea 22: `pnpm install --no-frozen-lockfile` → cambiar a `--frozen-lockfile` en el stage `deps` para garantizar reproducibilidad (ya existe `pnpm-lock.yaml` de 274 KB).
- `pnpm` se prepara dos veces (base y deps). Unificar.

### 5.2 `docker-entrypoint.sh` — inteligente pero asume formato Prisma estándar

117 líneas. Bien estructurado: normaliza `postgres://` → `postgresql://`, reintentos, fallback a `db push`. El problema es que detecta migraciones con `find -type d` (línea 30) y tus migraciones son archivos SQL sueltos → cuenta 0 → cae a `db push --accept-data-loss`, que es el modo inseguro.

**Cerrado con el fix del punto 2.2** (restructurar migraciones).

### 5.3 Coolify y producción

Según `docs/INFORME-PROBLEMAS-PRODUCCION-SINTUPPER.md` (805 líneas, 2025-11-20):

- Landing carga, login devuelve 500, subdominios inaccesibles.
- Causa raíz: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `WILDCARD_DOMAIN` no configuradas en Coolify.
- DNS wildcard (`*.sintupper.com`) no configurado.

Eso + el hecho de que Coolify probablemente ejecute `db push --accept-data-loss` sobre tu BD real explica los problemas.

### 5.4 CI/CD — inexistente

No hay `.github/workflows/`. Todo el deploy es manual. Mínimo deseable:

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm type-check
      - run: pnpm lint
      - run: pnpm test
```

Y **luego** añadir `build` + job E2E con Postgres service container.

---

## 6. Testing — configurado, no usado

### 6.1 Infraestructura

- `vitest.config.ts`: jsdom, globals, setup file, cobertura objetivo 70% todas las métricas, aliases.
- `playwright.config.ts`: chromium-only, trace on-first-retry, screenshot on-failure, video retain-on-failure, reporter JUnit + HTML. Buen setup.
- `tests/setup.ts`: mocks de `next/navigation` y `next-auth` listos.

### 6.2 Tests reales

- `e2e/example.spec.ts`: 1 test trivial (carga la home). Comentarios que enumeran 5 tests críticos que faltan.
- `tests/e2e/caterings.spec.ts`: 18 describes planteados, implementación parcial.
- **0 tests unitarios.**

**Coverage real: ~0%.**

### 6.3 Propuesta mínima de tests

Prioridad alta (protegen las vulnerabilidades que hemos destapado):

1. **Aislamiento de tenant** (Playwright E2E): login como user de tenant A, intentar acceder a recursos de tenant B por URL y por header → 403/404.
2. **Cross-tenant bypass** (Vitest unit): tests sobre las 5 rutas API del crítico #1 enviando `x-tenant-id` distinto del de la sesión → 403.
3. **Cutoff 11:00** (Vitest unit): dado un pedido `DRAFT` a las 10:59, `confirmOrder()` → `LOCKED_AFTER_CUTOFF` a las 11:01; `cancelOrder()` tras 11:00 → error.
4. **Hash de auditoría** (Vitest unit): dos llamadas a `logAudit` con los mismos datos producen hashes diferentes (el timestamp entra en el hash), pero ambos logs tienen hash válido.
5. **RBAC** (Vitest unit): empleado ≠ RRHH no puede crear empleado, chef no puede facturar, etc.

Con estos 5 suites tienes cubierto el 80% del riesgo regulatorio.

---

## 7. Seguridad — dependencias, headers, secrets

### 7.1 Vulnerabilidades de dependencias (pnpm audit --prod)

**16 vulnerabilidades** — 1 crítica, 8 altas, 7 moderadas.

| Severidad | Paquete | Versión actual | Patch | Advisory |
|---|---|---|---|---|
| 🔴 **Crítica** | `next` | 15.5.6 | ≥15.5.7 | RCE en React Flight protocol (GHSA-9qr9-h5gf-34mp) |
| 🟠 Alta | `next` | 15.5.6 | ≥15.5.8 | DoS con Server Components (GHSA-mwv6-3258-q52c) |
| 🟠 Alta | `next` | 15.5.6 | ≥15.5.10 | Deserialización HTTP → DoS (GHSA-h25m-26qc-wcjf) |
| 🟠 Alta | `next` | 15.5.6 | ≥15.5.10 | Otra (GHSA-9g9p-9gw9-jx7f) |
| 🟠 Alta | `glob` | 10.4.5 | ≥10.5.0 | Command injection `--cmd` (GHSA-5j98-mcp5-4vw2) |
| 🟠 Alta | `minimatch` | 9.0.5 | ≥9.0.6 | ReDoS (GHSA-3ppc-4f35-3m26) |
| 🟠 Alta | `minimatch` | 9.0.5 | | ReDoS matchOne (otra) |
| 🟡 Moderada | `next` | 15.5.6 | ≥15.5.13 | HTTP smuggling en rewrites |
| 🟡 Moderada | `next` | 15.5.6 | ≥15.5.14 | next/image cache disk exhaustion |
| 🟡 Moderada | `brace-expansion` | 2.0.2 | ≥2.0.3 | Zero-step hang |
| 🟡 Moderada | `picomatch` | 2.3.1 | ≥2.3.2 | POSIX injection |
| 🟡 Moderada | `yaml` | 2.8.1 | ≥2.8.3 | Stack overflow |

**Acción mínima ya**: `pnpm up next@latest` → debería llevarte a 15.5.14+ cerrando 5 avisos de Next (críticos + altos + moderados). Lo demás son transitivas de `tailwindcss-animate`; `pnpm dedupe` y `pnpm up tailwindcss tailwindcss-animate` ayudan.

### 7.2 Dependencias **mayores** desactualizadas

| Paquete | Actual | Latest | Salto |
|---|---|---|---|
| `prisma` / `@prisma/client` | 5.22.0 | 7.7.0 | 2 majors |
| `next` | 15.0.3 (15.5.6 instalado) | 16.2.4 | 1 major |
| `bcryptjs` | 2.4.3 | 3.0.3 | 1 major |
| `@hookform/resolvers` | 3.9.1 | 5.2.2 | 2 majors |
| `eslint` | 8.57.1 | 10.2.1 | 2 majors |
| `eslint-config-next` | 15 | 16 | alineado con Next |
| `tailwind-merge` | 2.5.4 | 3.5.0 | 1 major |
| `framer-motion` | 11 | 12 | 1 major |
| `@vitejs/plugin-react` | 4 | 6 | 2 majors |
| `@types/node` | 22 | 25 | 3 majors |

El salto Prisma 5 → 7 es el más delicado (cambia la forma en que se genera el cliente y algunos tipos). Hacer en rama aparte con tests ya montados.

### 7.3 Headers de seguridad

`next.config.js:28-52` configura:
- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` ✅

**Faltan**:
- `Strict-Transport-Security` (HSTS) — necesario en prod.
- `Content-Security-Policy` — cualquier CSP razonable mejora lo que hay ahora (nada). Para App Router se puede generar nonce por request.
- Nada de cookies `Secure` / `HttpOnly` / `SameSite` configurado explícitamente; NextAuth pone defaults razonables pero auditar en prod.

### 7.4 Rate limiting

No encontré rate limiting en ningún sitio. Recomendación: `@upstash/ratelimit` + Redis, o a nivel Coolify/Nginx. Especialmente crítico en `/api/auth/*` y `/api/admin/impersonate/*`.

---

## 8. Documentación — 94 archivos, saturada

`docs/` tiene **94 markdowns**. Buena señal: documentas mucho. Mala señal: no hay índice y hay 5+ documentos "SOLUCION-FINAL" / "RESUMEN-FINAL" / "PROGRESO" que compiten por ser el estado actual.

### 8.1 Los 5 docs más relevantes hoy

1. **`INFORME-PROBLEMAS-PRODUCCION-SINTUPPER.md`** (805 líneas) — explica por qué producción no va. **Leer antes de tocar Coolify.**
2. **`RESUMEN-FINAL-TODOS-LOS-FIXES.md`** (266 líneas) — último pase de fixes pre-aparcado.
3. **`PROGRESO.md`** (358 líneas) — estado de fases. Según esto: Fase 0 ✅, Fase 1 40%, 2-4 sin empezar. **Obsoleto** si contamos que hay UI de portal catering/empresa/empleado con bastante avance.
4. **`prd.md`** (141 KB, ~4100 líneas) — especificación del producto. Sigue válida en el plano funcional.
5. **`ANALISIS-CAMBIO-SUBDOMINIOS-A-RUTAS.md`** — análisis (modificado pero sin commit) sobre cambiar multi-tenancy de subdominios a rutas.

### 8.2 Limpieza propuesta

- **Mover a `docs/archive/`**: todos los `PASO-*-COMPLETADO`, `PORTAL-*-FASE-*-COMPLETADA`, `FIX-*`, `SOLUCION-*`, `MIGRACION-SHADCN-*`, `LISTO-PARA-PROBAR`, `LOGIN-ARREGLADO`, `REINICIAR-SERVIDOR`, `INSTRUCCIONES-REINICIO`. Total: ~50 docs.
- **Consolidar PROGRESO**: un único `docs/ESTADO.md` vivo.
- **Estructura deseable**:
  ```
  docs/
    README.md              ← índice
    ESTADO.md              ← progreso vivo (reemplaza 8 docs)
    prd.md                 ← spec funcional
    arquitectura/          ← ARQUITECTURA-INTERCONEXIONES, DATABASE, SUBDOMINIOS-Y-ROUTING
    desarrollo/            ← SETUP, SETUP-Y-PRUEBAS, UI-GUIDELINES
    despliegue/            ← DESPLIEGUE-COOLIFY, CONFIGURACION-DNS, EJECUTAR-SEED-PRODUCCION
    qa/                    ← QA-TESTING, QA-SETUP, QA-QUICK-START
    analisis/              ← solo los vigentes
    archive/               ← los 50 docs históricos
  ```

---

## 9. Matriz de deuda técnica

| # | Categoría | Severidad | Esfuerzo | Impacto |
|---|---|---|---|---|
| 1 | Cross-tenant bypass 5 rutas | 🔴 Crítico | 1 día | Alto |
| 2 | `logAudit` roto impersonación | 🔴 Crítico | 2 horas | Medio |
| 3 | 16 CVEs (Next RCE) | 🔴 Crítico | 0.5 día + regresión | Alto |
| 4 | `ignoreBuildErrors: true` | 🟠 Alto | 1-2 días (destapar bugs) | Alto |
| 5 | Migraciones no-estándar | 🟠 Alto | 1 día | Alto |
| 6 | Seeds no idempotentes | 🟠 Alto | 0.5 día | Medio |
| 7 | 0 tests reales | 🟠 Alto | 1-2 semanas (seeds críticos) | Alto |
| 8 | Sin CI/CD | 🟠 Alto | 0.5 día | Alto |
| 9 | Sin cifrado PII real | 🟠 Alto | 2-3 días | Alto compliance |
| 10 | Sin rate limiting | 🟠 Alto | 0.5 día | Alto |
| 11 | Sin RLS / middleware Prisma | 🟠 Alto | 2-4 días | Alto seguridad |
| 12 | Queries con `findUnique` sin tenant | 🟡 Medio | 2 horas | Medio |
| 13 | Client-side fetching en catering | 🟡 Medio | 1-2 días | Medio |
| 14 | React Query + Zustand sin uso | 🟡 Medio | decidir usar/quitar | Medio |
| 15 | Componentes duplicados (KPI, activity, alerts) | 🟡 Medio | 1-2 días | Bajo |
| 16 | 51 `any` en backend | 🟡 Medio | 1-2 días | Medio |
| 17 | 3 middlewares en repo (2 dead) | 🟡 Bajo | 15 min | Bajo |
| 18 | `console.log` login/logout | 🟡 Bajo | 30 min | Bajo |
| 19 | Cache tenant en memoria | 🟡 Bajo | 0.5 día (Redis) | Medio (solo con >1 instancia) |
| 20 | 94 docs desorganizados | 🟡 Bajo | 1 día | Bajo |
| 21 | CSP / HSTS faltantes | 🟡 Bajo | 0.5 día | Medio prod |
| 22 | Deps mayores desactualizadas (Prisma 5→7) | 🟡 Bajo | 1-2 semanas en total | Medio |

**Esfuerzo total estimado para liquidar la deuda roja+naranja: 3-4 semanas de un dev, 1.5-2 semanas con tests existentes.**

---

## 10. Roadmap de remediación sugerido

### Sprint 1 — Estabilización crítica (3-5 días)

Objetivo: que el sistema sea **seguro para producción** sin añadir features.

- [ ] Fix crítico #1: validar `x-tenant-id` vs `session.user.tenantId` en las 5 rutas afectadas (o mejor: migrarlas a usar `session.user.tenantId` directamente).
- [ ] Fix crítico #2: reemplazar llamadas rotas a `logAudit` por `logImpersonation()` en `impersonation.ts`.
- [ ] Fix crítico #3: `pnpm up next@latest` (a ≥15.5.14), `pnpm dedupe`, re-test.
- [ ] Quitar `ignoreBuildErrors: true` y `ignoreDuringBuilds: true` de `next.config.js`. Arreglar errores que aparezcan.
- [ ] Eliminar `middleware-simple.ts` y `middleware-complex-backup.ts`.
- [ ] Quitar `console.log` en `config.ts:247,251`.
- [ ] Añadir guardia `NODE_ENV=production` a `reset-db.sh` y `seed-production.sh`.
- [ ] CI mínimo en GitHub Actions (`pnpm install`, `db:generate`, `type-check`, `lint`, `build`).

### Sprint 2 — Compliance y datos (1 semana)

- [ ] Reestructurar `prisma/migrations/` a formato estándar + `migration_lock.toml` + marcar applied en cada entorno.
- [ ] Hacer seeds idempotentes (todo `create` → `upsert`).
- [ ] Implementar cifrado real en `nameEnc`/`phoneEnc` (pgcrypto + clave en env).
- [ ] Implementar Prisma middleware para forzar `tenantId` en queries de modelos multi-tenant (o mejor, Postgres RLS).
- [ ] Tests críticos: aislamiento tenant, cross-tenant bypass, cutoff, RBAC, hash auditoría.

### Sprint 3 — Calidad y operación (1 semana)

- [ ] Rate limiting (`@upstash/ratelimit` o Nginx) en `/api/auth/*` y `/api/admin/*`.
- [ ] CSP + HSTS en `next.config.js`.
- [ ] Refactor `app/(catering)/catering/platos/page.tsx` (y hermanas) a Server Components.
- [ ] Decidir React Query/Zustand: usar o desinstalar.
- [ ] Consolidar `KPICard`, `RecentActivityTable`, `AlertsPanel` en `components/shared/`.
- [ ] Reducir `any` en backend crítico (<20).
- [ ] Limpiar `docs/` (mover históricos a `archive/`, un único `ESTADO.md`).

### Sprint 4 — Producción estable (3-5 días)

- [ ] Seguir `INFORME-PROBLEMAS-PRODUCCION-SINTUPPER.md` para desplegar Coolify con env vars y DNS wildcard correctos.
- [ ] Backup automático Postgres (antes de correr migraciones).
- [ ] Monitoring (Sentry o equivalente) — ya viene prepared en `env.example`.
- [ ] Redis para cache de tenant y sesiones si se escala a >1 instancia.

### Sprint 5+ — Roadmap de producto

Solo cuando los sprints 1-4 estén verdes: retomar el roadmap del README (Fase 1 → 4) sobre una base sana.

---

## 11. Conclusión

El proyecto **no está mal arquitecturado** — al contrario, tiene una base muy seria: schema Prisma completo y pensado, RBAC profundo, auditoría con hashes, compliance fiscal bien delimitado, stack moderno. Esa es la buena noticia: no hay que reescribir nada.

La mala es que durante el último sprint (nov 2025) hubo una mezcla de prisas + bug hunting + workarounds que dejaron heridas abiertas: se rompió la auditoría de impersonación, se filtraron 5 rutas con cross-tenant bypass, se desactivaron los strict checks del build para que compilara, y se deployó a producción sin configurar variables ni DNS. El proyecto llegó aquí **por acumulación de pequeños atajos**, no por un fallo de diseño.

La buena noticia es que todo eso es **recuperable en 3-4 semanas de trabajo enfocado**, sin tocar el diseño ni el producto. Después de esa remediación, el esqueleto que ya tienes es una excelente base para terminar Fases 2-4 y llegar a MVP real.

**Mi recomendación concreta para empezar mañana**: sprint 1 tal cual. Si me vuelves a preguntar cuando esté hecho, tenemos memoria compartida del estado y podemos atacar el sprint 2 con continuidad.

— Claude Opus 4.7, 2026-04-18
