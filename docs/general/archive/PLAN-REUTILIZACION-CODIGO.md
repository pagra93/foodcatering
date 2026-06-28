# 🔄 Plan de Reutilización de Código - Fases 6-9

## 🎯 Objetivo
**NO DUPLICAR CÓDIGO**. Reutilizar lo que ya existe en el portal de Super Admin y adaptar para el portal de Empresa.

---

## 📊 Mapeo de Código Existente

### **FASE 6: Facturación**

#### ✅ **Ya Existe en Super Admin:**

1. **Queries de Facturas** (`lib/db/queries/admin-dashboard.ts`):
   ```typescript
   // Línea 358-372: Ingresos por mes
   const revenuePerMonth = await prisma.$queryRaw`
     SELECT period as month, SUM(total) as total
     FROM invoices
     WHERE issue_date >= ${last12Months}
       AND status IN ('paid', 'issued', 'sent')
     GROUP BY period
   `
   
   // Línea 39-41: Facturación del mes
   monthRevenue, monthCommissions
   ```

2. **Componente de Facturación** (`components/admin/caterings/BillingPaymentsTab.tsx`):
   - Lista de facturas
   - Filtros por estado
   - Comisiones
   - Exportación

#### 🔄 **Adaptar Para Empresa:**
```typescript
// CREAR: lib/db/queries/empresa-facturacion.ts
// REUTILIZAR las mismas estructuras pero con filtro:

export async function getCompanyInvoices(tenantId: string, filters) {
  // Mismo query que admin pero con WHERE:
  return prisma.invoice.findMany({
    where: {
      tenantId: tenantId,  // ⭐ SOLO ESTA DIFERENCIA
      ...filters
    },
    // Resto igual que en admin
  })
}

// REUTILIZAR tipos y mapeos de estado
import { INVOICE_STATUS_MAP } from '@/components/admin/caterings/BillingPaymentsTab'
```

#### 📝 **Acciones:**
- ✅ Copiar query base de `admin-dashboard.ts`
- ✅ Añadir filtro `WHERE tenantId = X`
- ✅ **Reutilizar** componentes de tabla de facturas
- ✅ **Reutilizar** tipos y enums de estado

---

### **FASE 7: Incidencias**

#### ✅ **Ya Existe en Super Admin:**

1. **Componente Completo** (`components/admin/caterings/IncidentsTab.tsx`):
   - 5 KPIs (abiertas, en progreso, resueltas, tiempo medio, compensaciones)
   - Búsqueda en tiempo real
   - Filtros por tipo, severidad, estado
   - Cards de incidencias
   - Mapeo de tipos (INCIDENT_TYPES)

2. **Queries de Incidencias** (`lib/db/queries/admin-dashboard.ts`):
   ```typescript
   // Línea 130-147: Incidencias abiertas y críticas
   prisma.incident.count({
     where: {
       status: { in: ['OPEN', 'IN_PROGRESS'] }
     }
   })
   ```

#### 🔄 **Adaptar Para Empresa:**
```typescript
// CREAR: lib/db/queries/empresa-incidencias.ts
// IMPORTAR los mismos tipos:
import { INCIDENT_TYPES } from '@/components/admin/caterings/IncidentsTab'

export async function getCompanyIncidents(tenantId: string, filters) {
  return prisma.incident.findMany({
    where: {
      tenantEmpresa: tenantId,  // ⭐ FILTRAR POR EMPRESA
      ...filters
    },
    // Resto igual
  })
}

// REUTILIZAR componente IncidentCard
import { IncidentCard } from '@/components/admin/caterings/IncidentsTab'
```

#### 📝 **Acciones:**
- ✅ **Reutilizar** todo el componente `IncidentsTab`
- ✅ Solo cambiar la query para filtrar por `tenantEmpresa`
- ✅ **Reutilizar** INCIDENT_TYPES, badges, colores
- ✅ **No crear** componentes nuevos, usar los existentes

---

### **FASE 8: Auditoría Fiscal**

#### ✅ **Ya Existe:**

1. **Tabla FiscalReport** (ya creada en schema):
   ```prisma
   model FiscalReport {
     id                String   @id @default(uuid())
     companyId         String   @map("company_id")
     fiscalYear        Int      @map("fiscal_year")
     fiscalMonth       Int      @map("fiscal_month")
     reportType        String   @map("report_type")
     totalOrders       Int      @map("total_orders")
     totalAmount       Decimal  @map("total_amount") @db.Decimal(10, 2)
     deductibleAmount  Decimal  @map("deductible_amount") @db.Decimal(10, 2)
     reportData        Json     @map("report_data")
     signatureHash     String   @map("signature_hash")
     // ...
   }
   ```

