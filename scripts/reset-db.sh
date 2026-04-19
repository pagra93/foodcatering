#!/usr/bin/env bash
# Script para resetear la base de datos y ejecutar seed.
# USO EXCLUSIVO DE DESARROLLO — NUNCA SE EJECUTA EN PRODUCCIÓN.

set -euo pipefail

if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "❌ Este script NO se puede ejecutar con NODE_ENV=production"
  echo "   Borrar datos en producción requiere un proceso dedicado con backup previo."
  exit 1
fi

# Guardia por nombre de BD en el DATABASE_URL — cazar cualquier cosa con "prod"
# (ej: comidas_prod, foodcatering_prod, db-prod.x.internal, etc.)
DB_NAME=$(echo "${DATABASE_URL:-}" | sed -nE 's|.*/([^/?]+)(\?.*)?$|\1|p')
if [[ "$DB_NAME" == *prod* ]] || [[ "${DATABASE_URL:-}" == *".prod."* ]] || [[ "${DATABASE_URL:-}" == *"prod-"* ]]; then
  echo "❌ DATABASE_URL apunta a una base con 'prod' en el nombre ($DB_NAME)."
  echo "   Este script es solo para dev. Abortando."
  exit 1
fi

echo "🗑️  Reseteando base de datos (dev)..."
npx prisma migrate reset --force --skip-seed

echo "✅ Base de datos limpia"
echo "🌱 Ejecutando seed..."
pnpm db:seed

echo "✅ Seed completado"
