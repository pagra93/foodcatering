# 🔴 PROBLEMAS DE QUERIES PRISMA - Análisis Completo

**Fecha**: 2025-11-21
**Estado**: Análisis completado, pendiente corrección

---

## 📋 RESUMEN EJECUTIVO

Se detectaron **múltiples incompatibilidades** entre las queries de Prisma y el schema actual, causando errores en los 3 portales (Empresa, Catering, Empleado).

---

## 🏢 PORTAL EMPRESA (acme.sintupper.com)

### 1. Incident.description NO EXISTE
**Archivos afectados**:
- `lib/db/queries/empresa-incidencias.ts` (línea 157)
- `lib/db/queries/empresa-catering.ts` (línea 335)
- `lib/db/queries/empresa-pedidos.ts` (línea 203)

**Schema real**:
```prisma
model Incident {
  type     String // Sí existe
  severity IncidentSeverity
  status   IncidentStatus
  openedBy   String
  assignedTo String?
  resolution Json? // {type, amount, details}
  // ❌ NO HAY description
}
```

**Solución**: Eliminar `description: true` de todos los selects.

---

### 2. CompanyCateringAssignment.restaurant NO EXISTE
**Archivos afectados**:
- `lib/db/queries/empresa-catering.ts` (línea 22, 111)

**Schema real**:
```prisma
model CompanyCateringAssignment {
  tenantCatering String
  // ❌ NO HAY relación directa "restaurant"
}
```

**Solución**: Obtener el `Restaurant` aparte usando `tenantCatering`:
```typescript
// Primero obten assignment
const assignment = await prisma.companyCateringAssignment.findFirst({...})

// Luego obten restaurant por su tenantId
const restaurant = await prisma.restaurant.findUnique({
  where: { tenantId: assignment.tenantCatering }
})
```

---

### 3. Dish.description NO EXISTE
**Archivos afectados**:
- `lib/db/queries/empresa-catering.ts` (línea 147)

**Schema real**:
```prisma
model Dish {
  name         String
  course       DishCourse
  labels       Json
  nutrition    Json
  basePrice    Decimal
  // ❌ NO HAY description
}
```

**Solución**: Eliminar `description: true`.

---

## 🍴 PORTAL CATERING (deliciasexpress.sintupper.com)

### 4. Dish.ingredients NO EXISTE
**Archivos afectados**:
- `lib/db/queries/catering-menus.ts` (líneas 101, 136)
- `lib/db/queries/catering-dishes.ts` (líneas 37, 108, 173, 209, 221, 284, 375, 387)

**Schema real**:
```prisma
model Dish {
  name         String
  course       DishCourse
  labels       Json      // Incluye alérgenos
  nutrition    Json
  basePrice    Decimal
  // ❌ NO HAY ingredients
}
```

**Solución**: Usar `labels` para alérgenos, eliminar referencias a `ingredients`.

---

### 5. Order.tenantId NO EXISTE
**Archivos afectados**:
- `lib/db/queries/catering-production.ts` (línea 21 y múltiples más)

**Schema real**:
```prisma
model Order {
  tenantEmpresa  String
  tenantCatering String
  // ❌ NO HAY tenantId
}
```

**Solución**: Cambiar `tenantId` a `tenantCatering` en todas las queries del catering.

---

### 6. Order.dishSelection relación NO EXISTE
**Archivos afectados**:
- `lib/db/queries/catering-production.ts` (línea 30)

**Schema real**:
```prisma
model Order {
  selection Json // ❌ NO es una relación, es JSON
  // Relaciones:
  history        OrderHistory[]
  deliveryEvents DeliveryEvent[]
  incidents      Incident[]
  deliveryProof  DeliveryProof?
  rating         OrderRating?
}
```

**Solución**: Eliminar `include: { dishSelection: true }`, usar el campo `selection` (JSON).

---

### 7. Order.employee relación NO EXISTE
**Archivos afectados**:
- `lib/db/queries/catering-production.ts` (línea 31-35)

**Schema real**:
```prisma
model Order {
  employeeId     String
  // ❌ NO HAY relación "employee"
}
```

**Solución**: Obtener empleado aparte si es necesario.

---

## 👤 PORTAL EMPLEADO

### 8. `/api/empleado/alergenos` - Tenant not found
**Error**: Busca tenant ID `1775ba35-9025-4f63-accc-05f4dea7cc92` que NO existe.

**Posibles causas**:
1. Cookie/session antigua con tenant ID viejo
2. Middleware no resolviendo tenant correctamente desde subdomain
3. Hardcoded tenant ID en algún lugar

**Solución**: Revisar cómo se resuelve el tenant en `/api/empleado/*` routes.

---

## ⚠️ GENERAL - TODOS LOS PORTALES

### 9. Event handlers in Client Component props
**Error**: Componentes sin `'use client'` directiva.

**Archivos afectados** (probables):
- Componentes UI de shadcn adicionales
- Componentes custom con onClick, onChange, etc.

**Solución**: Agregar `'use client'` al inicio de cada componente interactivo.

---

### 10. Redirect a `/unauthorized` en primer login
**Comportamiento**: Al hacer login, redirige a `/unauthorized`, luego "volver" funciona.

**Posibles causas**:
1. `middleware.ts` verificando permisos antes de que la session se establezca
2. Layout verificando roles sin esperar session completa
3. Race condition entre NextAuth y verificación de acceso

**Solución**: Revisar `app/(empresa)/layout.tsx` y `middleware.ts`.

---

## 📊 ESTADÍSTICAS

| Categoría | Archivos Afectados | Errores |
|-----------|-------------------|---------|
| Portal Empresa | 3 | 4 tipos |
| Portal Catering | 3 | 4 tipos |
| Portal Empleado | 1+ | 1 tipo |
| General | múltiples | 2 tipos |
| **TOTAL** | **~10+ archivos** | **10 tipos** |

---

## ✅ PLAN DE CORRECCIÓN

### Prioridad 1 (Crítico - Bloquea funcionalidad)
1. ✅ Corregir `Incident` queries (eliminar `description`)
2. ✅ Corregir `Dish` queries (eliminar `ingredients`, `description`)
3. ✅ Corregir `Order` queries catering (`tenantId` → `tenantCatering`, eliminar relaciones inexistentes)
4. ✅ Corregir `CompanyCateringAssignment` (obtener restaurant por separado)

### Prioridad 2 (Alto - Afecta UX)
5. ⚠️ Investigar redirect a `/unauthorized`
6. ⚠️ Arreglar portal empleado (404 + API)

### Prioridad 3 (Medio - Warnings)
7. ℹ️ Agregar `'use client'` a componentes faltantes

---

## 🚀 PRÓXIMOS PASOS

1. **Corregir queries Prisma** (Prioridad 1)
2. **Commit y push** a GitHub
3. **Redeploy en Coolify**
4. **Probar cada portal** sistemáticamente
5. **Abordar Prioridad 2** (unauthorized, portal empleado)
6. **Limpiar warnings** (Prioridad 3)


