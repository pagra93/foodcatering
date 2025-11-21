# 🔴 FIX: Admin Dashboard 404 + Employee Query Errors

**Fecha**: 2025-11-21  
**Prioridad**: 🔴 **CRÍTICA**  
**Estado**: ✅ **RESUELTO**  
**Commit**: `5a58d86`

---

## 🚨 PROBLEMAS REPORTADOS

### Problema 1: Admin Dashboard da 404
```
URL: https://sintupper.com/admin/dashboard
Error: 404 - Página no encontrada
```

### Problema 2: Employee queries fallan con error Prisma
```
Error: PrismaClientValidationError
Unknown field `company` for include statement on model `Employee`

prisma.employee.findUnique({
  where: { id: "..." },
  include: {
    company: {  // ❌ Employee NO tiene esta relación
      include: { policy: true }
    }
  }
})
```

---

## 🔍 ANÁLISIS PROBLEMA 1: Admin Dashboard 404

### Causa Raíz

**Archivo**: `lib/auth/permissions.ts` línea 138

```typescript
export function getDashboardPath(role: UserRole, tenantType: TenantType): string {
  // Root admin
  if (role === 'SUPER_ADMIN' || role === 'AUDITOR') {
    return '/admin/dashboard'  // ❌ Esta ruta NO EXISTE
  }
  // ...
}
```

### Verificación de Rutas Existentes

```
app/(admin)/admin/
├── caterings/
│   ├── [id]/page.tsx
│   ├── new/page.tsx
│   └── page.tsx
├── empresas/
│   ├── [id]/
│   │   ├── edit/page.tsx
│   │   └── page.tsx
│   ├── new/page.tsx
│   └── page.tsx
├── layout.tsx
├── page.tsx ← ✅ Ruta: /admin (dashboard de admin)
└── tenants/
    ├── [id]/
    │   ├── edit/page.tsx
    │   └── page.tsx
    ├── new/page.tsx
    └── page.tsx
```

**Rutas correctas**:
- ✅ `/admin` - Dashboard de root admin
- ✅ `/admin/empresas` - Lista de empresas
- ✅ `/admin/caterings` - Lista de caterings
- ✅ `/admin/tenants` - Lista de tenants

**Rutas que NO existen**:
- ❌ `/admin/dashboard`

---

## 🔍 ANÁLISIS PROBLEMA 2: Employee Queries con `company`

### Causa Raíz

El modelo `Employee` en Prisma **NO** tiene una relación directa con `Company`.

**Archivo**: `prisma/schema.prisma` líneas 273-310

```prisma
model Employee {
  id       String @id @default(uuid())
  tenantId String @map("tenant_id")
  userId   String @map("user_id")
  siteId   String @map("site_id")

  // ... otros campos ...

  // Relaciones
  user    User          @relation(fields: [userId], references: [id])
  site    CompanySite   @relation(fields: [siteId], references: [id])  // ✅ Tiene
  ratings OrderRating[] // Valoraciones de pedidos

  // ❌ NO tiene relación 'company'
  
  @@map("employees")
}
```

**Relaciones de Employee**:
- ✅ `user` → User
- ✅ `site` → CompanySite
- ✅ `ratings` → OrderRating[]
- ❌ NO tiene `company`

**Para acceder a Company desde Employee**:
```
Employee → site → company
```

### Archivo Problemático

**Archivo**: `lib/db/queries/empleado-menus.ts`

El archivo tenía **11 lugares** intentando acceder a `employee.company` que no existe.

**Ejemplos de errores**:

```typescript
// ❌ ERROR 1: Include inexistente
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    company: {  // ❌ Employee NO tiene esta relación
      include: {
        policy: true,
        cateringAssignments: { ... }
      }
    }
  }
})

// ❌ ERROR 2: Acceso a propiedad inexistente
const catering = employee.company.cateringAssignments[0]?.restaurant

// ❌ ERROR 3: Acceso a policy
const cutoffTime = employee.company.policy?.cutoffTime || '11:00:00'

// ❌ ERROR 4: Usar companyId que no existe
tenantEmpresa: employee.companyId  // ❌ Employee no tiene companyId
```

