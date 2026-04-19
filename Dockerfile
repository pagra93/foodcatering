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

# Habilitar pnpm
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

# Crear usuario no-root para seguridad (compatible con Debian)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/bash nextjs

# Copiar archivos del build standalone
# El modo standalone incluye node_modules necesarios en .next/standalone/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar node_modules del builder si no existen en standalone
# Esto es necesario porque a veces el standalone no incluye todas las dependencias
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Crear directorio public y copiar si existe en builder
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar Prisma schema y migrations (necesario para migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copiar y hacer ejecutable el script de entrada
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Cambiar ownership de node_modules a nextjs
RUN chown -R nextjs:nodejs /app/node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Añadir node_modules/.bin al PATH para que prisma sea accesible
ENV PATH="/app/node_modules/.bin:$PATH"

# Usar script de entrada con manejo de errores mejorado
ENTRYPOINT ["/app/docker-entrypoint.sh"]
