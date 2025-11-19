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
        echo "   Continuando con el inicio del servidor..."
        echo "   Verifica los logs anteriores para más detalles"
      fi
    fi
  done
else
  # No hay migraciones válidas, usar db push para sincronizar el schema
  echo "⚠️  No se encontraron migraciones válidas de Prisma"
  echo "📦 Intentando sincronizar schema con prisma db push..."
  
  if prisma db push --accept-data-loss --skip-generate 2>&1; then
    echo "✅ Schema sincronizado correctamente"
    MIGRATION_SUCCESS=true
  else
    echo "⚠️  Error al sincronizar schema, pero continuando..."
    echo "   Esto puede ser normal si la base de datos ya está actualizada"
  fi
fi

# Verificar si la base de datos está vacía y ejecutar seed
echo "🔍 Verificando si la base de datos necesita datos iniciales..."
TENANT_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.tenant.count().then(count => {
    console.log(count);
    prisma.\$disconnect();
  }).catch(err => {
    console.log('0');
    prisma.\$disconnect();
  });
" 2>/dev/null || echo "0")

if [ "$TENANT_COUNT" = "0" ]; then
  echo "📦 Base de datos vacía, ejecutando seed..."
  if [ -f "prisma/seed.ts" ]; then
    # Usar tsx de node_modules local
    if [ -f "node_modules/.bin/tsx" ]; then
      echo "   Ejecutando seed con tsx..."
      node_modules/.bin/tsx prisma/seed.ts 2>&1 || echo "   ⚠️  Error al ejecutar seed, pero continuando..."
    else
      echo "   ⚠️  tsx no encontrado en node_modules"
      echo "   Puedes ejecutarlo manualmente conectándote al contenedor y ejecutando: npm run db:seed"
    fi
  else
    echo "   ⚠️  Archivo seed.ts no encontrado"
  fi
else
  echo "✅ Base de datos ya contiene $TENANT_COUNT tenant(s)"
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