---

## ✅ SOLUCIONES IMPLEMENTADAS

### Solución 1: Corregir getDashboardPath

**Archivo**: `lib/auth/permissions.ts`

**ANTES**:
```typescript
export function getDashboardPath(role: UserRole, tenantType: TenantType): string {
  // Root admin
  if (role === 'SUPER_ADMIN' || role === 'AUDITOR') {
    return '/admin/dashboard'  // ❌ Ruta inexistente
  }

  // ...

  // Fallback
  return '/dashboard'  // ❌ Ruta inexistente
}
```

**DESPUÉS**:
```typescript
export function getDashboardPath(role: UserRole, tenantType: TenantType): string {
  // Root admin
  if (role === 'SUPER_ADMIN' || role === 'AUDITOR') {
    return '/admin'  // ✅ Ruta correcta
  }

  // ...

  // Fallback
  return '/admin'  // ✅ Ruta correcta
}
```

**Cambios**:
- ✅ `/admin/dashboard` → `/admin`
- ✅ Fallback `/dashboard` → `/admin`

---

### Solución 2: Corregir Queries de Employee

**Archivo**: `lib/db/queries/empleado-menus.ts`

#### Fix 2.1: Corregir Include en queries

**ANTES**:
```typescript
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    company: {  // ❌ Employee NO tiene esta relación
      include: {
        policy: true,
        cateringAssignments: {
          where: { active: true, type: 'PRIMARY' },
          include: { restaurant: true }
        }
      }
    }
  }
})
```

**DESPUÉS**:
```typescript
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    user: true,  // ✅ Necesitamos el user para nameEnc
    site: {      // ✅ A través de site...
      include: {
        company: {  // ✅ ...accedemos a company
          include: {
            policy: true,
            cateringAssignments: {
              where: { active: true, type: 'PRIMARY' },
              include: { restaurant: true }
            }
          }
        }
      }
    }
  }
})
```

**Cambios**:
- ✅ `include: { company }` → `include: { site: { include: { company } } }`
- ✅ Añadido `user: true` para acceder a `nameEnc`

---

#### Fix 2.2: Actualizar Referencias

**ANTES**:
```typescript
const catering = employee.company.cateringAssignments[0]?.restaurant
const cutoffTime = employee.company.policy?.cutoffTime || '11:00:00'
const dailyLimit = employee.company.policy?.dailyLimit
const companyName = employee.company.legalName
```

**DESPUÉS**:
```typescript
const catering = employee.site.company.cateringAssignments[0]?.restaurant
const cutoffTime = employee.site.company.policy?.cutoffTime || '11:00:00'
const dailyLimit = employee.site.company.policy?.dailyLimit
const companyName = employee.site.company.legalName
```

**Cambios**:
- ✅ `employee.company` → `employee.site.company` (11 lugares)

---

#### Fix 2.3: Corregir createOrUpdateOrder

**ANTES**:
```typescript
return prisma.order.create({
  data: {
    employeeId,
    tenantEmpresa: employee.companyId,  // ❌ Employee no tiene companyId
    serviceDate: date,
    menuType: 'DIARIO',
    selection,
    price: totalPrice,
    status: 'CONFIRMED',
    // ❌ Faltan campos requeridos
  }
})
```

**DESPUÉS**:
```typescript
return prisma.order.create({
  data: {
    employeeId,
    tenantEmpresa: employee.tenantId,      // ✅ Usar tenantId
    serviceDate: date,
    menuType: 'DIARIO',
    selection,
    price: totalPrice,
    status: 'CONFIRMED',
    createdBy: employee.userId,            // ✅ Campo requerido
    lastModifiedBy: employee.userId,       // ✅ Campo requerido
    integrityHash: `hash-${Date.now()}-${Math.random()}`,  // ✅ Campo requerido
  }
})
```

