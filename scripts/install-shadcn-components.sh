#!/bin/bash

# 🎨 Script para instalar componentes adicionales de shadcn/ui

echo "🎨 Instalando componentes adicionales de shadcn/ui..."
echo ""

# 1. Toast / Sonner (Notificaciones)
echo "📢 1/7 - Instalando Sonner (Toast notifications)..."
npx shadcn@latest add sonner --yes

# 2. Sheet (Sidebar/Drawer)
echo "📂 2/7 - Instalando Sheet (Sidebar/Drawer)..."
npx shadcn@latest add sheet --yes

# 3. Command (Command Palette / Search)
echo "🔍 3/7 - Instalando Command (Command Palette)..."
npx shadcn@latest add command --yes

# 4. Popover (Tooltips mejorados)
echo "💬 4/7 - Instalando Popover..."
npx shadcn@latest add popover --yes

# 5. Switch (Toggle)
echo "🔘 5/7 - Instalando Switch..."
npx shadcn@latest add switch --yes

# 6. Progress (Barra de progreso)
echo "📊 6/7 - Instalando Progress..."
npx shadcn@latest add progress --yes

# 7. Calendar (Selector de fechas)
echo "📅 7/7 - Instalando Calendar..."
npx shadcn@latest add calendar --yes

echo ""
echo "✅ Instalación completa!"
echo ""
echo "📚 Nuevos componentes disponibles:"
echo "  - Sonner (toast) para notificaciones"
echo "  - Sheet para sidebars/drawers"
echo "  - Command para command palettes"
echo "  - Popover para tooltips"
echo "  - Switch para toggles"
echo "  - Progress para barras de progreso"
echo "  - Calendar para selección de fechas"
echo ""
echo "📖 Consulta docs/UI-GUIDELINES.md para más información."

