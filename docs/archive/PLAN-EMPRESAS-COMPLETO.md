# 📋 PLAN COMPLETO - Sección EMPRESAS (Como Caterings)

## 🎯 Objetivo

Crear una **sección completa de gestión de Empresas** con el mismo nivel de detalle que Caterings, **usando las relaciones reales de la base de datos** y **sin duplicar código ni datos**.

---

## 🔗 **RELACIONES CLAVE EN LA BASE DE DATOS**

### 📊 **Estructura de Datos**

```
Tenant (tipo: EMPRESA)
├── Company
│   ├── CompanyPolicy (límite diario, días activos, copago)
│   └── CompanySite[] (sedes/oficinas)
│       └── Employee[] (empleados por sede)
│           └── Order[] (pedidos de cada empleado)
│               ├── tenantEmpresa (FK → Tenant empresa)
│               ├── tenantCatering (FK → Tenant catering)
│               ├── Incident[] (incidencias del pedido)
│               └── OrderHistory[] (versionado)
├── Users[] (usuarios del tenant)
├── Invoice[] (facturas recibidas de caterings)
│   └── InvoiceLine[] (líneas de factura por pedido)
├── Incident[] (todas las incidencias de la empresa)
├── DailySnapshot[] (compliance fiscal diario)
└── CompanyExport[] (exportaciones ERP/nómina)
```

### ✅ **LO QUE YA EXISTE Y DEBEMOS REUTILIZAR**

1. **Queries existentes** (`lib/db/queries/companies.ts`):
   - `getCompanyById()` - básico, necesita ampliarse
   - `createCompany()` - completo ✅
   - `updateCompany()` - completo ✅

2. **Queries de caterings** (`lib/db/queries/caterings.ts`):
   - Lógica de KPIs 30/90 días → **reutilizar patrón**
   - Lógica de alertas → **reutilizar patrón**
   - Estructura de tabs → **reutilizar componentes**

3. **Componentes globales**:
   - `TenantsTable` - ya filtra por tipo ✅
   - `AdminLayout` con Toaster ✅
   - shadcn/ui completo ✅

---

## 📅 **PLAN POR FASES (Similar a Caterings)**

### **FASE 1: Queries y Datos Reales**

#### **1.1 Ampliar `lib/db/queries/companies.ts`**

**Nuevas funciones a crear:**

```typescript
// 1. Listado de empresas con KPIs globales
export async function getCompanies({
  page, pageSize, search, status, plan,
  documentsStatus, deducibilidad
}): Promise<{
  companies: CompanyListItem[]
  pagination: PaginationInfo
}>

// 2. Detalle completo de empresa (como getCateringById)
export async function getCompanyByIdComplete(tenantId: string): Promise<{
  // Info base
  id, name, status, legalName, cif, plan, etc.
  
  // Company + Policy
  company: {
    policy: CompanyPolicy
  }
  
  // Sedes con empleados
  sites: CompanySite[]
  
  // KPIs 30/90 días
  kpis: {
    ordersLast30Days, ordersLast90Days,
    activeEmployees, totalEmployees,
    adoptionRate, avgSpendPerDay,
    deductibleRate, incidentsCount,
    cancelationRate, noShowRate
  }
  
  // Alertas
  alerts: {
    lowAdoption: boolean
    lowDeductibility: boolean
    unpaidInvoices: Invoice[]
    criticalIncidents: Incident[]
    employeesWithoutCatering: Employee[]
  }
  
  // Caterings asignados
  assignedCaterings: {
    primary: Restaurant
    backups: Restaurant[]
  }
  
  // Usuarios
  users: User[]
  
  // Empleados
  employees: Employee[]
  
  // Incidencias
  incidents: Incident[]
  
  // Facturas
  invoices: Invoice[]
}>

// 3. Obtener empleados de una empresa con detalles
export async function getCompanyEmployees(
  tenantId: string,
  {filters, pagination}
): Promise<{
  employees: EmployeeWithStats[]
  pagination: PaginationInfo
}>

// 4. Obtener pedidos de una empresa
export async function getCompanyOrders(
  tenantId: string,
  {filters, pagination}
): Promise<{
  orders: OrderWithDetails[]
  stats: OrderStats
  pagination: PaginationInfo
}>

// 5. Obtener facturas de una empresa
export async function getCompanyInvoices(
  tenantId: string,
  {period, status}
): Promise<{
  invoices: InvoiceWithLines[]
  totals: InvoiceTotals
}>

// 6. Obtener incidencias de una empresa
export async function getCompanyIncidents(
  tenantId: string,
  {filters}
): Promise<{
  incidents: IncidentWithDetails[]
  stats: IncidentStats
}>

// 7. Obtener métricas fiscales de deducibilidad
export async function getCompanyFiscalMetrics(
  tenantId: string,
  period: string
): Promise<{
  totalSpend: number
  deductibleSpend: number
  deductibleRate: number
  overLimitDays: number[]
  estimatedSavings: number
}>

// 8. Asignar catering a empresa
export async function assignCateringToCompany(
  tenantId: string,
  cateringId: string,
  type: 'PRIMARY' | 'BACKUP'
): Promise<void>

// 9. Generar reporte fiscal mensual
export async function generateFiscalReport(
  tenantId: string,
  period: string
): Promise<FiscalReport>
```