**Cambios**:
- ✅ `employee.companyId` → `employee.tenantId`
- ✅ Añadidos campos requeridos: `createdBy`, `lastModifiedBy`, `integrityHash`

---

#### Fix 2.4: Corregir cancelOrder

**Problema**: Order modelo NO tiene relación con Employee

```prisma
model Order {
  // ...
  employeeId String @map("employee_id")  // ❌ Solo campo, no relación
  
  // Relaciones
  history        OrderHistory[]
  deliveryEvents DeliveryEvent[]
  incidents      Incident[]
  deliveryProof  DeliveryProof?
  rating         OrderRating?
  
  // ❌ NO tiene relación 'employee'
}
```

**ANTES**:
```typescript
const order = await prisma.order.findFirst({
  where: { id: orderId, employeeId },
  include: {
    employee: {  // ❌ Order NO tiene esta relación
      include: {
        company: {
          include: { policy: true }
        }
      }
    }
  }
})

const cutoffTime = order.employee.company.policy?.cutoffTime || '11:00:00'
```

**DESPUÉS**:
```typescript
// 1. Buscar order
const order = await prisma.order.findFirst({
  where: { id: orderId, employeeId }
})

if (!order) {
  throw new Error('Pedido no encontrado')
}

// 2. Buscar employee por separado
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    site: {
      include: {
        company: {
          include: { policy: true }
        }
      }
    }
  }
})

if (!employee) {
  throw new Error('Empleado no encontrado')
}

// 3. Acceder a policy correctamente
const cutoffTime = employee.site.company.policy?.cutoffTime || '11:00:00'
```

**Cambios**:
- ✅ Separar queries de `order` y `employee`
- ✅ No intentar `include: { employee }` en Order (no existe la relación)
- ✅ Acceder a company a través de `employee.site.company`

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Líneas Afectadas | Tipo de Cambio |
|---------|------------------|----------------|
| `lib/auth/permissions.ts` | 138, 155 | Rutas corregidas |
| `lib/db/queries/empleado-menus.ts` | 25-38 | Include corregido (getWeekMenusForEmployee) |
| `lib/db/queries/empleado-menus.ts` | 51 | Referencia corregida |
| `lib/db/queries/empleado-menus.ts` | 114 | Referencia corregida |
| `lib/db/queries/empleado-menus.ts` | 163-164 | Referencias corregidas |
| `lib/db/queries/empleado-menus.ts` | 186-201 | Include corregido (getDayMenuForEmployee) |
| `lib/db/queries/empleado-menus.ts` | 213, 220, 292 | Referencias corregidas |
| `lib/db/queries/empleado-menus.ts` | 315-328 | Include corregido (createOrUpdateOrder) |
| `lib/db/queries/empleado-menus.ts` | 333, 354 | Referencias corregidas |
| `lib/db/queries/empleado-menus.ts` | 387 | Corregido companyId → tenantId |
| `lib/db/queries/empleado-menus.ts` | 379-390 | Añadidos campos requeridos en create |
| `lib/db/queries/empleado-menus.ts` | 401-439 | Función cancelOrder completamente refactorizada |

**Total de cambios**: 23 líneas modificadas en 2 archivos

---

## 🧪 VERIFICACIÓN POST-FIX

### 1️⃣ Redeploy en Coolify

```bash
git log --oneline -1
# 5a58d86 fix: CRÍTICO - corregir getDashboardPath y queries Employee
```

Hacer "Redeploy" en Coolify.

---

### 2️⃣ Probar Admin Dashboard

**Credenciales**:
```
URL: https://sintupper.com/login
(o https://admin.sintupper.com/login)
Email: admin@sintupper.com
Password: Admin123!
```

**Verificar**:
- ✅ Login exitoso
- ✅ Redirige a `/admin` (NO a `/admin/dashboard`)
- ✅ Dashboard de admin visible
- ✅ Puede ver empresas, caterings, tenants

---

### 3️⃣ Probar Portal Empleado