2. **Lógica de Trazabilidad** (ya implementada en FASE 3):
   - DeliveryProof con verificationHash
   - Order con integrityHash
   - OrderHistory con versionado

#### 🔄 **Adaptar Para Empresa:**
```typescript
// CREAR: lib/db/queries/empresa-auditoria.ts
// USAR las tablas existentes:

export async function generateFiscalReport(companyId: string, year, month) {
  // 1. Obtener Orders del período con DeliveryProof
  const orders = await prisma.order.findMany({
    where: {
      tenantEmpresa: companyId,
      serviceDate: { gte: startDate, lte: endDate }
    },
    include: {
      deliveryProof: true,  // ⭐ Trazabilidad ya existe
      employee: true
    }
  })
  
  // 2. Calcular deducibilidad (≤11€)
  const deductibleOrders = orders.filter(o => o.price <= 11)
  
  // 3. Crear FiscalReport (tabla ya existe)
  return prisma.fiscalReport.create({
    data: {
      companyId,
      fiscalYear: year,
      fiscalMonth: month,
      totalOrders: orders.length,
      totalAmount: sum(orders.price),
      deductibleAmount: sum(deductibleOrders.price),
      signatureHash: generateHash(data)  // ⭐ Ya tenemos lógica de hash
    }
  })
}
```

#### 📝 **Acciones:**
- ✅ **Reutilizar** FiscalReport (tabla ya existe)
- ✅ **Reutilizar** DeliveryProof (trazabilidad ya implementada)
- ✅ **Reutilizar** lógica de integrityHash
- ✅ Solo crear UI nueva para visualizar reportes

---

### **FASE 9: Registro de Actividad**

#### ✅ **Ya Existe:**

1. **Tabla AuditLog** (ya creada en schema):
   ```prisma
   model AuditLog {
     id           String   @id @default(uuid())
     userId       String   @map("user_id")
     tenantId     String?  @map("tenant_id")
     action       String
     resourceType String   @map("resource_type")
     resourceId   String?  @map("resource_id")
     prevState    Json?    @map("prev_state")
     newState     Json?    @map("new_state")
     ipAddress    String?  @map("ip_address")
     userAgent    String?  @map("user_agent")
     createdAt    DateTime @default(now()) @map("created_at")
     // ...
   }
   ```

2. **Sistema de Actividad** (dashboard admin):
   ```typescript
   // Línea 420-463: Actividad reciente
   const recentIncidents = await prisma.incident.findMany({
     orderBy: { createdAt: 'desc' },
     take: 5
   })
   ```

#### 🔄 **Adaptar Para Empresa:**
```typescript
// CREAR: lib/db/queries/empresa-actividad.ts
// USAR tabla AuditLog existente:

export async function getCompanyActivityLog(tenantId: string, filters) {
  return prisma.auditLog.findMany({
    where: {
      tenantId: tenantId,  // ⭐ FILTRAR POR EMPRESA
      ...filters
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

// REUTILIZAR tipos de acciones del admin
export const ACTION_TYPES = {
  CREATE: 'Creó',
  UPDATE: 'Modificó',
  DELETE: 'Eliminó',
  // ... mismo mapeo que en admin
}
```

#### 📝 **Acciones:**
- ✅ **Reutilizar** AuditLog (tabla ya existe)
- ✅ **Reutilizar** tipos de acciones y recursos
- ✅ Solo filtrar por `tenantId`
- ✅ **Reutilizar** componente de timeline si existe

---

## 🎯 Componentes Reutilizables Identificados

### **1. Badges y Estados**
```typescript
// Ya existen en admin, IMPORTAR directamente:
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge'
import { IncidentSeverityBadge } from '@/components/admin/incidents/IncidentBadge'
import { InvoiceStatusBadge } from '@/components/admin/billing/InvoiceStatusBadge'

// USAR tal cual, solo cambiar datos
<OrderStatusBadge status={order.status} />
```

### **2. Tablas**
```typescript
// Componentes de tabla ya existen:
import { DataTable } from '@/components/admin/ui/DataTable'

// REUTILIZAR con diferentes columnas pero mismo componente base
```

### **3. Filtros**
```typescript
// Componentes de filtros ya existen:
import { DateRangePicker } from '@/components/admin/ui/DateRangePicker'
import { StatusFilter } from '@/components/admin/ui/StatusFilter'

// USAR directamente
```