**❌ NO DUPLICAR:**
- Lógica de KPIs → usar mismo patrón que caterings
- Queries de incidencias → filtrar por `tenantEmpresa`
- Queries de pedidos → filtrar por `tenantEmpresa`

---

### **FASE 2: Página de Listado Mejorada**

#### **2.1 KPIs Globales Component**

**Archivo:** `components/admin/companies/CompaniesGlobalKPIs.tsx`

**Props:**
```typescript
type CompaniesGlobalKPIsProps = {
  kpis: {
    activeCompanies: number
    suspendedCompanies: number
    pilotCompanies: number
    totalEmployees: number
    activeEmployees: number
    ordersToday: number
    ordersDelivered: number
    ordersWithIncident: number
    avgDeductibilityRate: number
    avgTicket: number
    totalBilled: number
    cancelationRate: number
    incidentsOpen: number
    activeCaterings: number
  }
}
```

**UI:** 8 cards con semáforos (verde/amarillo/rojo)

---

#### **2.2 Companies Table Component**

**Archivo:** `components/admin/companies/CompaniesTable.tsx`

**Columnas:**
1. Nombre + Logo
2. CIF
3. Estado (badge)
4. Nº Empleados Activos / Total
5. Catering Asignado
6. Gasto Mes (€)
7. % Deducible (semáforo)
8. Última Factura
9. Incidencias
10. Acciones

**Filtros:**
- Estado (activo, prueba, suspendido)
- Plan (starter, growth, enterprise)
- Catering asignado
- % Deducible (>95%, 80-95%, <80%)
- Tamaño (empleados)
- Impago

---

#### **2.3 Actualizar `/admin/empresas/page.tsx`**

```typescript
import { CompaniesGlobalKPIs } from '@/components/admin/companies/CompaniesGlobalKPIs'
import { CompaniesTable } from '@/components/admin/companies/CompaniesTable'
import { getCompanies } from '@/lib/db/queries/companies'

export default async function CompaniesPage() {
  const { companies, pagination } = await getCompanies({
    page: 1,
    pageSize: 50
  })
  
  // Calcular KPIs globales
  const kpis = calculateGlobalKPIs(companies)
  
  return (
    <>
      {/* Header + CTAs */}
      <div className="flex justify-between">
        <h1>Empresas</h1>
        <div>
          <Button href="/admin/empresas/new">Crear Empresa</Button>
          <Button variant="outline">Ver impagos</Button>
          <Button variant="outline">Baja trazabilidad</Button>
        </div>
      </div>
      
      {/* KPIs Globales */}
      <CompaniesGlobalKPIs kpis={kpis} />
      
      {/* Tabla */}
      <CompaniesTable companies={companies} />
    </>
  )
}
```

---

### **FASE 3: Página de Detalle con Tabs**