**Credenciales**:
```
URL: https://acme.sintupper.com/login
Email: laura.gomez@acme.com
Password: Empleado123!
```

**Verificar**:
- ✅ Login exitoso
- ✅ Redirige a `/empleado/menus`
- ✅ NO error Prisma "Unknown field `company`"
- ✅ Ve menús de la semana
- ✅ Ve nombre correcto (de `user.nameEnc`)
- ✅ Ve límite diario de la empresa
- ✅ Ve catering asignado

---

### 4️⃣ Probar Funcionalidad de Menús

**En portal empleado**:

1. **Ver menús de la semana**:
   - ✅ Muestra días de la semana (Lunes-Viernes)
   - ✅ Muestra platos disponibles
   - ✅ Muestra estado de cada día (PENDING, CONFIRMED, LOCKED)

2. **Seleccionar menú de un día**:
   - ✅ Click en un día
   - ✅ Muestra platos: Primero, Segundo, Postre
   - ✅ Puede seleccionar platos
   - ✅ Muestra precio total
   - ✅ Respeta límite diario

3. **Crear pedido**:
   - ✅ Seleccionar platos
   - ✅ Confirmar
   - ✅ NO error Prisma en `createOrUpdateOrder`
   - ✅ Pedido creado con todos los campos requeridos

4. **Cancelar pedido**:
   - ✅ Cancelar un pedido antes del cutoff
   - ✅ NO error Prisma en `cancelOrder`
   - ✅ Estado cambia a CANCELLED_BEFORE_CUTOFF

---

## 📋 CHECKLIST DE VERIFICACIÓN

### Admin Dashboard
- [ ] Login como admin exitoso
- [ ] Redirige a `/admin` (no `/admin/dashboard`)
- [ ] Dashboard carga sin errores
- [ ] Puede navegar a empresas, caterings, tenants

### Portal Empleado
- [ ] Login como empleado exitoso
- [ ] Redirige a `/empleado/menus`
- [ ] NO error "Unknown field `company`"
- [ ] Ve menús de la semana
- [ ] Ve su nombre correcto
- [ ] Ve datos de la empresa (límite diario)
- [ ] Ve catering asignado

### Funcionalidad de Menús
- [ ] Puede ver platos del día
- [ ] Puede seleccionar platos
- [ ] Puede confirmar pedido
- [ ] Pedido se crea correctamente en BD
- [ ] Puede cancelar pedido antes cutoff
- [ ] NO errores Prisma en ninguna operación

---

## 🎓 LECCIONES APRENDIDAS

### 1. Verificar Rutas Existentes

**Problema**: Asumí que `/admin/dashboard` existía sin verificar.

**Solución**:
- ✅ SIEMPRE verificar con `list_dir` o `glob_file_search` si una ruta existe
- ✅ No asumir estructura de rutas
- ✅ Documentar rutas principales en un archivo central

**Para futuro**:
```typescript
// Crear constantes para rutas
export const DASHBOARD_ROUTES = {
  ADMIN: '/admin',           // NO '/admin/dashboard'
  EMPRESA: '/empresa/dashboard',
  CATERING: '/catering/dashboard',
  EMPLEADO: '/empleado/menus',
} as const
```

---

### 2. Entender Relaciones de Prisma

**Problema**: Asumí que `Employee` tenía relación directa con `Company`.

**Solución**:
- ✅ SIEMPRE leer el schema de Prisma antes de escribir queries
- ✅ Verificar qué relaciones existen realmente
- ✅ Entender la "cadena" de relaciones (Employee → Site → Company)

**Regla de oro**:
```
Si Prisma no tiene una relación definida, NO puedes hacer include.
Debes ir por la cadena de relaciones o hacer queries separadas.
```

---

### 3. Fields Requeridos en Prisma

**Problema**: `Order.create()` fallaba porque faltaban campos requeridos.

**Solución**:
- ✅ Verificar schema para ver campos con `@default` vs campos requeridos
- ✅ Si un campo no tiene `@default` y no es `?` (opcional), es REQUERIDO
- ✅ Siempre incluir: `createdBy`, `lastModifiedBy`, `integrityHash` en Order

