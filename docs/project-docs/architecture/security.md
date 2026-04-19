# Seguridad

## Modelo de amenazas

Activos que hay que proteger, ordenados por criticidad:

1. **Datos fiscales IRPF** de las empresas (pedidos, facturas, reportes).
   Si se filtran o manipulan, Hacienda puede rechazar deductibilidad →
   la empresa pierde miles de € y confianza en SinTupper.
2. **PII de empleados** (nombre, teléfono, alergias, historial de
   comidas). GDPR sensible.
3. **Credenciales** (passwords hashed, JWT, secrets de integraciones).
4. **Integridad del audit log**. Si se puede reescribir a posteriori,
   perdemos el tamper-evidence que da valor al producto.

## Capas de defensa

### 1. Autenticación

- NextAuth v5 con JWT firmado (HS256 + `NEXTAUTH_SECRET`).
- Bcrypt para passwords (salt + cost factor 10).
- MFA planeado pero no implementado.
- Recuperación de contraseña con tokens de un solo uso, TTL 1 h.

Ver [auth.md](./auth.md).

### 2. Autorización (RBAC granular)

- 14 roles con matriz de permisos en `lib/auth/permissions.ts`.
- Wildcards (`orders:*`, `*:read`, `*:*`).
- Doble check: en Server Component (`requireRole`) y a nivel de API
  route (`withRoles`).
- Scope por tenant vía `getScopedTenantId` — explicado en
  [multi-tenant.md](./multi-tenant.md).

### 3. Aislación multi-tenant

5 capas documentadas en [multi-tenant.md](./multi-tenant.md). Resumen:
tenant extraído del JWT (no del cliente) + filtro Prisma obligatorio +
middleware dev detecta olvidos + `getScopedTenantId` centraliza la
resolución + RLS Postgres como red de seguridad (preparado, no activo).

### 4. Protección de endpoints

Guards en `lib/guards/`:

#### `lib/guards/api.ts`

Helpers para API routes:

```ts
export async function requireAuth(): Promise<Session>
export async function requireRoles(roles: UserRole[]): Promise<Session>
export async function requirePermission(perm: string): Promise<Session>
export async function requireTenantAccess(tenantId: string): Promise<Session>
export async function requireSuperAdmin(): Promise<Session>
```

Y HOFs para envolver handlers:

```ts
// app/api/empresa/empleados/route.ts
export const GET = withRoles(
  ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH'],
  async (req, session) => {
    const tenantId = await getScopedTenantId(req)
    const employees = await getEmployees(tenantId, parseFilters(req))
    return NextResponse.json(employees)
  }
)
```

Lanzan `NextResponse` 401/403 si fallan.

#### `lib/guards/PermissionGuard.tsx`

HOCs para Server Components:

```tsx
export default PermissionGuard(
  async function Page() {
    // se renderiza solo si el user tiene el permiso
  },
  { required: 'employees:manage' }
)
```

Helpers pre-construidos: `RequireOrdersCreate`, `RequireEmployeesManage`,
`RequireFinancialAccess`, etc.

### 5. Cifrado de PII

`lib/crypto/pii.ts`: AES-256-GCM con IV aleatorio por mensaje y
authTag para detección de manipulación.

```ts
export function encryptPII(plain: string): string // base64
export function decryptPII(blob: string): string
export function looksEncrypted(value: string): boolean
```

Formato del blob:
```
base64(iv || authTag || ciphertext)
  iv: 12 bytes aleatorios
  authTag: 16 bytes
  ciphertext: plaintext cifrado
```

La clave viene de `PII_ENCRYPTION_KEY` en el env (32 bytes hex — 64
chars). Generar con `openssl rand -hex 32`.

**Estado actual**: los campos `User.nameEnc`, `User.phoneEnc` están
preparados (nombres con sufijo `Enc`) pero todavía guardan texto plano.
El helper `looksEncrypted()` distingue lo uno de lo otro, y hay un
script (`scripts/migrate-pii-encryption.ts`) para cifrar el histórico
cuando se active. Decisión deliberada: esperar a tener datos reales y
una rotación de claves definida antes de activarlo.

### 6. Rate limiting

`lib/ratelimit.ts`: in-memory con interfaz para swap Upstash Redis.

```ts
export const authRateLimiter = new InMemoryRateLimiter({
  window: 60_000,    // 1 minuto
  max: 5,            // 5 intentos
})

export const impersonationRateLimiter = new InMemoryRateLimiter({
  window: 60 * 60 * 1000,   // 1 hora
  max: 3,                    // 3 impersonaciones
})

export const exportRateLimiter = new InMemoryRateLimiter({
  window: 60 * 60 * 1000,   // 1 hora
  max: 10,                   // 10 exports
})
```

Key:
- auth: `ip:${ip}` (extraída de `X-Forwarded-For` detrás de Coolify).
- impersonation: `user:${userId}`.
- export: `tenant:${tenantId}`.