#### **3.1 Estructura de Tabs**

**Archivo:** `app/(admin)/admin/empresas/[id]/page.tsx`

**Tabs:**
1. Overview (resumen)
2. Configuración
3. Empleados
4. Pedidos y Consumo
5. Facturación y Pagos
6. Incidencias
7. Usuarios y Permisos
8. Registro de Actividad

---

#### **3.2 Tab 1: Overview**

**Componente:** `components/admin/companies/CompanyOverviewTab.tsx`

**Secciones:**
- **KPIs 30/90 días** (tarjetas)
  - Gasto total, Gasto deducible, % Deducible
  - Empleados activos, Menús servidos
  - Cancelaciones, Incidencias
- **Evolución del gasto** (gráfico línea)
- **Top 3 Caterings** por volumen y calidad
- **Estado Fiscal** (semáforo)
  - % Deducible
  - Días > 11€
  - Trazabilidad completa
- **Alertas Críticas**
  - Empleados sin catering
  - Impago
  - Baja adopción (<50%)

---

#### **3.3 Tab 2: Configuración**

**Componente:** `components/admin/companies/CompanyConfigTab.tsx`

**Secciones:**
- **Datos Legales**: razón social, CIF, dirección, sector
- **Contactos**: RRHH y Contabilidad (nombre, cargo, email, teléfono)
- **Plan y Financiación**:
  - Tipo (100% empresa, copago, flexible)
  - Límite diario (€)
  - Días hábiles activos
  - Política de cancelaciones
- **Catering Asignado**:
  - Principal + SLA
  - Backups por zona
  - Historial de caterings
- **Documentación**: contrato, anexos, CIF, certificado digital

---

#### **3.4 Tab 3: Empleados**

**Componente:** `components/admin/companies/CompanyEmployeesTab.tsx`

**Features:**
- Tabla con:
  - Nombre, Email, Departamento
  - Estado (activo, baja, suspendido)
  - Días con menú/semana
  - Último pedido
  - Acumulado mensual (€)
  - Alertas (no-show, cancelaciones)
- Acciones:
  - Alta/Baja masiva
  - Reset de cuenta
  - Reenvío invitación
  - Exportar CSV
- Botón "Sincronizar con HRIS"

---

#### **3.5 Tab 4: Pedidos y Consumo**

**Componente:** `components/admin/companies/CompanyOrdersTab.tsx`

**Features:**
- Historial diario con filtros
- Tabla:
  - Fecha, Empleado, Catering, Menú, Estado
  - Importe, Tipo (completo/medio)
- Totales: gasto diario, % deducible, cancelaciones
- Botones:
  - "Exportar CSV"
  - "Generar informe mensual"
  - "Justificante fiscal"

---

#### **3.6 Tab 5: Facturación y Pagos**

**Componente:** `components/admin/companies/CompanyBillingTab.tsx`

**Features:**
- KPIs:
  - Facturado mes, Facturado año
  - Pendiente de pago
  - DSO (días cobro)
- Facturas de Caterings (tabla)
  - Periodo, Catering, Importe, Estado, PDF
- Facturas de Comida.com (cuota + comisión)
- Módulo de conciliación automática
- Panel de ahorro fiscal:
  - Total deducido IRPF/IS
  - ROI del beneficio social

---

#### **3.7 Tab 6: Incidencias**

**Componente:** `components/admin/companies/CompanyIncidentsTab.tsx`

**Features:**
- Cola de incidencias con filtros
  - Origen (catering, empleado, logística, facturación)
  - Tipo, Severidad, Estado
- Tiempos de resolución (SLA)
- Comentarios y compensaciones
- Acciones: Resolver, Escalar, Compensar
- Export mensual

---

#### **3.8 Tab 7: Usuarios y Permisos**

**Reutilizar:** `components/admin/caterings/UsersPermissionsTab.tsx`

**Ajustes:** Filtrar por roles de empresa (ADMIN_EMPRESA, RRHH, FINANZAS, etc.)

---

#### **3.9 Tab 8: Registro de Actividad**

