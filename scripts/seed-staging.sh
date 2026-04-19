#!/usr/bin/env bash
# Script para ejecutar seed en ENTORNO DE STAGING.
#
# ⚠️  Este script es DESTRUCTIVO: reset + db push + seed. No se debe ejecutar jamás
# contra la BD de producción. La confirmación interactiva protege de ejecuciones
# manuales, pero el bloqueo por NODE_ENV/DATABASE_URL es la defensa real.
#
# Uso: DATABASE_URL="..." ./scripts/seed-staging.sh

set -euo pipefail

if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "❌ Este script NO se puede ejecutar con NODE_ENV=production"
  exit 1
fi

DB_NAME=$(echo "${DATABASE_URL:-}" | sed -nE 's|.*/([^/?]+)(\?.*)?$|\1|p')
if [[ "$DB_NAME" == *prod* ]] || [[ "${DATABASE_URL:-}" == *".prod."* ]] || [[ "${DATABASE_URL:-}" == *"prod-"* ]]; then
  echo "❌ DATABASE_URL apunta a una base con 'prod' en el nombre ($DB_NAME)."
  echo "   Este script es solo para staging/dev. Abortando."
  exit 1
fi

echo "🌱 Ejecutando seed en STAGING..."
echo ""
echo "⚠️  ADVERTENCIA: Este script BORRARÁ TODOS los datos existentes"
echo "   y creará datos nuevos."
echo ""
read -p "¿Estás seguro? (escribe 'si' para continuar): " confirmacion

if [ "$confirmacion" != "si" ]; then
  echo "❌ Operación cancelada"
  exit 1
fi

echo ""
echo "🗑️  Reseteando base de datos..."
npx prisma migrate reset --force --skip-seed

echo ""
echo "📦 Sincronizando schema..."
npx prisma db push --accept-data-loss

echo ""
echo "🌱 Ejecutando seed..."
pnpm db:seed

echo ""
echo "✅ ¡Seed completado!"
echo ""
echo "🔗 Credenciales:"
echo "   Admin: admin@sintupper.com / Admin123!"
echo "   ACME RRHH: rrhh@acme.com / Rrhh123!"
echo "   Empleado: laura.gomez@acme.com / Empleado123!"
echo "   Chef: chef@deliciasexpress.com / Chef123!"
echo ""
