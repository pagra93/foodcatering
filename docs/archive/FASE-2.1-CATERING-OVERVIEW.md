# 🎯 FASE 2.1 - Página de Detalle de Catering (Tab Overview)

## ✅ COMPLETADO

Esta fase implementa la **página de detalle de catering** con el **Tab Overview**, que es la vista principal para gestionar y monitorear un catering desde el Super Admin.

---

## 📁 Archivos Creados/Modificados

### 1. **Página Principal**
- **`app/(admin)/admin/caterings/[id]/page.tsx`**
  - Página de detalle completa con estructura de tabs
  - Header con información del catering y acciones
  - Sistema de navegación por tabs
  - Suspense boundaries para carga progresiva

### 2. **Componentes de UI**
- **`components/admin/caterings/CateringKPIs.tsx`**
  - Muestra 4-5 KPIs principales en cards
  - Sistema de semáforos (verde/amarillo/rojo)
  - Badges con estados visuales
  - Cálculo de tendencias

- **`components/admin/caterings/CateringAlerts.tsx`**
  - Panel de alertas críticas
  - Alertas por documentos caducados
  - Alertas por incidencias críticas
  - Alertas por SLAs incumplidos
  - Diseño con colores semánticos

- **`components/admin/caterings/OperationalStatus.tsx`**
  - Visualización de horarios (cutoff, ventanas)
  - Capacidad diaria y días operativos
  - Zonas de servicio
  - Comisión económica

### 3. **Queries de Base de Datos**
- **`lib/db/queries/caterings.ts`** (actualizado)
  - Función `getCateringById()` completa
  - KPIs de 30 y 90 días
  - Cálculo de tasas (puntualidad, incidencias)
  - Serialización de Decimals
  - Alertas estructuradas

---

## 🎨 Funcionalidades Implementadas

### **Tab Overview** (Vista Principal)