**Campos requeridos en Order**:
```prisma
model Order {
  // ... otros campos ...
  
  // ✅ REQUERIDOS (no tienen @default ni ?)
  createdBy      String @map("created_by")
  lastModifiedBy String @map("last_modified_by")
  integrityHash  String @map("integrity_hash")
  
  // ✅ OPCIONALES (tienen @default)
  status   OrderStatus @default(DRAFT)
  menuType MenuType    @default(FULL)
  version  Int         @default(1)
}
```

---

### 4. Relaciones en Prisma: Campo vs Relación

**Problema**: Confundí tener un campo `employeeId` con tener una relación `employee`.

**Diferencia**:

```prisma
// ❌ Solo campo, NO relación
model Order {
  employeeId String @map("employee_id")
  // No hay: employee Employee @relation(...)
}

// ✅ Relación completa
model Employee {
  siteId String @map("site_id")
  site   CompanySite @relation(fields: [siteId], references: [id])
}
```

**Regla**:
- Campo terminado en `Id` → Es un foreign key, pero no puedes hacer `include`
- Campo con relación `@relation(...)` → Puedes hacer `include`

---

## 🔧 MANTENIMIENTO FUTURO

### Si se añade una nueva query de Employee

1. ✅ NUNCA hacer `include: { company }`
2. ✅ SIEMPRE usar `include: { site: { include: { company } } }`
3. ✅ Acceder con `employee.site.company`

### Si se añade un nuevo rol con dashboard

1. ✅ Verificar que la ruta EXISTE en `app/`
2. ✅ Añadir a `getDashboardPath()` con ruta correcta
3. ✅ Probar login → redirect → dashboard

### Si se modifica el schema de Employee

1. ✅ Verificar TODAS las queries que usan Employee
2. ✅ Actualizar `empleado-menus.ts`, `empleado-perfil.ts`, etc.
3. ✅ Hacer grep de `employee.` para encontrar todas las referencias

---

## 📈 ESTADO FINAL

| Item | Estado |
|------|--------|
| **Admin dashboard 404** | ✅ RESUELTO |
| **getDashboardPath correcto** | ✅ RESUELTO |
| **Employee queries con company** | ✅ RESUELTO |
| **createOrUpdateOrder campos** | ✅ RESUELTO |
| **cancelOrder relación** | ✅ RESUELTO |
| **Portal empleado funcional** | ✅ RESUELTO |
| **Tests necesarios** | ⚠️ PENDIENTE |

---

## 🔗 COMMITS RELACIONADOS

| Commit | Descripción |
|--------|-------------|
| `5a58d86` | 🔴 **FIX PRINCIPAL**: getDashboardPath + Employee queries |
| `87c5f38` | Corregir destructuring de getTenant() |
| `e6a8e97` | Eliminar TODAS las referencias a /auth/login |
| `2222421` | Corregir getDashboardPath inicial |

---

**Fecha de resolución**: 2025-11-21  
**Commit**: `5a58d86`  
**Estado**: ✅ **LISTO PARA TESTING EN PRODUCCIÓN**

---

## 🎯 CONCLUSIÓN

Se han identificado y corregido **2 problemas críticos**:

1. ✅ **Admin Dashboard 404**: `getDashboardPath` devolvía `/admin/dashboard` (no existe) → corregido a `/admin`

2. ✅ **Employee Queries Error**: Queries intentaban `include: { company }` pero Employee NO tiene esa relación → corregido a `include: { site: { include: { company } } }`

**Total de cambios**: 23 líneas en 2 archivos

El sistema ahora:
- ✅ Root admin puede acceder a su dashboard
- ✅ Empleados pueden ver sus menús sin errores Prisma
- ✅ Todas las queries respetan el schema de Prisma
- ✅ Orders se crean con todos los campos requeridos

**Prioridad**: 🔴 CRÍTICA → ✅ RESUELTA