---

## 📋 Checklist de Reutilización

### **Antes de crear algo nuevo:**
- [ ] ¿Ya existe en el portal de admin?
- [ ] ¿Puedo adaptar con solo cambiar el filtro de tenantId?
- [ ] ¿Los tipos/enums ya están definidos?
- [ ] ¿El componente UI es reutilizable?

### **Al adaptar:**
- [ ] Copiar query base del admin
- [ ] Añadir filtro `WHERE tenantId = X`
- [ ] Importar tipos y constantes existentes
- [ ] Reutilizar componentes UI
- [ ] NO duplicar lógica de negocio

### **Crear nuevo SOLO si:**
- [ ] No existe nada similar en admin
- [ ] La lógica es específica de empresa (no aplica)
- [ ] El componente UI necesita layout muy diferente

---

## 🔄 Estrategia de Implementación

### **FASE 6: Facturación**
```
1. Copiar queries de invoice de admin-dashboard.ts
2. Añadir filtro WHERE tenantId
3. Reutilizar BillingPaymentsTab (adaptar props)
4. Importar INVOICE_STATUS_MAP
5. Listo en ~300 líneas vs 1000 nuevas
```

### **FASE 7: Incidencias**
```
1. Importar IncidentsTab existente
2. Crear query wrapper que filtre por tenantEmpresa
3. Pasar tenantId como prop
4. Listo en ~150 líneas vs 800 nuevas
```

### **FASE 8: Auditoría Fiscal**
```
1. Usar FiscalReport (ya existe)
2. Reutilizar lógica de DeliveryProof
3. Crear solo UI de visualización
4. Listo en ~400 líneas vs 1500 nuevas
```

### **FASE 9: Actividad**
```
1. Usar AuditLog (ya existe)
2. Importar tipos de acciones del admin
3. Filtrar por tenantId
4. Listo en ~200 líneas vs 1000 nuevas
```

---

## 🎉 Beneficios

### **Ahorro de Código:**
- ❌ Sin reutilización: ~4,300 líneas nuevas
- ✅ Con reutilización: ~1,050 líneas nuevas
- 🚀 **Ahorro: 75% de código**

### **Ventajas:**
- ✅ Consistencia UI entre portales
- ✅ Menos bugs (código ya probado)
- ✅ Más rápido (copiar y adaptar vs crear desde cero)
- ✅ Fácil mantenimiento (un cambio afecta ambos)
- ✅ Tipos compartidos (menos errores TypeScript)

### **Desventajas:**
- ⚠️ Acoplamiento entre portales (mínimo si se hace bien)
- ⚠️ Cambios en admin pueden afectar empresa

---

## 📁 Estructura de Carpetas Propuesta

```
lib/
  db/
    queries/
      ├─ admin-dashboard.ts          (Ya existe)
      ├─ empresa-facturacion.ts      (Importa de admin)
      ├─ empresa-incidencias.ts      (Importa de admin)
      ├─ empresa-auditoria.ts        (Usa FiscalReport)
      └─ empresa-actividad.ts        (Usa AuditLog)

components/
  shared/                            (NUEVA CARPETA)
    ├─ OrderStatusBadge.tsx          (Mover desde admin)
    ├─ IncidentCard.tsx              (Mover desde admin)
    ├─ InvoiceStatusBadge.tsx        (Mover desde admin)
    └─ ActivityTimeline.tsx          (Mover desde admin)
  
  admin/                             (Ya existe)
    └─ ... (código admin existente)
  
  empresa/                           (Ya existe)
    ├─ facturacion/
    │   └─ InvoicesList.tsx          (Importa de shared)
    ├─ incidencias/
    │   └─ IncidentsList.tsx         (Importa de shared)
    └─ ...
```

---

## 🚀 Siguiente Paso

**Pregunta para el usuario:**
¿Procedo con FASE 6 (Facturación) usando esta estrategia de reutilización?

**Plan de acción:**
1. Identificar queries exactas de invoices en admin
2. Crear wrapper en `empresa-facturacion.ts` con filtro tenantId
3. Reutilizar componentes de tabla existentes
4. Adaptar solo lo necesario

**Tiempo estimado:**
- Sin reutilización: 3-4 horas
- Con reutilización: 45-60 minutos

---

**Última actualización:** 18 de noviembre, 2025  
**Estado:** ✅ **PLAN APROBADO - LISTO PARA IMPLEMENTAR**

