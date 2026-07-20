# Dockerfile para Next.js 15 con Prisma
# Usar node:20-slim (Debian) en lugar de Alpine para mejor compatibilidad con Prisma
# Alpine 3.22 tiene problemas conocidos con OpenSSL y Prisma
FROM node:20-slim AS base

# Instalar dependencias del sistema necesarias para Prisma y pnpm
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Habilitar pnpm (versión fijada = reproducibilidad)
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Instalar TODAS las dependencias (incluye devDependencies) — necesario para el build
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# node_modules SOLO de producción (sin devDependencies) — se copia al runner.
# IMPORTANTE: se deriva de `deps`, NO hace un SEGUNDO `pnpm install`. BuildKit
# corre los stages en paralelo; tener dos `pnpm install` a la vez (este + el de
# `deps`) duplicaba el pico de RAM/CPU/disco y tumbaba el build en servidores
# pequeños (síntoma: "pillado" en el paso de install). Al derivar de `deps` y
# solo PODAR devDependencies, este stage es ligero y corre DESPUÉS de `deps`.
FROM deps AS prod-deps
WORKDIR /app
RUN pnpm prune --prod

# Build stage: genera .next/standalone usando TODAS las deps
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma Client
RUN pnpm prisma generate

# Variables de entorno para el build (sin secretos)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Limitar heap de Node a 2GB: evita que V8 pida más RAM de la que hay y fuerza
# GC agresivo. Sin esto, en servidores pequeños con Postgres corriendo al lado,
# el build muere por OOM sin mensaje claro (síntoma: build "pillado").
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build de Next.js (genera .next/standalone)
RUN pnpm build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad (compatible con Debian)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/bash nextjs

# Copiar build standalone + static (Next.js 15 output:'standalone' incluye el
# runtime mínimo y su propio server.js).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Directorio public
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + migrations (el entrypoint ejecuta `prisma migrate deploy`)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Script de migración de datos de seguridad (una sola vez, ejecutable con `node`
# desde la terminal de Coolify: `ALLOW_PROD=1 node scripts/prod-seguridad-migracion.mjs`)
COPY --from=builder --chown=nextjs:nodejs /app/scripts/prod-seguridad-migracion.mjs ./scripts/prod-seguridad-migracion.mjs

# Seed RBAC prod (JS puro + catálogo JSON). Lo ejecuta el entrypoint tras
# `migrate deploy` (idempotente) para rellenar roles/permisos, que la migración
# crea vacíos. También corrible a mano: `ALLOW_PROD=1 node scripts/seed-rbac-prod.mjs`.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-rbac-prod.mjs ./scripts/seed-rbac-prod.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/rbac-catalog.json ./scripts/rbac-catalog.json

# Seed catálogo prod (planes, impuestos, alérgenos, festivos, motivos, OWASP,
# branding). Lo ejecuta el entrypoint tras `migrate deploy` (idempotente).
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-catalog-prod.mjs ./scripts/seed-catalog-prod.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/catalog-data.json ./scripts/catalog-data.json

# Seed modelo financiero prod (3 escenarios base/optimista/pesimista, autocontenido).
# Lo ejecuta el entrypoint tras `migrate deploy` (idempotente). Sin este COPY el
# archivo no está en el standalone y el entrypoint se salta el seed en silencio.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-finance-prod.mjs ./scripts/seed-finance-prod.mjs

# node_modules solo con prod deps (incluye CLI de `prisma` porque lo movimos
# a dependencies). Reemplaza el node_modules que trae el standalone por uno
# completo de prod — así `prisma migrate deploy` encuentra el binario.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Regenerar @prisma/client contra el schema. El standalone trae el cliente
# generado, pero al machacar su node_modules con el de prod-deps (que nunca
# corrió prisma generate) queda desalineado — next-auth/adapter lanza
# "did not initialize yet" en el primer query.
RUN node_modules/.bin/prisma generate

# Script de entrada
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Añadir node_modules/.bin al PATH para que prisma sea accesible
ENV PATH="/app/node_modules/.bin:$PATH"

# Usar script de entrada con manejo de errores mejorado
ENTRYPOINT ["/app/docker-entrypoint.sh"]
