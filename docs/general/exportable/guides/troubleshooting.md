# Troubleshooting

Los problemas frecuentes y sus soluciones. Para incidencias de producción
específicas, ver el [`RUNBOOK`](../../despliegue/RUNBOOK.md).

---

## Arranque / dev server

### `pnpm dev` arranca pero páginas dan 500 con `PrismaClient is not configured to run in Edge Runtime`

**Causa**: alguien importó `@/lib/db` o `@/lib/auth` (completo, no el
edge-safe) dentro de `middleware.ts`.

**Solución**: el middleware solo puede importar de `@/lib/auth/edge`.
Si necesitas datos de la BD en middleware, trasládalos a un header que
inyectas ahí y léelos en la page.

### El puerto 3000 ya está ocupado

```
Port 3000 is in use by process XXXXX, using available port 3002 instead.
```

Opciones:
- Usar el otro puerto que Next elige automáticamente.
- Matar el proceso ocupando 3000: `lsof -ti :3000 | xargs kill`.
- Fijar otro puerto: `PORT=3001 pnpm dev`.

### Subdominios `.localhost` no resuelven

Añadir a `/etc/hosts`:
```
127.0.0.1 admin.localhost acme.localhost deliciasexpress.localhost
```

### TypeScript errors masivos tras pull

Prisma Client desactualizado. Soluciones en orden:

```bash
pnpm db:generate       # regenera cliente
pnpm type-check        # verificar
# si aún falla:
rm -rf node_modules/.prisma
pnpm install
pnpm db:generate
```

---

## Base de datos

### No puedo conectar a `comidas_dev`

Verificar:

```bash
# 1. DATABASE_URL apunta a la BD correcta
cat .env | grep DATABASE_URL
# debe empezar por: postgresql://comidas_dev_user:...@5.78.124.107:5432/comidas_dev

# 2. La BD es alcanzable
psql "$DATABASE_URL" -c "\dt"
# si falla con "connection refused": el servidor no está up o el firewall corta
# si falla con "authentication failed": la password en el .env está mal
# si falla con "database does not exist": revisa el nombre

# 3. El usuario tiene permisos
psql "$DATABASE_URL" -c "SELECT current_user, current_database()"
```

### `prisma migrate dev` falla con "Database schema is not empty"

La BD tiene tablas pero Prisma no reconoce las migraciones. Opciones:

```bash
# Opción A: marcar migraciones existentes como aplicadas
pnpm prisma migrate resolve --applied <nombre_migración>

# Opción B (solo en dev): reset completo
pnpm db:reset
pnpm db:seed

# Opción C: diff manual para ver qué falta
pnpm prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource  prisma/schema.prisma
```

### `pnpm db:seed` falla

Causa común: constraints (unique violations) porque los datos ya existen.

El seed es **idempotente** — debería re-ejecutarse sin errores. Si falla:

- Leer el error completo — suele dar el modelo + campo que rompe.
- Si es un cambio de schema no aplicado: `pnpm prisma db push`.
- Si es un caso límite: `pnpm db:reset && pnpm db:seed`.

### Migración aplicada a comidas_prod me rompió algo

**No ejecutes rollback ciego**. Ve al RUNBOOK, sección "Rollback
tras migración mala":

1. Identificar qué cambió (`git log prisma/migrations/`).
2. Backup pre-hotfix: `bash scripts/backup-prod.sh`.
3. Escribir migración inversa manualmente (Prisma no genera rollback
   automático).
4. Aplicar + verificar.
5. Commit con explicación.

---

## Autenticación

### Login dice "Credenciales inválidas" aunque la password es correcta

Causas posibles:
- Usuario con `status != ACTIVE` (deshabilitado, pending). `authorize()`
  solo autentica usuarios ACTIVE.
- Usuario eliminado (`deletedAt IS NOT NULL`). Misma razón.
- BD distinta: ¿`.env` apunta a `comidas_dev` pero tú intentas con user
  de `comidas_prod`? Verificar.
- Password reseteada por otro: comprueba en Prisma Studio que el
  `passwordHash` cuadra con tu expectativa.

### Login OK pero redirige siempre a `/unauthorized`

El rol del user no coincide con el layout del portal que intenta
cargar. Verificar:
- `user.role` en BD es el esperado.
- `user.tenant.type` también (ROOT/EMPRESA/CATERING).
- La URL coincide con el portal correspondiente (ver
  `getDashboardPath`).

### JWT expira antes de tiempo

`session.maxAge = 30 * 24 * 60 * 60` (30 días). Si cierra antes:
- ¿Cambió `NEXTAUTH_SECRET`? Rotarlo invalida todas las sesiones.
- ¿El reloj del servidor está desincronizado? JWT valida timestamp.
- ¿El navegador borra cookies (modo privado)?

### Impersonación termina sola antes de 15 min

Es lo esperado — TTL 15 min por seguridad. Si se necesitan más:

```ts
// lib/auth/impersonation.ts
const IMPERSONATION_TTL = 15 * 60 * 1000  // subir con cuidado
```

No subirlo a más de 1 h sin razón justificada.

---

## Multi-tenant

### Veo datos de otra empresa mezclados

**Esto es el bug más grave.** Pasos:

1. **No pushear código más** hasta localizar.
2. Identificar la query exacta: buscar en logs o recoger el stack trace.
3. Verificar que la query lleva filtro `tenantId`/`tenantEmpresa`/
   `tenantCatering`.
4. Verificar que el `tenantId` viene de `getScopedTenantId()` y no de
   un header confiando en el cliente.
5. Escribir test que reproduce el caso (empresa A, empresa B, entrar
   como A, verificar que no aparece dato de B).
