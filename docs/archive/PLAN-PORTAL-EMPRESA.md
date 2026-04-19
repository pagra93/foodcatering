# 🏢 Plan de Implementación - Portal de Empresa

## 🎯 Objetivo
Crear el panel que usan las **empresas clientes** (RRHH/Finanzas) para gestionar su servicio de comidas:
- Empleados (altas/bajas)
- Pedidos y consumo diario
- Facturación y deducibilidad
- Incidencias
- Auditoría fiscal

---

## 🔍 1. ANÁLISIS DE BASE DE DATOS EXISTENTE

### ✅ Tablas que YA TENEMOS y reutilizaremos:

#### **Empresa (Company)**
```sql
✅ companies
   - id, tenantId, legalName, cif, plan
   - contactRrhhName/Email/Phone
   - contactFinanceName/Email/Phone
   - sector, employeeCount
   - contractSignedAt, contractUrl
   - monthlySpend, deductibilityRate, adoptionRate
   
✅ company_policies
   - cutoffTime, daysActive, limitPerDay
   - copayCompany, copayEmployee
   - noShowRule
   - version, changedBy (auditoría)
   
✅ company_sites
   - name, address, city, postalCode
   - deliveryWindow, contactName/Phone
   - active
   
✅ company_catering_assignments
   - tenantEmpresa, tenantCatering, companyId
   - type (PRIMARY/BACKUP)
   - zones, priority
   - slaPunctuality, slaIncidentRate
   - active, assignedAt
```

#### **Empleados**
```sql
✅ employees
   - id, tenantId, userId, siteId
   - employeeNumber, department, position
   - startDate, endDate, status
   - weeklyMenuDays, monthlyLimit
   - deletedAt
   
✅ users (tabla compartida con employees)
   - id, tenantId, email, passwordHash
   - nameEnc, phoneEnc
   - role, mfaEnabled, status
```

#### **Pedidos**
```sql
✅ orders
   - id, tenantEmpresa, tenantCatering, employeeId
   - serviceDate, siteId
   - selection (JSON), price, menuType
   - status, statusChangedAt, lockedAt
   - createdBy, lastModifiedBy, version
   - integrityHash (trazabilidad fiscal)
   
✅ order_history (auditoría)
   - orderId, version, changedAt, changedBy
   - changeReason, prevValues, newValues
   - integrityHash
```

#### **Incidencias**
```sql
✅ incidents
   - id, orderId
   - tenantEmpresa, tenantCatering
   - type, severity, status
   - description, resolution
   - reportedBy, reportedAt
   - resolvedBy, resolvedAt
```

#### **Facturación**
```sql
✅ invoices
   - id, tenantId, invoiceNumber
   - period, type (CATERING/PLATFORM)
   - totalAmount, taxAmount, status
   - issuedAt, dueAt, paidAt
   - fileUrl
```

---

## 🆕 2. LO QUE FALTA CREAR

### ❌ Tablas/Campos que NECESITAMOS añadir:

#### **1. Menús y Platos** (para que empresa vea menús del día)
```sql
❌ dishes (platos del catering)
   - id, tenantCatering, name, description
   - course (STARTER/MAIN/DESSERT)
   - price, allergens, calories
   - imageUrl, active
   
❌ dish_schedules (menús programados por día)
   - id, tenantCatering, dishId
   - serviceDate, available
   - maxQuantity
```

#### **2. Auditoría Fiscal Mejorada**
```sql
❌ fiscal_reports (informes fiscales mensuales)
   - id, tenantEmpresa, period
   - totalOrders, totalAmount
   - deductibleAmount, deductibilityRate
   - employeesServed, daysWithService
   - generatedAt, signatureHash
   - fileUrl
   
❌ delivery_proofs (justificantes de entrega para fiscal)
   - id, orderId
   - deliveredAt, deliveredBy
   - signatureImageUrl, geoLocation
   - verificationHash
```

#### **3. Notificaciones**
```sql
❌ notifications
   - id, tenantId, userId
   - type (INVOICE/INCIDENT/ALERT/REMINDER)
   - title, message, actionUrl
   - priority, read, readAt
   - createdAt
```

