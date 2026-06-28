# ✅ Migración a shadcn/ui - Plan Completo

## 🎯 Objetivo

**Migrar TODA la plataforma a usar exclusivamente shadcn/ui. Eliminar cualquier componente HTML nativo o custom que duplique funcionalidad de shadcn.**

---

## 📋 Estado Actual

### ✅ Componentes YA Instalados

| Componente | Estado | Ruta |
|------------|--------|------|
| Button | ✅ Instalado | `/components/ui/button.tsx` |
| Input | ✅ Instalado | `/components/ui/input.tsx` |
| Label | ✅ Instalado | `/components/ui/label.tsx` |
| Textarea | ✅ Instalado | `/components/ui/textarea.tsx` |
| Select | ✅ Instalado | `/components/ui/select.tsx` |
| Checkbox | ✅ Instalado | `/components/ui/checkbox.tsx` |
| Badge | ✅ Instalado | `/components/ui/badge.tsx` |
| Card | ✅ Instalado | `/components/ui/card.tsx` |
| Table | ✅ Instalado | `/components/ui/table.tsx` |
| Tabs | ✅ Instalado | `/components/ui/tabs.tsx` |
| Dialog | ✅ Instalado | `/components/ui/dialog.tsx` |
| DropdownMenu | ✅ Instalado | `/components/ui/dropdown-menu.tsx` |
| Alert | ✅ Instalado | `/components/ui/alert.tsx` |
| Avatar | ✅ Instalado | `/components/ui/avatar.tsx` |
| Skeleton | ✅ Instalado | `/components/ui/skeleton.tsx` |
| Separator | ✅ Instalado | `/components/ui/separator.tsx` |
| Form | ✅ Instalado | `/components/ui/form.tsx` |

### ⏳ Componentes Pendientes (Recomendados)

| Componente | Prioridad | Uso |
|------------|-----------|-----|
| Sonner (Toast) | 🔥 Alta | Notificaciones (éxito, error, loading) |
| Sheet | 🔥 Alta | Sidebars, drawers, panels laterales |
| Command | 🟡 Media | Command palette, búsqueda rápida |
| Popover | 🟡 Media | Tooltips, mini-panels contextuales |
| Switch | 🟡 Media | Toggles (on/off) |
| Progress | 🟢 Baja | Barras de progreso, uploads |
| Calendar | 🟢 Baja | Selector de fechas |

---

## 🔄 Plan de Migración

### **FASE 1: Componentes Críticos (Alta Prioridad)**

#### ✅ 1.1 Login y Autenticación
- [x] `LoginForm.tsx` - ✅ **COMPLETADO**
- [ ] `forgot-password/page.tsx` - Pendiente
- [ ] `reset-password/page.tsx` - Pendiente
- [ ] `register/page.tsx` - Pendiente (si existe)

#### 1.2 Instalación de Componentes Adicionales
```bash
# Ejecutar script de instalación
./scripts/install-shadcn-components.sh
```

#### 1.3 Formularios Principales
- [ ] `CompanyForm.tsx` (ya usa shadcn, verificar 100%)
- [ ] `CateringWizard.tsx` (ya usa shadcn, verificar 100%)
- [ ] Cualquier otro formulario de creación/edición

---

### **FASE 2: Dashboard y Admin (Media Prioridad)**

#### 2.1 Páginas de Dashboard
- [ ] `/admin/page.tsx` - Dashboard principal
- [ ] `/admin/empresas/page.tsx` - Lista empresas
- [ ] `/admin/caterings/page.tsx` - Lista caterings

#### 2.2 Detalle Pages
- [ ] `/admin/empresas/[id]/page.tsx` - Detalle empresa
- [ ] `/admin/caterings/[id]/page.tsx` - Detalle catering

#### 2.3 Componentes Globales
- [ ] `AdminNavbar.tsx` - Verificar uso correcto
- [ ] `AdminSidebar.tsx` - Verificar uso correcto
- [ ] `QuickActionsPanel.tsx` - Verificar uso correcto

---

### **FASE 3: Componentes de Tablas y Listados**

#### 3.1 Tablas Principales
- [ ] `TenantsTable.tsx` - Verificar uso de shadcn Table
- [ ] `CateringsTable.tsx` - Verificar uso de shadcn Table
- [ ] Cualquier otra tabla custom

#### 3.2 Componentes de Card/KPI
- [ ] `CateringKPIs.tsx` - Verificar uso de shadcn Card
- [ ] `CateringsGlobalKPIs.tsx` - Verificar uso de shadcn Card
- [ ] Todos los componentes de métricas

---

### **FASE 4: Modales y Diálogos**

#### 4.1 Modales Existentes
- [ ] `UploadDocumentModal.tsx` - Verificar uso de shadcn Dialog
- [ ] Cualquier otro modal custom

#### 4.2 Confirmaciones y Alertas
- [ ] Reemplazar `window.confirm()` por Dialog de shadcn
- [ ] Usar `Alert` de shadcn para mensajes
- [ ] **Instalar y usar Sonner** para toast notifications

---

### **FASE 5: Páginas de Error y Estáticas**

- [ ] `/error.tsx`
- [ ] `/not-found.tsx`
- [ ] Páginas 404, 500, etc.