**Reutilizar:** `components/admin/caterings/ActivityLogTab.tsx`

---

### **FASE 4: Componentes Compartidos**

#### **4.1 Reutilizar de Caterings**

✅ **Ya existen y se pueden reutilizar:**
- `UsersPermissionsTab` → Adaptar filtros de roles
- `ActivityLogTab` → Funciona igual
- `UploadDocumentModal` → Funciona igual (cambiar a documentos de empresa)

❌ **NO DUPLICAR:**
- Lógica de KPIs
- Lógica de alertas
- Componentes de tablas
- Modales

---

### **FASE 5: Acciones del Súper Admin**

#### **5.1 Crear Empresa (Wizard)**

**Ya existe:** `CompanyForm.tsx` → **Mejorar a wizard multi-paso**

**Pasos:**
1. Datos legales y fiscales
2. Configuración de plan y copago
3. Sede inicial
4. Usuario admin inicial
5. Catering asignado
6. Revisión y Crear

---

#### **5.2 Acciones Disponibles**

**Componente:** `components/admin/companies/CompanyActions.tsx`

**Acciones:**
- ✅ Editar configuración
- ✅ Activar/Suspender empresa
- ✅ Asignar/Cambiar catering
- ✅ Reasignar empleados a otro catering
- ✅ Forzar cierre contable mensual
- ✅ Generar informe fiscal consolidado
- ✅ Impersonar empresa
- ✅ Exportar reportes masivos

---

## 🔄 **RELACIONES CRÍTICAS A IMPLEMENTAR**

### **1. Empresa ↔ Catering**

**Tabla intermedia necesaria:**
```prisma
model CompanyCateringAssignment {
  id             String   @id @default(uuid())
  tenantEmpresa  String   @map("tenant_empresa")
  tenantCatering String   @map("tenant_catering")
  type           AssignmentType // PRIMARY, BACKUP
  zones          Json     @default("[]") // Zonas específicas
  assignedAt     DateTime @default(now()) @map("assigned_at")
  assignedBy     String   @map("assigned_by")
  active         Boolean  @default(true)
  
  @@unique([tenantEmpresa, tenantCatering, type])
  @@index([tenantEmpresa, active])
  @@map("company_catering_assignments")
}
```

**Migration:** Crear esta tabla

---

### **2. Order → Empresa + Catering**

✅ **Ya existe:**
- `Order.tenantEmpresa` → FK a Tenant empresa
- `Order.tenantCatering` → FK a Tenant catering

**Queries:**
```typescript
// Pedidos de una empresa (desde cualquier catering)
prisma.order.findMany({
  where: { tenantEmpresa: companyId }
})

// Pedidos de una empresa en un catering específico
prisma.order.findMany({
  where: { 
    tenantEmpresa: companyId,
    tenantCatering: cateringId
  }
})
```

---

### **3. Incident → Empresa + Catering**

✅ **Ya existe:**
- `Incident.tenantEmpresa`
- `Incident.tenantCatering`

**Queries:**
```typescript
// Incidencias de una empresa
prisma.incident.findMany({
  where: { tenantEmpresa: companyId }
})
```

---

### **4. Invoice → Empresa + Catering**

✅ **Ya existe:**
- `Invoice.tenantEmpresa` (quien recibe la factura)
- `Invoice.tenantCatering` (quien emite la factura)

---

## 📊 **MÉTRICAS Y KPIs A CALCULAR**

### **KPIs Globales (Listado)**

```typescript
{
  activeCompanies: count(status = ACTIVE)
  suspendedCompanies: count(status = SUSPENDED)
  pilotCompanies: count(status = PILOT)
  totalEmployees: sum(employees)
  activeEmployees: count(distinct employeeId in orders last 7 days)
  ordersToday: count(serviceDate = today)
  ordersDelivered: count(status = DELIVERED, today)
  ordersWithIncident: count(incidents > 0, today)
  avgDeductibilityRate: avg(deductibleSpend / totalSpend)
  avgTicket: avg(order.price)
  totalBilled: sum(invoices.total, current month)
  cancelationRate: count(status = CANCELLED) / count(total)
  incidentsOpen: count(incidents.status = OPEN)
  activeCaterings: count(distinct tenantCatering)
}
```

