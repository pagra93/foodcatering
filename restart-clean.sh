#!/bin/bash

echo "🧹 Limpiando completamente..."

# 1. Matar TODOS los procesos de Node/Next.js
echo "1️⃣ Deteniendo procesos Node..."
pkill -f "node.*next" || true
pkill -f "next-server" || true
sleep 2

# 2. Limpiar cache de Next.js
echo "2️⃣ Limpiando cache Next.js..."
rm -rf .next

# 3. Limpiar cache de Prisma
echo "3️⃣ Limpiando cache Prisma..."
rm -rf node_modules/.prisma

# 4. Regenerar Prisma
echo "4️⃣ Regenerando cliente Prisma..."
npx prisma generate

# 5. Esperar un poco
echo "5️⃣ Esperando..."
sleep 1

echo ""
echo "✅ Limpieza completa!"
echo ""
echo "🚀 Ahora ejecuta: pnpm dev"
echo ""

