#!/bin/sh
set -e

echo "🚀 Iniciando aplicación..."

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

# Intentar ejecutar migraciones con reintentos
echo "📦 Ejecutando migraciones de Prisma..."
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "   Intento $((RETRY_COUNT + 1))/$MAX_RETRIES..."
  if prisma migrate deploy 2>&1; then
    echo "✅ Migraciones aplicadas correctamente"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⚠️  Intento $RETRY_COUNT falló, reintentando en 5 segundos..."
      sleep 5
    else
      echo ""
      echo "❌ ERROR: No se pudieron aplicar las migraciones después de $MAX_RETRIES intentos"
      echo ""
      echo "   Verifica que:"
      echo "   1. La base de datos PostgreSQL esté corriendo"
      echo "   2. DATABASE_URL sea correcta (usa la URL interna si estás en la misma red Docker)"
      echo "   3. El usuario tenga permisos para crear/modificar tablas"
      echo "   4. El host de la base de datos sea accesible desde el contenedor"
      echo ""
      echo "   URL configurada: ${DATABASE_URL%%@*}@***"
      exit 1
    fi
  fi
done

# Verificar que server.js existe
if [ ! -f "server.js" ]; then
  echo "❌ ERROR: server.js no encontrado"
  echo "   El build de Next.js en modo standalone debería generar server.js"
  echo "   Verificando estructura del directorio..."
  ls -la
  exit 1
fi

# Iniciar el servidor Next.js
echo "🌐 Iniciando servidor Next.js..."
echo "   Puerto: ${PORT:-3000}"
echo "   Hostname: ${HOSTNAME:-0.0.0.0}"
echo "   Archivo: server.js"

# Usar exec para que el proceso principal sea node
exec node server.js