#### 1. **Header del Catering**
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Nombre del Catering                       │
│          Razón Social                               │
│          [Badge: Activo/Suspendido]                 │
│          [Badge: Docs OK/Warning/Error]             │
│          CIF | Capacidad                    [Editar]│
└─────────────────────────────────────────────────────┘
```

#### 2. **Panel de Alertas Críticas** (si existen)
- 🔴 Documentos caducados o próximos a caducar
- 🟠 Incidencias críticas abiertas
- 🟡 SLA de puntualidad < 90%
- 🟡 Tasa de incidencias > 5%
- 🔵 Capacidad cerca del límite

#### 3. **KPIs Principales** (4 cards)

**Pedidos (30 días)**
- Total de pedidos
- Tendencia vs promedio 90 días
- Ej: `150 pedidos` (+12% vs promedio)

**Puntualidad (SLA)**
- Porcentaje de entregas a tiempo
- Semáforo: Verde (≥95%), Amarillo (90-95%), Rojo (<90%)
- Ej: `97.5%` [✓ Excelente]

**Tasa de Incidencias**
- Porcentaje de pedidos con incidencias
- Semáforo: Verde (<2%), Amarillo (2-5%), Rojo (>5%)
- Ej: `1.8%` [12 incidencias]

**Satisfacción (Rating)**
- Rating promedio de empleados
- Semáforo: Verde (≥4.5), Amarillo (4.0-4.5), Rojo (<4.0)
- Ej: `4.7 / 5` [⭐ Excelente]

**Cancelaciones Post-Cutoff** (opcional)
- Si hay > 0, se muestra un card adicional
- Badge: Alta (>5) o Moderada (≤5)

#### 4. **Estado Operativo** (3 cards)

**Horarios**
- ⏰ Hora de Corte (Cutoff): `11:00`
- 👨‍🍳 Ventana de Preparación: `08:00-11:00`
- 🚚 Ventana de Entrega: `12:00-14:00`
- ⏱️ Lead Time Mínimo: `180 minutos`

**Capacidad**
- Capacidad diaria máxima: `500 platos/día`
- Nota: ventas se cierran automáticamente al 100%

**Días Operativos**
- Badges con días activos/inactivos
- Ej: [Lunes] [Martes] [Miércoles] [Jueves] [Viernes]

**Zonas de Servicio**
- Lista de zonas configuradas
- Códigos postales por zona

**Económico**
- Comisión aplicada: `5.00%`

#### 5. **Información Detallada** (2 cards)

**Información de Contacto**
- Persona de contacto
- Email
- Teléfono
- Dirección fiscal

**Configuración Económica**
- Comisión: `5%`
- Facturación Mínima: `1000€`
- Ciclo de Pago: `MENSUAL`
- IBAN (si configurado)

---

## 🎨 Sistema de Semáforos (Verde/Amarillo/Rojo)

### **Puntualidad**
- 🟢 Verde: ≥ 95% (Excelente)
- 🟡 Amarillo: 90-95% (Advertencia)
- 🔴 Rojo: < 90% (Crítico)

### **Tasa de Incidencias**
- 🟢 Verde: < 2% (Bajo)
- 🟡 Amarillo: 2-5% (Moderado)
- 🔴 Rojo: > 5% (Alto)

### **Satisfacción (Rating)**
- 🟢 Verde: ≥ 4.5 / 5 (Excelente)
- 🟡 Amarillo: 4.0-4.5 (Bueno)
- 🔴 Rojo: < 4.0 (Necesita mejora)

### **Documentos**
- 🟢 Verde: OK, válidos
- 🟡 Amarillo: Caducan en ≤ 30 días
- 🔴 Rojo: Caducados

---

## 🔧 Estructura de Datos (Query)

El query `getCateringById(tenantId)` retorna:

```typescript
{
  id: string
  name: string
  subdomain: string
  logoUrl?: string
  primaryColor?: string
  status: string
  
  restaurant: {
    legalName: string
    cif: string
    billingAddress: string
    contactPerson: string
    contactEmail: string
    contactPhone: string
    dailyCapacity: number
    cutoffTime: string
    preparationWindow?: string
    deliveryWindow?: string
    leadTimeMinutes: number
    operationalDays: string[]
    zones: Array<{...}>
    commission: number  // serializado
    minimumBilling: number  // serializado
    paymentCycle: string
    punctualityRate?: number  // serializado
    incidentRate?: number  // serializado
    averageRating?: number  // serializado
    operationalStatus: string
    documentsStatus: string
  }
  
  kpis: {
    ordersLast30Days: number
    ordersLast90Days: number
    punctualityRate: number
    incidentRate: number
    averageRating: number | null
    incidentsCount: number
    postCutoffCancellations: number
  }
  
  alerts: {
    expiredDocs: Array<{id, type, expiresAt, status}>
    criticalIncidents: Array<{id, severity, description}>
    lowPunctuality: boolean
    highIncidentRate: boolean
    capacityNearLimit: boolean
  }
  
  users: User[]
  documents: Document[]
  dishes: Dish[]
  recentOrders: Order[]
  incidents: Incident[]
}
```

---

## 🧪 Cómo Probar

### 1. **Acceder a la Página**
```
http://localhost:3000/admin/caterings/[tenant-id]
```

Reemplaza `[tenant-id]` con el ID de un tenant de tipo `CATERING` existente en la base de datos.

### 2. **Verificar que se Muestra**
- ✅ Header con logo y nombre del catering
- ✅ Badges de estado (activo, docs)
- ✅ Alertas críticas (si existen problemas)
- ✅ 4-5 cards de KPIs con semáforos
- ✅ Estado operativo (horarios, capacidad, días)
- ✅ Información de contacto y económica

### 3. **Verificar Semáforos**
Los badges deben mostrar colores correctos según los umbrales:
- Verde para valores buenos
- Amarillo para advertencias
- Rojo para críticos

### 4. **Verificar Tabs**
Los otros tabs (Calidad, Operación, etc.) deben mostrar un placeholder "En desarrollo".

---

## 🚀 Próximas Fases

### **FASE 2.2 - Tab Calidad & Cumplimiento**
- Lista de documentos con estado
- Sistema de subida de documentos
- Auditorías
- Histórico de sanciones/bonificaciones

### **FASE 2.3 - Tab Operación Diaria**
- Calendario de menús
- Hojas de cocina/empaquetado
- Logística y rutas
- Incidencias del día

### **FASE 2.4 - Tab Menús & Platos**
- Catálogo de platos
- Programación semanal
- Precios y overrides
- Control de stock

### **FASE 2.5 - Tab Facturación & Pagos**
- Facturas emitidas
- Liquidaciones
- Descargas (PDF, CSV)

### **FASE 2.6 - Tab Incidencias**
- Cola de incidencias
- Filtros y búsqueda
- Tiempos de resolución
- Macros

### **FASE 2.7 - Tab Usuarios & Permisos**
- Lista de usuarios del catering
- Roles y permisos
- MFA y accesos
- Impersonación

### **FASE 2.8 - Formulario Completo (Wizard)**
- Alta de catering paso a paso
- Validaciones en cada paso
- Subida de documentos
- Checklist final

### **FASE 2.9 - Lista de Caterings**
- Tabla con filtros
- KPIs globales
- Acciones masivas

---

## 📊 Métricas Implementadas

| Métrica | Descripción | Fuente |
|---------|-------------|--------|
| **Pedidos 30d** | Total pedidos últimos 30 días | `prisma.order.count()` |
| **Pedidos 90d** | Total pedidos últimos 90 días | `prisma.order.count()` |
| **Puntualidad** | % entregas a tiempo | `deliveredOrders / totalOrders * 100` |
| **Incidencias** | % pedidos con incidencias | `incidents / totalOrders * 100` |
| **Satisfacción** | Rating promedio | `restaurant.averageRating` |
| **Docs Caducados** | Documentos expirados | `filter(doc.expiresAt < now)` |
| **Docs Por Caducar** | Caducan en ≤30 días | `filter(doc.expiresAt ≤ +30d)` |

---

## ✅ Checklist de Completado

- [x] Página `/admin/caterings/[id]/page.tsx` creada
- [x] Componente `CateringKPIs` con semáforos
- [x] Componente `CateringAlerts` con alertas críticas
- [x] Componente `OperationalStatus` con configuración
- [x] Query `getCateringById()` completo y serializado
- [x] Sistema de badges con colores semánticos
- [x] Tabs con estructura navegable
- [x] Sin errores de linting
- [x] Documentación creada

---

## 🎉 Resultado

El Super Admin ahora puede:

1. ✅ **Ver información completa** de un catering en un vistazo
2. ✅ **Identificar problemas rápidamente** con alertas y semáforos
3. ✅ **Monitorear KPIs** de rendimiento operativo
4. ✅ **Revisar configuración** operativa (horarios, capacidad, zonas)
5. ✅ **Acceder a contacto** y detalles económicos

**Próximo paso:** Cuando estés listo, dirás qué fase quieres continuar (2.2, 2.3, etc.) y avanzaremos poco a poco. 🚀

