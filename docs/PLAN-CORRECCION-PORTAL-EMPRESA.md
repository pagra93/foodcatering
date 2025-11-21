# 🚀 PLAN DE CORRECCIÓN - PORTAL EMPRESA

**Objetivo**: Hacer funcional el portal empresa paso a paso  
**Metodología**: Análisis → Corrección → Verificación → Deploy

---

## 📋 CHECKLIST GENERAL

### ✅ COMPLETADO
- [x] Análisis exhaustivo de problemas
- [x] Corrección queries Prisma portal empresa (Incident, Dish, CompanyCateringAssignment)
- [x] Commit y push de correcciones iniciales

### 🔄 EN PROGRESO
- [ ] Corrección queries Prisma portal catering
- [ ] Verificación de rutas existentes
- [ ] Corrección de problemas críticos

---

## 🎯 PLAN DE EJECUCIÓN

### **SPRINT 1: CORRECCIONES PRISMA CATERING** ⏱️ 15 min

**Archivos a corregir**:
1. `lib/db/queries/catering-menus.ts` - Eliminar `Dish.ingredients`
2. `lib/db/queries/catering-dishes.ts` - Eliminar `Dish.ingredients`
3. `lib/db/queries/catering-production.ts` - Cambiar `Order.tenantId` → `tenantCatering`, eliminar relaciones

**Acciones**:
```bash
# 1. Corregir archivos (usando search_replace)
# 2. git add -A && git commit -m "fix: corregir queries Prisma portal catering"
# 3. git push origin main
```

**Output esperado**: ✅ Queries catering sin errores

---

### **SPRINT 2: MAPEO DE RUTAS EXISTENTES** ⏱️ 5 min

**Objetivo**: Identificar qué rutas existen y cuáles faltan

**Comando**:
```bash
find app/\(empresa\)/empresa -name "page.tsx" -o -name "layout.tsx"
```

**Output esperado**: Lista completa de rutas

**Análisis**:
- ✅ Rutas que existen
- ❌ Rutas que faltan (404)
- ⚠️ Rutas con errores

---

### **SPRINT 3: CORRECCIÓN CONFIGURACIÓN** ⏱️ 30 min 🔴

**Problema**: "No se pudo cargar la configuración"

**Pasos**:
1. **Verificar API routes**:
   - `app/api/empresa/configuracion/plan/route.ts`
   - `app/api/empresa/configuracion/preferencias/route.ts`
   
2. **Revisar queries**:
   - `lib/db/queries/empresa-configuracion.ts`
   - Verificar que TODOS los campos existan en schema

3. **Probar componentes**:
   - `app/(empresa)/empresa/configuracion/page.tsx`
   - Componentes hijos (tabs)

4. **Testing**:
   ```bash
   # Acceder a acme.sintupper.com/empresa/configuracion
   # Verificar que carga datos
   ```

**Criterio de éxito**: ✅ Página de configuración muestra datos sin errores

---

### **SPRINT 4: CORRECCIÓN EMPLEADOS** ⏱️ 50 min 🔴

#### 4A. Ver Detalle de Empleado (15 min)

**Pasos**:
1. Verificar si existe: `app/(empresa)/empresa/empleados/[id]/page.tsx`
2. Si NO existe → **Crear página**
3. Si existe → **Corregir queries**

**Página necesita**:
- Datos básicos del empleado
- Historial de pedidos
- Alergias/preferencias
- Estadísticas (pedidos totales, cancelaciones, etc.)

#### 4B. Editar Empleado (20 min)

**Pasos**:
1. Verificar ruta: `app/(empresa)/empresa/empleados/[id]/editar/page.tsx`
2. Si NO existe → **Crear página con formulario**
3. Conectar con API: `app/api/empresa/empleados/[id]/route.ts` (PUT)

**Formulario necesita**:
- Departamento
- Alergias
- Preferencias dietéticas
- Límite mensual
- Estado (activo/suspendido)

#### 4C. Suspender Empleado (15 min)

