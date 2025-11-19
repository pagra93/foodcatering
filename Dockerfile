# Dockerfile para Next.js 15 con Prisma
FROM node:20-alpine AS base

# Instalar pnpm, OpenSSL y crear symlinks para compatibilidad con Prisma
# Prisma necesita libssl.so.1.1 pero Alpine 3.22 viene con OpenSSL 3.x (libssl.so.3)
RUN apk add --no-cache libc6-compat openssl && \
    ln -sf /usr/lib/libssl.so.3 /usr/lib/libssl.so.1.1 2>/dev/null || true && \
    ln -sf /usr/lib/libcrypto.so.3 /usr/lib/libcrypto.so.1.1 2>/dev/null || true
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Rebuild el código fuente solo cuando sea necesario
FROM base AS builder
WORKDIR /app

# Copiar node_modules y código fuente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma Client
RUN pnpm prisma generate

# Variables de entorno para el build (sin secretos)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build de Next.js (genera .next/standalone)
RUN pnpm build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos del build standalone
# El modo standalone incluye node_modules necesarios en .next/standalone/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Crear directorio public y copiar si existe en builder
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar Prisma schema y migrations (necesario para migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Crear package.json mínimo para instalar Prisma CLI localmente
RUN echo '{"name":"app","version":"1.0.0"}' > package.json

# Instalar Prisma CLI localmente (como root, luego cambiaremos a nextjs)
RUN pnpm add -D prisma@5.22.0

# Cambiar ownership de node_modules a nextjs
RUN chown -R nextjs:nodejs /app/node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Añadir node_modules/.bin al PATH para que prisma sea accesible
ENV PATH="/app/node_modules/.bin:$PATH"

# Script de inicio: ejecutar migraciones y luego iniciar Next.js
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
