#!/bin/sh
# No usar set -e para permitir que el servidor inicie incluso si hay errores menores

echo "🚀 Iniciando aplicación..."
echo "   Directorio de trabajo: $(pwd)"
echo "   Usuario: $(whoami)"

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "postgresql://usuario:contraseña@host:5432/database" ]; then
  echo "❌ ERROR: DATABASE_URL no está configurada correctamente"
  echo "   Por favor, configura DATABASE_URL en Coolify con la URL real de PostgreSQL"
  exit 1
fi

# Normalizar esquema: postgres:// -> postgresql:// (Prisma prefiere postgresql://)
if echo "$DATABASE_URL" | grep -q "^postgres://"; then
  echo "⚠️  Normalizando esquema de postgres:// a postgresql://"
  DATABASE_URL=$(echo "$DATABASE_URL" | sed 's|^postgres://|postgresql://|')
  export DATABASE_URL
fi

echo "✅ DATABASE_URL configurada: ${DATABASE_URL%%@*}@***" # Ocultar credenciales en logs

# Verificar si hay migraciones válidas de Prisma
MIGRATIONS_DIR="prisma/migrations"
HAS_VALID_MIGRATIONS=false

if [ -d "$MIGRATIONS_DIR" ]; then
  # Buscar directorios de migración (estructura: migration_name/migration.sql)
  MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
  if [ "$MIGRATION_COUNT" -gt 0 ]; then
    HAS_VALID_MIGRATIONS=true
    echo "📋 Encontradas $MIGRATION_COUNT migraciones válidas"
  else
    echo "📋 No se encontraron directorios de migración en $MIGRATIONS_DIR"
  fi
else
  echo "📋 Directorio de migraciones no existe: $MIGRATIONS_DIR"
fi

# Intentar aplicar migraciones o sincronizar schema (no crítico para iniciar el servidor)
MIGRATION_SUCCESS=false

if [ "$HAS_VALID_MIGRATIONS" = true ]; then
  # Intentar ejecutar migraciones con reintentos
  echo "📦 Ejecutando migraciones de Prisma..."
  MAX_RETRIES=3
  RETRY_COUNT=0

  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "   Intento $((RETRY_COUNT + 1))/$MAX_RETRIES..."
    if prisma migrate deploy 2>&1; then
      echo "✅ Migraciones aplicadas correctamente"
      MIGRATION_SUCCESS=true
      break
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "⚠️  Intento $RETRY_COUNT falló, reintentando en 5 segundos..."
        sleep 5
      else
        echo "⚠️  No se pudieron aplicar las migraciones después de $MAX_RETRIES intentos"
        if [ "${NODE_ENV:-}" = "production" ]; then
          echo "❌ ERROR: en producción NO se arranca con el schema desactualizado."
          echo "   (El contenedor parecería sano mientras sirve errores 500.)"
          echo "   Diagnostica con 'prisma migrate status' y resuelve con 'prisma migrate resolve'."
          exit 1
        fi
        echo "   Continuando con el inicio del servidor (entorno no-prod)..."
        echo "   Verifica los logs anteriores para más detalles"
      fi
    fi
  done
else
  # No hay migraciones válidas. En producción esto es un fallo duro: no queremos
  # perder datos con db push --accept-data-loss silenciosamente.
  if [ "${NODE_ENV:-}" = "production" ]; then
    echo "❌ ERROR: no hay migraciones de Prisma en formato estándar y NODE_ENV=production."
    echo "   Revisa prisma/migrations/*/migration.sql antes de desplegar."
    echo "   Nunca se cae a 'db push --accept-data-loss' en producción."
    exit 1
  fi

  echo "⚠️  No se encontraron migraciones válidas de Prisma (entorno no-prod)"
  echo "📦 Sincronizando schema con prisma db push (dev/staging)..."

  if prisma db push --accept-data-loss --skip-generate 2>&1; then
    echo "✅ Schema sincronizado"
    MIGRATION_SUCCESS=true
  else
    echo "⚠️  Error al sincronizar schema, continuando (revisa logs)"
  fi
fi

# Seed idempotente del RBAC (roles + permisos + backfill de User.roleId).
# La migración `add_rbac_dynamic` crea las tablas VACÍAS; esto las rellena con el
# catálogo (scripts/rbac-catalog.json). Es un upsert, seguro de repetir en cada
# arranque. No bloquea el inicio del servidor si falla.
if [ "$MIGRATION_SUCCESS" = true ] && [ -f "scripts/seed-rbac-prod.mjs" ]; then
  echo "🌱 Sembrando RBAC (roles y permisos, idempotente)..."
  if ALLOW_PROD=1 node scripts/seed-rbac-prod.mjs 2>&1; then
    echo "✅ RBAC sembrado"
  else
    echo "⚠️  Falló el seed de RBAC (continuando con el arranque; revisa logs)"
  fi
fi

# Seed idempotente del CATÁLOGO de referencia (planes SaaS, reglas fiscales,
# alérgenos, festivos, motivos de incidencia, OWASP, defaults de branding). Datos
# de configuración, NO datos ficticios. Upsert desde scripts/catalog-data.json.
if [ "$MIGRATION_SUCCESS" = true ] && [ -f "scripts/seed-catalog-prod.mjs" ]; then
  echo "🌱 Sembrando catálogo de referencia (idempotente)..."
  if ALLOW_PROD=1 node scripts/seed-catalog-prod.mjs 2>&1; then
    echo "✅ Catálogo sembrado"
  else
    echo "⚠️  Falló el seed de catálogo (continuando con el arranque; revisa logs)"
  fi
fi

# Seed idempotente del MODELO FINANCIERO (Business Plan): 3 escenarios de sistema
# (base/optimista/pesimista). Sin esto /admin/business-plan sale vacío en prod.
# Upsert por key; no pisa los supuestos si el usuario ya los editó.
if [ "$MIGRATION_SUCCESS" = true ] && [ -f "scripts/seed-finance-prod.mjs" ]; then
  echo "🌱 Sembrando modelo financiero (escenarios, idempotente)..."
  if ALLOW_PROD=1 node scripts/seed-finance-prod.mjs 2>&1; then
    echo "✅ Modelo financiero sembrado"
  else
    echo "⚠️  Falló el seed del modelo financiero (continuando con el arranque; revisa logs)"
  fi
fi

# Verificar que server.js existe
echo "🔍 Verificando archivos del servidor..."
if [ ! -f "server.js" ]; then
  echo "❌ ERROR: server.js no encontrado en $(pwd)"
  echo "   Verificando estructura del directorio..."
  echo "   Contenido del directorio actual:"
  ls -la
  echo ""
  echo "   Buscando server.js en subdirectorios..."
  find . -name "server.js" -type f 2>/dev/null || echo "   No se encontró server.js en ningún lugar"
  exit 1
fi

echo "✅ server.js encontrado"

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
  echo "⚠️  ADVERTENCIA: node_modules no encontrado"
  echo "   Esto puede causar problemas al iniciar el servidor"
else
  echo "✅ node_modules encontrado"
fi

# Iniciar el servidor Next.js
echo ""
echo "🌐 Iniciando servidor Next.js..."
echo "   Puerto: ${PORT:-3000}"
echo "   Hostname: ${HOSTNAME:-0.0.0.0}"
echo "   Archivo: server.js"
echo "   Ruta completa: $(pwd)/server.js"
echo ""

# Usar exec para que el proceso principal sea node
# Esto reemplaza el proceso shell con node, permitiendo que reciba señales correctamente
exec node server.js