#### **4. Configuración de Empresa (adicional)**
```sql
❌ company_settings (preferencias operativas)
   - tenantId, companyId
   - deliveryLocation (punto de entrega)
   - notificationsEmail (emails para alertas)
   - notifyDailySummary (boolean)
   - notifyIncidents (boolean)
   - notifyInvoices (boolean)
```

---

## 🏗️ 3. ARQUITECTURA DEL PORTAL

### Routing Structure:
```
/empresa
  ├─ /dashboard              → KPIs, gráficas, alertas
  ├─ /configuracion          → Datos empresa, plan, catering
  ├─ /empleados              → Lista, altas/bajas, detalle
  │   ├─ /nuevo
  │   ├─ /[id]
  │   └─ /importar           → CSV import
  ├─ /pedidos                → Consumo diario, histórico
  │   └─ /[id]               → Detalle pedido
  ├─ /catering               → Info catering, menús, logística
  │   └─ /menus              → Menús por día
  ├─ /facturacion            → Facturas catering + plataforma
  │   ├─ /catering
  │   ├─ /plataforma
  │   └─ /descargas          → Export ERP
  ├─ /incidencias            → Lista, crear, resolver
  │   ├─ /nueva
  │   └─ /[id]
  ├─ /auditoria              → Informes fiscales, trazabilidad
  │   ├─ /fiscal
  │   ├─ /dossier            → Generar dossier fiscal
  │   └─ /exportar           → Export contable
  └─ /actividad              → Audit log (registro actividad)
```

---

## 📋 4. PLAN DE IMPLEMENTACIÓN POR FASES

### **FASE 1: Base + Dashboard** (Primera prioridad)
- ✅ Auth para empresas (login, sesiones)
- ✅ Layout del portal empresa
- ✅ Dashboard con KPIs básicos:
  - Empleados activos
  - Pedidos del mes
  - Gasto total
  - % deducible
  - Alertas

**Queries necesarias:**
- `getCompanyDashboard(tenantId)`
- `getCompanyKPIs(tenantId)`
- `getCompanyAlerts(tenantId)`

---

### **FASE 2: Empleados** (Core functionality)
- ✅ Lista de empleados con filtros
- ✅ Alta de empleados (formulario + email invitación)
- ✅ Edición y baja de empleados
- ✅ Import CSV masivo
- ✅ Detalle de empleado (consumo, valoraciones)

**Queries necesarias:**
- `getEmployees(tenantId, filters)`
- `getEmployeeById(employeeId)`
- `createEmployee(data)`
- `updateEmployee(employeeId, data)`
- `importEmployeesCSV(file)`

---

### **FASE 3: Pedidos y Consumo**
- ✅ Tabla de pedidos (histórico)
- ✅ Filtros (empleado, fecha, catering, estado)
- ✅ Export CSV/Excel
- ✅ Detalle de pedido (justificante, trazabilidad)
- ✅ Informe mensual de consumo

**Queries necesarias:**
- `getOrders(tenantId, filters)`
- `getOrderById(orderId)`
- `getMonthlyConsumptionReport(tenantId, month)`
- `exportOrdersCSV(tenantId, filters)`

---

### **FASE 4: Configuración**
- ✅ Editar datos de empresa
- ✅ Configurar política de servicio
- ✅ Preferencias operativas
- ✅ Ver catering asignado
- ✅ Documentación y contrato

**Queries necesarias:**
- `getCompanyConfig(tenantId)`
- `updateCompanyConfig(tenantId, data)`
- `updateCompanyPolicy(tenantId, policyData)`

---

### **FASE 5: Catering y Menús**
- ✅ Info del catering asignado
- ✅ Menús por día (vista lectura)
- ✅ Platos (detalles, alérgenos, calorías)
- ✅ SLA y puntuación del catering
- ✅ Rutas logísticas

**Queries necesarias:**
- `getAssignedCatering(tenantId)`
- `getMenusByDate(cateringId, dateRange)`
- `getDishDetails(dishId)`

