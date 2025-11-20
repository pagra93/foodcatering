#!/bin/bash

# Script para ejecutar seed en producción
# Uso: DATABASE_URL="..." ./scripts/seed-production.sh

set -e

echo "🌱 Ejecutando seed en producción..."
echo ""
echo "⚠️  ADVERTENCIA: Este script borrará TODOS los datos existentes"
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
npm run db:seed

echo ""
echo "✅ ¡Seed completado!"
echo ""
echo "🔗 Credenciales:"
echo "   Admin: admin@sintupper.com / Admin123!"
echo "   ACME RRHH: rrhh@acme.com / Rrhh123!"
echo "   Empleado: laura.gomez@acme.com / Empleado123!"
echo "   Chef: chef@deliciasexpress.com / Chef123!"
echo ""

