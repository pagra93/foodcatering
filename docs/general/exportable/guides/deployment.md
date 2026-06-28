# Guía de despliegue

Cómo el código pasa de tu laptop a producción. Para los escenarios
operativos (backup, restore, hotfix), ver el
[`RUNBOOK`](../../despliegue/RUNBOOK.md).

## Arquitectura

Dos entornos, una misma instancia Postgres compartida en Hetzner con
dos BDs separadas:

```
Laptop (.env → comidas_dev)          Coolify (env vars → comidas_prod)
  │                                    │
  │  pnpm dev                          │  Docker multi-stage
  │  pnpm test                         │  docker-entrypoint.sh
  │  pnpm build (sanity)               │    ├─ prisma migrate deploy
  │                                    │    └─ next start
  ▼                                    ▼
Postgres @ 5.78.124.107:5432
  ├─ comidas_dev   user: comidas_dev_user
  └─ comidas_prod  user: comidas_prod_user
```

Cada usuario Postgres tiene GRANT **solo a su BD**. Aunque se
confunda el `DATABASE_URL`, Postgres niega el acceso.

## Flujo dev → prod

### 1. Cambios de código sin cambio de schema

```bash
# Local
pnpm type-check && pnpm lint && pnpm exec vitest run && pnpm build
git add . && git commit -m "feat: xxx"
git push origin main

# GitHub Actions corre el mismo pipeline.
# Coolify detecta el push y reconstruye la imagen Docker.
# El contenedor arranca con `docker-entrypoint.sh`:
#   - prisma migrate deploy  (no hay migraciones pendientes → no-op)
#   - next start
# El DNS de plati.es apunta al nuevo contenedor en 2-5 min.
```

### 2. Cambios con modificación de schema

```bash
# Local
# Editar prisma/schema.prisma
pnpm db:migrate:dev --name descriptivo
#    → crea prisma/migrations/YYYYMMDD_descriptivo/migration.sql
#    → aplica al comidas_dev

# Verificar que pnpm dev sigue funcionando.
# Tests + build + commit + push como antes.

# En prod:
# El docker-entrypoint.sh ejecuta `prisma migrate deploy` al arrancar el
# nuevo contenedor, aplicando solo las migraciones pendientes a
# comidas_prod. Si hay una migración destructiva, Prisma falla y el
# contenedor no arranca (fail-safe).
```

### 3. Hotfix a prod

Ver [`RUNBOOK` sección "Hotfix"](../../despliegue/RUNBOOK.md).

Flujo corto:
- Branch desde main: `git checkout -b hotfix/xyz`.
- Fix mínimo + test.
- PR + merge a main.
- Coolify redeploya.
- Cherry-pick a cualquier branch de desarrollo.

## Variables de entorno

### En laptop (archivo `.env`)

```
DATABASE_URL="postgresql://comidas_dev_user:...@5.78.124.107:5432/comidas_dev?schema=public"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
WILDCARD_DOMAIN=".localhost:3000"
FEATURE_AI_NUTRITION=false
FEATURE_AUTO_SELECTION=false
```

### En Coolify (panel de variables)

```
DATABASE_URL="postgresql://comidas_prod_user:...@<internal-coolify-host>:5432/comidas_prod?schema=public"
NEXTAUTH_SECRET="<otro distinto del dev>"
NEXTAUTH_URL="https://plati.es"
NODE_ENV="production"
WILDCARD_DOMAIN=".plati.es"
PII_ENCRYPTION_KEY="..."   ← cuando se active
FEATURE_AI_NUTRITION=false
FEATURE_AUTO_SELECTION=false
```

**Nunca** copiar/pegar el `.env` de dev al panel de Coolify. Son dos BDs
con usuarios y passwords distintos; mezclarlo es un error operativo.

## Build productivo

Dockerfile multi-stage (`Dockerfile` en raíz):