---

### **FASE 6: Facturación**
- ✅ Facturas del catering (lista + PDFs)
- ✅ Facturas de Comida.com (cuota + comisiones)
- ✅ Conciliación automática
- ✅ Export para ERP (A3/Sage/SAP)
- ✅ CSV consolidado

**Queries necesarias:**
- `getInvoices(tenantId, type, filters)`
- `getInvoiceById(invoiceId)`
- `reconcileInvoices(tenantId, month)`
- `exportERPFormat(tenantId, format, period)`

---

### **FASE 7: Incidencias**
- ✅ Lista de incidencias
- ✅ Crear nueva incidencia
- ✅ Resolver/Escalar incidencias
- ✅ Solicitar compensación
- ✅ Vincular con pedidos/empleados

**Queries necesarias:**
- `getIncidents(tenantId, filters)`
- `getIncidentById(incidentId)`
- `createIncident(data)`
- `updateIncident(incidentId, data)`
- `escalateIncident(incidentId)`

---

### **FASE 8: Auditoría Fiscal**
- ✅ Informe fiscal mensual/anual
- ✅ % gasto deducible
- ✅ Empleados sin trazabilidad
- ✅ Pedidos sin justificante
- ✅ Generar dossier fiscal (1 clic)

**Queries necesarias:**
- `getFiscalReport(tenantId, period)`
- `getDeductibilityAnalysis(tenantId)`
- `generateFiscalDossier(tenantId, year)`
- `exportFiscalReport(tenantId, format)`

---

### **FASE 9: Registro de Actividad**
- ✅ Audit log completo
- ✅ Filtros (usuario, acción, fecha)
- ✅ Export de logs
- ✅ Trazabilidad GDPR

**Queries necesarias:**
- `getAuditLogs(tenantId, filters)`
- `exportAuditLogs(tenantId, dateRange)`

---

## 🔐 5. AUTENTICACIÓN Y PERMISOS

### Roles en Portal Empresa:
```typescript
enum CompanyUserRole {
  ADMIN_EMPRESA       // Full access (CEO, Director)
  RRHH               // Empleados, pedidos, config
  FINANZAS           // Facturación, fiscalidad, export
  MANAGER_SEDE       // Solo su sede
  VIEWER             // Solo lectura
}
```

### Permisos por rol:
```typescript
ADMIN_EMPRESA: ['*'] // Todo

RRHH: [
  'employees:read', 'employees:create', 'employees:update',
  'orders:read',
  'config:read', 'config:update',
  'incidents:read', 'incidents:create'
]

FINANZAS: [
  'invoices:read', 'invoices:export',
  'fiscal:read', 'fiscal:generate',
  'orders:read', 'orders:export'
]

MANAGER_SEDE: [
  'employees:read:own_site',
  'orders:read:own_site',
  'incidents:read:own_site'
]

VIEWER: [
  'dashboard:read',
  'employees:read',
  'orders:read'
]
```

---

## 🔗 6. RELACIÓN CON SUPER ADMIN

### Lo que Super Admin configura → Lo que Empresa ve:

| Super Admin | Portal Empresa |
|-------------|----------------|
| Crea empresa + plan | Ve su configuración (solo edición limitada) |
| Asigna catering PRIMARY | Ve info del catering (no puede cambiar) |
| Define SLAs | Ve cumplimiento de SLAs |
| Crea usuarios iniciales | Puede invitar más usuarios (RRHH) |
| Configura policy | Puede solicitar cambios (no editar directamente) |
| Suspende empresa | Portal bloqueado con mensaje |

### Flujos compartidos:
```
Super Admin crea empresa
  ↓
Super Admin asigna catering
  ↓
Super Admin crea usuario admin inicial
  ↓
Admin empresa recibe email de invitación
  ↓
Admin empresa accede al portal
  ↓
Admin empresa da de alta empleados
  ↓
Empleados reciben invitación
  ↓
Empleados hacen pedidos
  ↓
Empresa ve pedidos en tiempo real
  ↓
Catering sirve pedidos
  ↓
Empresa ve factura mensual
  ↓
Empresa genera dossier fiscal
```