**Pasos**:
1. Verificar API: `app/api/empresa/empleados/[id]/suspender/route.ts`
2. Si NO existe → **Crear endpoint**
3. Actualizar componente tabla:
   - Agregar `'use client'`
   - Implementar onClick con loading/error states
   - Refresh de datos después de éxito

**Criterio de éxito**: ✅ Todas las acciones de empleados funcionan

---

### **SPRINT 5: CREAR RUTAS FALTANTES (BÁSICAS)** ⏱️ 40 min 🟢

**Objetivo**: Evitar 404s, crear páginas placeholder

#### 5A. Facturación (10 min)
```tsx
// app/(empresa)/empresa/facturacion/page.tsx
export default function FacturacionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Facturación</h1>
      <p>Resumen de facturas mensuales, estado de pagos, descargas.</p>
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Funcionalidad en desarrollo</p>
      </div>
    </div>
  )
}
```

#### 5B. Incidencias (10 min)
Similar estructura, mostrar lista de incidencias

#### 5C. Auditoría Fiscal (10 min)
Similar estructura, mostrar snapshots/reportes

#### 5D. Actividad (10 min)
Similar estructura, mostrar logs de auditoría

**Criterio de éxito**: ✅ Ningún link del menú da 404

---

### **SPRINT 6: DUAL-ROLE PARA RRHH** ⏱️ 30 min 🟢

**Objetivo**: Usuario RRHH puede acceder a portal empleado

#### 6A. Modificar Seed (10 min)

```typescript
// prisma/seed.ts
// Crear Employee para usuario RRHH
const rrhhEmployee = await prisma.employee.create({
  data: {
    tenantId: empresaTenant.id,
    userId: rrhhUser.id,
    siteId: site.id,
    department: 'Recursos Humanos',
    dietPrefs: { /* ... */ },
    status: 'ACTIVE',
  },
})
```

#### 6B. Permitir Acceso Dual (15 min)

```typescript
// app/(empresa)/layout.tsx
// Verificar si el usuario TAMBIÉN es empleado
const employee = await prisma.employee.findFirst({
  where: { userId: session.user.id }
})

// Si es empleado, mostrar botón "Ver como empleado" en navbar
```

#### 6C. Navbar Switcher (5 min)

```tsx
{isEmployee && (
  <Link href="/empleado">
    <Button variant="outline">🍽️ Portal Empleado</Button>
  </Link>
)}
```

**Criterio de éxito**: ✅ RRHH puede pedir comida como empleado

---

## 📦 DEPLOY STRATEGY

### Deploy 1: Después de Sprint 1
- Correcciones Prisma catering
- Verificar que ambos portales no tengan errores Prisma

### Deploy 2: Después de Sprint 3 + 4
- Configuración + Empleados funcionando
- Funcionalidad core operativa

### Deploy 3: Después de Sprint 5 + 6
- Todas las rutas creadas
- Dual-role implementado

---

## ✅ CRITERIOS DE ÉXITO FINAL

| Funcionalidad | Criterio de Éxito |
|---------------|-------------------|
| **Configuración** | Carga y guarda datos correctamente |
| **Empleados** | Ver, editar, suspender funciona |
| **Pedidos** | Ver detalle funciona (ya corregido) |
| **Catering** | Carga datos sin errores (ya corregido) |
| **Facturación** | Página existe (aunque sea placeholder) |
| **Incidencias** | Página existe |
| **Auditoría** | Página existe |
| **Actividad** | Página existe |
| **Dual-Role** | RRHH puede pedir comida |

---

## 🚨 ROLLBACK PLAN

Si algo falla en deploy:
1. Verificar logs en Coolify
2. Identificar commit problemático
3. `git revert <commit-hash>`
4. Push y redeploy
5. Continuar con fix en branch separado

---

## 📊 TRACKING

**Inicio**: 2025-11-21 (ahora)  
**Estimación Total**: ~2.5 horas  
**Progreso**: 15% (Sprint 1 en progreso)