```
Stage 1: deps
  - Copia package.json + pnpm-lock.yaml
  - pnpm install --frozen-lockfile

Stage 2: builder
  - Copia deps + código
  - pnpm db:generate (Prisma Client)
  - pnpm build (Next.js build)

Stage 3: runner (final)
  - Base: node:20-alpine
  - Copia solo .next/standalone, .next/static, public
  - ENV NODE_ENV=production
  - EXPOSE 3000
  - CMD ["node", "server.js"]  ← servido por docker-entrypoint.sh que lo invoca tras migrate
```

Imagen final ~250 MB.

## docker-entrypoint.sh

```bash
#!/bin/sh
set -e

echo "[entrypoint] Aplicando migraciones pendientes..."
npx prisma migrate deploy

echo "[entrypoint] Arrancando Next..."
exec node server.js
```

Si `migrate deploy` falla (ej: migración destructiva que Prisma rechaza
porque borraría datos), el contenedor no arranca y Coolify lo reporta.
Esto es intencional — mejor no arrancar que arrancar roto.

## Rollback

Ver [`RUNBOOK` sección "Rollback"](../../despliegue/RUNBOOK.md).

Opciones:

1. **Git revert** — crear commit que revierta la feature problemática,
   push, Coolify redeploya la versión "revertida". Sin downtime, sin
   tocar BD.
2. **Redeploy imagen anterior** — desde el panel Coolify, "Redeploy"
   sobre la imagen previa. Downtime ~2-3 min durante el swap.
3. **Restaurar BD desde backup** — solo si la regresión corrompió datos.
   Ver RUNBOOK.

## CI

`.github/workflows/ci.yml` se ejecuta en cada push y PR:

```yaml
jobs:
  test:
    steps:
      - checkout
      - setup-node@20
      - pnpm install
      - pnpm db:generate          # para que tipos estén disponibles
      - pnpm type-check
      - pnpm lint
      - pnpm exec vitest run
      - pnpm build                # descarta errores de build
      - pnpm audit --prod --audit-level=high
```

El check es green/red en el PR. Main protegido: PR no se puede mergear
si el CI falla.

## Backups

Cron en el servidor Hetzner ejecuta diariamente a las 03:00:

```bash
/path/to/scripts/backup-prod.sh
```

Script:
1. `pg_dump comidas_prod | gzip > /var/backups/comidas/YYYYMMDD_HHMM.sql.gz`.
2. Purga backups > 30 días (`find ... -mtime +30 -delete`).

Restaurar: ver [`RUNBOOK` sección "Restore"](../../despliegue/RUNBOOK.md).

**Pendiente**: copia off-site a S3/B2 con rclone (evento catastrófico
en el servidor perdería los backups locales).

## DNS y SSL

- Dominio: `plati.es` registrado con su DNS apuntando a la IP de
  Hetzner.
- Wildcard `*.plati.es` también apunta al mismo para soportar
  subdominios dinámicos (`acme.plati.es`, etc.).
- Coolify gestiona certificados Let's Encrypt automáticos con DNS
  challenge (para wildcard) o HTTP challenge (para raíz).
- Renovación automática cada 60-90 días.

## Monitorización

Hoy: logs en Coolify + `pg_stat_activity` vía psql manual.

Pendiente (cuando haya tráfico real):
- **Sentry** para errores runtime en cliente y servidor.
- **Uptime Robot** (o similar) para ping a `/api/health` cada 5 min.
- **pg_stat_statements** + Grafana para queries lentas.
- **Logs estructurados** con pino en lugar de `console.log`.

## Staging

Hoy: **aplazado**. Justificación (abril 2026):
- `comidas_prod` está vacía, sin clientes reales.
- Gestión de 3 entornos (dev, staging, prod) añade overhead sin aportar
  valor cuando todavía podemos tumbar prod y no pasa nada.

Cuando se añada:
- Crear BD `comidas_staging` en el mismo Postgres con su usuario.
- Servicio aparte en Coolify en `staging.plati.es`.
- Rama `release` que mergea desde `main` a prod; `main` deployaría
  staging.
- El flujo pasaría a ser: feature branch → main (deploy a staging) →
  merge a release (deploy a prod).