6. Arreglar + test verde.
7. Audit log: ver si algún actor malicioso ya lo explotó (`AuditLog`
   con `actorId` del user problemático accediendo a `entityId` fuera
   de su tenant).

### Warning "`X.findMany` sin filtro de tenant" en dev

El middleware dev de Prisma (`lib/db/prisma.ts`) detecta queries sobre
modelos multi-tenant sin filtro. **Es un aviso, no un error**, pero
**siempre hay que arreglarlo** — en prod ese aviso no corre, y la query
devolverá datos cruzados.

Ver la query logueada, identificar dónde, añadir el filtro.

---

## Prisma

### `Argument: Unknown arg X` en una query

El schema y el código no están sincronizados. Pasos:

```bash
pnpm db:generate       # regenera cliente
# Reiniciar dev server (Ctrl+C y `pnpm dev`)
# Reiniciar TypeScript en tu IDE (VS Code: Cmd+Shift+P → "Restart TS Server")
```

Si el error persiste: el campo X no está en el schema. Añadirlo o
cambiarlo por el correcto.

### Prisma Studio no me muestra los tipos correctos

Prisma Studio usa el cliente generado. Regenerar:
```bash
pnpm db:generate
# Cerrar Studio (Ctrl+C en la terminal que lo abrió)
pnpm db:studio
```

### `P2002: Unique constraint failed`

Intentas crear algo que ya existe. Ver el campo en el error (`field_name`)
y decidir: upsert en lugar de create, o manejar el caso.

---

## Build / deploy

### `pnpm build` falla con errores de tipos

**No** añadir `ignoreBuildErrors: true` al `next.config.ts`. Arreglar
los errores. Patrón común:

```bash
pnpm type-check 2>&1 | head -50   # ver los primeros
# ir uno por uno
```

### El build local pasa pero CI falla

Causas:
- Node version diferente (CI usa 20, tú 18).
- Env vars: CI no tiene `DATABASE_URL` porque es un build que no
  corre queries, pero sí necesita que `lib/env.ts` valide las required.
  Hoy `env.ts` no exige todas en build — ver el archivo si hay
  sorpresas.
- Caches: CI parte de cero, tú tienes `.next/cache`. Limpiar local:
  `rm -rf .next` y re-build.

### Coolify marca el deploy como "failed" pero no veo nada en logs

Entrar por SSH al servidor:

```bash
ssh root@5.78.124.107
docker ps -a | grep comidas   # ver contenedores (incluso salidos)
docker logs <id> --tail 100    # últimas líneas
```

Comúnmente:
- Migración destructiva rechazada por `prisma migrate deploy`.
- `NEXTAUTH_SECRET` ausente o corto.
- `DATABASE_URL` apuntando mal o usuario Postgres sin permisos.

---

## Seguridad

### El audit log no cuadra con lo que creo que pasó

El hash valida integridad. Para verificar manualmente:

```ts
const expected = sha256(
  `${log.actorId}|${log.action}|${log.entity}|${log.entityId}|${log.timestamp}|...`
)
// comparar con log.hash
```

Si difieren, alguien tocó la tabla fuera de la app. Eso es incidente
grave — aislar, investigar logs de Postgres, backup.

### Quiero revocar una sesión activa manualmente

Hoy no hay mecanismo clean (se desarrollaría rotando un `sessionNonce`
por user). Workaround:

1. Cambiar `NEXTAUTH_SECRET` en Coolify → invalida **todas** las sesiones
   (demasiado agresivo normalmente).
2. Cambiar `User.passwordHash` → NextAuth no lo re-valida por cada
   request (solo al login), así que no te sirve.
3. Marcar `User.status = DISABLED` → próxima request queda sin sesión
   (el JWT callback o el layout debería detectarlo — verificar).

### Alguien reportó un XSS / inyección

Ruta:
1. Verificar el input vector.
2. Ver si Zod validaba (probablemente no lo suficiente).
3. Parchear validación.
4. Verificar con todos los inputs similares (si uno falló, otros igual).
5. Audit de los logs para ver si se explotó.

---

## Rendimiento

### Una página del portal tarda >3s en cargar

Activar logging de queries:

```ts
// lib/db/prisma.ts temporalmente
new PrismaClient({ log: ['query'] })
```

Reload la página. Ver en consola qué queries se disparan:

- ¿Muchas queries (N+1)? Consolidar con `include` o `findMany` con
  `where: { id: { in: [...] } }`.
- ¿Una query lenta? Ver el SQL generado, probablemente falta índice.
- ¿No hay paginación? Añadir `take: 20`.

### El dashboard de empresa se queda colgado

Consultar logs de Postgres:

```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds';
```

Si una query lleva corriendo mucho: matar con `SELECT pg_cancel_backend(pid)`.
Analizar por qué es lenta (EXPLAIN ANALYZE).

---

## Otros

### El seed tarda demasiado

Seed crea 171 pedidos + 5 empresas + usuarios + platos. Debería tardar
~20-30 s. Si tarda >1 min:
- Verificar latencia a Hetzner: `ping 5.78.124.107`.
- Batch inserts en lugar de uno a uno (ya está así en seed principal).

### React Query me devuelve datos viejos tras mutación

Falta invalidación. Añadir tras la Server Action:

```ts
revalidatePath('/empresa/empleados')
// o más granular:
revalidateTag('employees-list')
```

Y en las queries del cliente que usan `useQuery`, poner
`queryKey: ['employees', tenantId]` y `invalidateQueries(['employees'])`
desde el cliente tras la mutación.

### Error `Invalid hook call` en un componente

Posible mezcla Server/Client Component. Verificar:
- Archivo con `'use client'` arriba si usa hooks.
- No importa Server Components desde Client Components.
- No llama `useXxx` fuera del render.
