#!/bin/bash
# Script para resetear la base de datos y ejecutar seed

echo "🗑️  Reseteando base de datos..."

# Reset usando Prisma
npx prisma migrate reset --force --skip-seed

echo "✅ Base de datos limpia"
echo "🌱 Ejecutando seed..."

# Ejecutar seed
npm run db:seed

echo "✅ Seed completado"