---

## 📝 Checklist de Migración por Página

Para cada página/componente, verificar:

- [ ] **NO** usa `<input>` nativo → Usar `<Input>`
- [ ] **NO** usa `<button>` nativo → Usar `<Button>`
- [ ] **NO** usa `<label>` nativo → Usar `<Label>`
- [ ] **NO** usa `<textarea>` nativo → Usar `<Textarea>`
- [ ] **NO** usa `<select>` nativo → Usar `<Select>`
- [ ] **NO** usa `<checkbox>` nativo → Usar `<Checkbox>`
- [ ] Usa `Alert` para mensajes de error
- [ ] Usa `Card` para contenedores
- [ ] Usa variantes de Button (no styling manual)
- [ ] Usa `Form` de shadcn con react-hook-form
- [ ] Usa `toast()` de Sonner para notificaciones

---

## 🚨 Errores Comunes a Buscar

### 1. HTML Nativo en lugar de shadcn

**Buscar con grep:**
```bash
# Buscar inputs nativos
grep -r "<input" app/ components/ --exclude-dir=node_modules

# Buscar buttons nativos
grep -r "<button" app/ components/ --exclude-dir=node_modules

# Buscar labels nativos
grep -r "<label" app/ components/ --exclude-dir=node_modules
```

### 2. Styling Manual en lugar de Variantes

**❌ MAL:**
```tsx
<button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
  Delete
</button>
```

**✅ BIEN:**
```tsx
<Button variant="destructive">
  Delete
</Button>
```

### 3. Componentes Custom Innecesarios

**❌ MAL:**
```tsx
export function CustomCard({ children }) {
  return (
    <div className="rounded-lg border p-4 bg-white shadow">
      {children}
    </div>
  )
}
```

**✅ BIEN:**
```tsx
import { Card, CardContent } from '@/components/ui/card'

<Card>
  <CardContent>
    {children}
  </CardContent>
</Card>
```

---

## 🔍 Herramientas de Verificación

### Script de Verificación

```bash
#!/bin/bash
# Verificar uso de HTML nativo

echo "🔍 Buscando HTML nativo en la plataforma..."
echo ""

echo "❌ Inputs nativos encontrados:"
grep -r "<input" app/ components/ --exclude-dir=node_modules --include="*.tsx" | wc -l

echo "❌ Buttons nativos encontrados:"
grep -r "<button" app/ components/ --exclude-dir=node_modules --include="*.tsx" | wc -l

echo "❌ Labels nativos encontrados:"
grep -r "<label" app/ components/ --exclude-dir=node_modules --include="*.tsx" | wc -l

echo "❌ Textareas nativos encontrados:"
grep -r "<textarea" app/ components/ --exclude-dir=node_modules --include="*.tsx" | wc -l

echo ""
echo "✅ Si todos los valores son 0, la migración está completa."
```

---

## 📦 Instalación de Componentes Faltantes

### Script Automatizado

```bash
# Ejecutar el script de instalación
chmod +x scripts/install-shadcn-components.sh
./scripts/install-shadcn-components.sh
```

### Manual (si prefieres instalar uno a uno)

```bash
# Sonner (Toast)
npx shadcn@latest add sonner

# Sheet (Sidebar/Drawer)
npx shadcn@latest add sheet

# Command (Command Palette)
npx shadcn@latest add command

# Popover
npx shadcn@latest add popover

# Switch
npx shadcn@latest add switch

# Progress
npx shadcn@latest add progress

# Calendar
npx shadcn@latest add calendar
```

---

## 🎨 Configuración de Sonner (Toast)

Después de instalar Sonner, agregar en el layout principal:

```tsx
// app/layout.tsx o app/(admin)/admin/layout.tsx
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster /> {/* Agregar esto */}
      </body>
    </html>
  )
}
```

**Uso:**
```tsx
import { toast } from 'sonner'

// Éxito
toast.success('Catering creado correctamente')

// Error
toast.error('Error al guardar los cambios')

// Loading
toast.loading('Guardando...')

// Info
toast.info('Recuerda completar todos los campos')
```

---

## ✅ Completado

| Fase | Estado | Fecha |
|------|--------|-------|
| Instalación inicial de componentes | ✅ | 2025-11-17 |
| Documento UI Guidelines | ✅ | 2025-11-17 |
| Script de instalación de componentes adicionales | ✅ | 2025-11-17 |
| LoginForm migrado a shadcn | ✅ | 2025-11-17 |
| Componentes adicionales instalados | ⏳ | Pendiente |
| Forgot/Reset Password migrados | ⏳ | Pendiente |
| Dashboard y Admin verificados | ⏳ | Pendiente |
| Tablas y listados verificados | ⏳ | Pendiente |
| Modales y diálogos verificados | ⏳ | Pendiente |
| Páginas de error migradas | ⏳ | Pendiente |

---

## 📚 Recursos

- **UI Guidelines:** `/docs/UI-GUIDELINES.md`
- **Documentación shadcn/ui:** https://ui.shadcn.com
- **Script de instalación:** `/scripts/install-shadcn-components.sh`

---

**Última actualización:** 2025-11-17
**Estado:** 🚧 En progreso