---

## 📊 7. KPIs DEL DASHBOARD (Detalle)

### Tarjetas principales:
1. **Empleados Activos** - Con al menos 1 pedido esta semana
2. **Pedidos Hoy/Semana/Mes** - Números absolutos
3. **% Gasto Deducible** - Verde >95%, Amarillo 85-95%, Rojo <85%
4. **Ticket Medio** - Precio promedio por pedido
5. **Coste Total Mes** - Suma de todos los pedidos
6. **Tasa Cancelación** - % de pedidos cancelados
7. **Incidencias Abiertas** - Contador con badge rojo si >5
8. **Satisfacción Catering** - Rating promedio (estrellas)

### Gráficas:
1. **Evolución Consumo** - Línea últimos 30 días (pedidos/día)
2. **Usuarios Activos vs Inactivos** - Donut chart
3. **Comparativa Semanal** - Barras últimas 4 semanas
4. **Gasto por Departamento** - Barras horizontales (top 5)

### Alertas automáticas:
```typescript
type Alert = {
  type: 'invoice' | 'sla' | 'employee' | 'cancellation' | 'fiscal'
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  actionUrl?: string
}

Ejemplos:
- "Factura pendiente de pago" (error)
- "Catering SLA <90%" (warning)
- "15 empleados sin menú asignado" (warning)
- ">20% cancelaciones esta semana" (warning)
- "Días sin trazabilidad fiscal" (error)
```

---

## 🎨 8. DISEÑO UI/UX

### Principios:
- ✅ **Simplicidad** - RRHH no es técnico
- ✅ **Claridad fiscal** - Todo lo relacionado con deducibilidad MUY visible
- ✅ **Rapidez** - Operaciones comunes en <3 clics
- ✅ **Mobile-friendly** - Responsive al 100%
- ✅ **Exportar todo** - Botón de export en cada sección

### Paleta de colores:
```
Primary: Azul corporativo (empresa)
Success: Verde (deducible, OK)
Warning: Amarillo (alertas, revisar)
Error: Rojo (problemas, urgente)
Info: Gris azulado (neutro)
```

---

## ✅ 9. CHECKLIST PRE-IMPLEMENTACIÓN

Antes de empezar a codificar, necesitamos:

### Base de Datos:
- [ ] Crear migration para `dishes`
- [ ] Crear migration para `dish_schedules`
- [ ] Crear migration para `fiscal_reports`
- [ ] Crear migration para `delivery_proofs`
- [ ] Crear migration para `notifications`
- [ ] Crear migration para `company_settings`
- [ ] Actualizar schema de Prisma

### Autenticación:
- [ ] Middleware de autenticación para portal empresa
- [ ] Verificación de rol y permisos
- [ ] Sesiones con tenant_id correcto
- [ ] Prevenir acceso a datos de otras empresas

### Layout:
- [ ] Layout base del portal empresa (diferente al admin)
- [ ] Navbar con logo empresa + usuario
- [ ] Sidebar con navegación
- [ ] Footer con info legal

### Queries Base:
- [ ] `getCompanyDashboard()`
- [ ] `getCompanyKPIs()`
- [ ] `getEmployees()`
- [ ] `getOrders()`
- [ ] Helpers de auditoría

---

## 🚀 10. SIGUIENTE PASO

**¿Por dónde empezamos?**

Propongo empezar con:
1. **FASE 1: Dashboard** - Para que la empresa vea algo inmediatamente
2. **FASE 2: Empleados** - Es el core del servicio

**¿Estás de acuerdo?** ¿O prefieres otro orden?

Una vez confirmes, empezaré con:
1. Migrations de BD faltantes
2. Auth y middleware
3. Layout del portal
4. Dashboard con KPIs

---

**Total estimado:** 9 fases × ~200-300 líneas cada una = **~2,500 líneas**

¿Continuamos? 🚀