Limitación conocida: **single-instance**. Si escalamos a N replicas,
cada replica tendría su propia ventana y los límites se multiplican por
N. Swap a Upstash cuando eso ocurra (interfaz ya preparada, cambio trivial).

### 7. Headers de seguridad

En `next.config.ts`:

- **Content-Security-Policy**: script-src / style-src / img-src
  restringidos. `'unsafe-inline'` solo en style (Tailwind genera muchas
  clases).
- **Strict-Transport-Security**: `max-age=63072000; includeSubDomains; preload`.
- **X-Frame-Options**: `DENY` (no embeber en iframe).
- **X-Content-Type-Options**: `nosniff`.
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **Permissions-Policy**: sin camera/microphone/geolocation (salvo
  /catering/ruta/[id] donde geolocation se solicita).

### 8. Validación de inputs

Todo input del cliente pasa por Zod (`lib/validations/<dominio>.ts`)
antes de tocar la BD:

```ts
// lib/validations/dish.ts
export const createDishSchema = z.object({
  name: z.string().min(1).max(200),
  course: z.enum(['FIRST','SECOND','DESSERT']),
  basePrice: z.number().positive().lte(50), // 50€ máximo por plato
  labels: z.array(z.string()).max(20),
  // ...
})
```

Las Server Actions parsean con `schema.safeParse()` y devuelven error
validado si falla.

### 9. Auditoría tamper-evident

Ya explicado: cada log incluye hash SHA-256 del contenido + timestamp.

Futuro: **chained hashes** — cada log incluye el hash del anterior,
formando una cadena (como Git). Si alguien borra un log intermedio, el
siguiente no cuadra. Pendiente para cuando la tabla pese más.

### 10. Secrets

- **Nunca** en código (`.env` en `.gitignore`).
- **Nunca** en logs (`console.log(process.env)` prohibido por lint custom).
- Secrets en prod viven en Coolify Secret Manager, no en el Dockerfile.
- Rotación manual recomendada cada 6 meses para `NEXTAUTH_SECRET`,
  `PII_ENCRYPTION_KEY` (cuando se active), tokens de webhooks.

### 11. CVE monitoring

- `pnpm audit --prod` en CI. Falla si aparece severity `critical`.
- `npm audit` y Dependabot alerts en GitHub.
- Estado actual: 0 criticals, 0 highs, 1 moderate (`yaml` transitivo de
  Tailwind 3 — se cierra subiendo a Tailwind 4).

### 12. Backups como defensa

Diariamente a las 03:00 (cron en el servidor):
- `pg_dump` de `comidas_prod` comprimido a `/var/backups/comidas/`.
- Retención 30 días.
- Restaurable: `gunzip -c <file> | psql -U comidas_prod_user -d comidas_prod_restore`.

Pendiente: copy off-site a S3/B2 via rclone. Mientras tanto, un incidente
catastrófico que destruya `/var/backups/` requiere recrear datos.

## Checklist de revisión antes de mergear código

(Para Claude y humanos)

- [ ] ¿Una query nueva sobre modelo multi-tenant? → tiene `tenantId`/`tenantEmpresa`/`tenantCatering` en el `where`.
- [ ] ¿Una API route nueva? → envuelta con `withAuth` o `withRoles`.
- [ ] ¿Un endpoint que escribe? → llama a `logAudit()` con el diff.
- [ ] ¿Input del cliente? → validado con Zod antes de tocar la BD.
- [ ] ¿Nuevo campo PII? → cifrado con `encryptPII()` antes de guardar.
- [ ] ¿Nuevo secret? → en `.env`, no hardcoded.
- [ ] ¿`ignoreBuildErrors`, `@ts-ignore`, `any` "temporal"? → **no**. Corrige la causa.
- [ ] ¿Cambio en el schema? → `pnpm db:migrate:dev --name descriptivo` → migración en git.
- [ ] ¿Permiso nuevo requerido? → añadido en `lib/auth/permissions.ts` y guardado en la ruta.

## Incidentes pasados (para recordar)

- **Drift schema-código invisibilizado por `ignoreBuildErrors: true`**:
  600+ errores TS ocultos acumulados durante meses. Arreglado en 8
  sprints de estabilización (2026-04). Moraleja: **nunca ignorar el
  build**.
- **Cross-tenant bypass en 5 rutas**: headers `x-tenant-id` se aceptaban
  sin validar. Cerrado con `getScopedTenantId`. Moraleja: **nunca
  confiar en headers del cliente**.
- **16 CVEs en deps (1 critical Next.js RCE)**: sin `pnpm audit` en CI.
  Cerrado con actualización. Moraleja: **CI debe auditar**.
- **Test de audit hash no verificaba propiedad de timestamp**: si alguien
  eliminaba el timestamp del hash, el test seguía verde. Arreglado.
  Moraleja: **cada invariante crítica → test que la verifique**.