### **KPIs por Empresa (Detalle)**

```typescript
{
  // 30 días
  ordersLast30Days: count
  activeEmployees: distinct employeeId
  totalSpend: sum(price)
  deductibleSpend: sum(price where price <= 11€/día)
  deductibleRate: deductibleSpend / totalSpend
  avgSpendPerDay: totalSpend / daysActive
  incidentsCount: count
  cancelationRate: %
  noShowRate: %
  adoptionRate: activeEmployees / totalEmployees
  
  // 90 días (mismos pero más período)
}
```

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

### **FASE 1: Datos**
- [ ] Crear migration para `CompanyCateringAssignment`
- [ ] Ampliar `getCompanies()` con KPIs
- [ ] Crear `getCompanyByIdComplete()`
- [ ] Crear `getCompanyEmployees()`
- [ ] Crear `getCompanyOrders()`
- [ ] Crear `getCompanyInvoices()`
- [ ] Crear `getCompanyIncidents()`
- [ ] Crear `getCompanyFiscalMetrics()`
- [ ] Crear `assignCateringToCompany()`
- [ ] Seed de datos de prueba

### **FASE 2: Listado**
- [ ] Componente `CompaniesGlobalKPIs`
- [ ] Componente `CompaniesTable`
- [ ] Actualizar `/admin/empresas/page.tsx`

### **FASE 3: Detalle - Tab 1**
- [ ] Componente `CompanyOverviewTab`
- [ ] Integrar en `/admin/empresas/[id]/page.tsx`

### **FASE 3: Detalle - Tab 2**
- [ ] Componente `CompanyConfigTab`

### **FASE 3: Detalle - Tab 3**
- [ ] Componente `CompanyEmployeesTab`

### **FASE 3: Detalle - Tab 4**
- [ ] Componente `CompanyOrdersTab`

### **FASE 3: Detalle - Tab 5**
- [ ] Componente `CompanyBillingTab`

### **FASE 3: Detalle - Tab 6**
- [ ] Componente `CompanyIncidentsTab`

### **FASE 3: Detalle - Tab 7**
- [ ] Adaptar `UsersPermissionsTab`

### **FASE 3: Detalle - Tab 8**
- [ ] Adaptar `ActivityLogTab`

### **FASE 4: Wizard**
- [ ] Mejorar `CompanyForm` a wizard

### **FASE 5: Acciones**
- [ ] Componente `CompanyActions`
- [ ] Implementar acciones (suspender, asignar catering, etc.)

---

## 🚀 **ORDEN DE EJECUCIÓN**

1. **FASE 1** - Crear todas las queries y datos
2. **FASE 2** - Listado mejorado con KPIs
3. **FASE 3.1** - Tab Overview
4. **FASE 3.2** - Tab Configuración
5. **FASE 3.3** - Tab Empleados
6. **FASE 3.4** - Tab Pedidos
7. **FASE 3.5** - Tab Facturación
8. **FASE 3.6** - Tab Incidencias
9. **FASE 3.7-3.8** - Tabs Usuarios y Actividad
10. **FASE 4** - Wizard mejorado
11. **FASE 5** - Acciones admin

---

## 📝 **NOTAS IMPORTANTES**

### ✅ **LO QUE DEBEMOS HACER:**
1. Usar las relaciones REALES de Prisma
2. Reutilizar componentes de Caterings
3. Reutilizar patrones de queries
4. Usar shadcn/ui (ya migrado)
5. Crear datos de prueba (seed)

### ❌ **LO QUE NO DEBEMOS HACER:**
1. Hardcodear datos
2. Duplicar queries
3. Duplicar componentes
4. Crear nuevas tablas sin consultar
5. Ignorar las FK existentes

---

**Última actualización:** 2025-11-17  
**Estado:** Pendiente de inicio  
**Prioridad:** 🔥 Alta

