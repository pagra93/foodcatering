# 🗄️ Base de Datos - Arquitectura y Schema

## Visión General

Base de datos **PostgreSQL** con arquitectura **multi-tenant lógica**. Cada entidad crítica incluye `tenant_id` para aislamiento de datos.

---

## 📊 Estadísticas del Schema

```
✅ 31 Tablas principales
✅ 21 Enums (estados, tipos, etc.)
✅ Multi-tenant con 3 tipos: ROOT, EMPRESA, CATERING
✅ Trazabilidad completa (audit_logs + order_history)
✅ Compliance fiscal (snapshots diarios firmados)
```

---

## 🏗️ Arquitectura Multi-Tenant

### Tipos de Tenant

```typescript
enum TenantType {
  ROOT      // Súper admin (admin.comida.com)
  EMPRESA   // Clientes corporativos (acme.comida.com)
  CATERING  // Proveedores (deliciasexpress.comida.com)
}
```

### Aislamiento de Datos

- ✅ Casi todas las tablas tienen `tenant_id`
- ✅ Middleware inyecta `tenant_id` en contexto
- ✅ Queries siempre filtran por tenant (salvo root)
- ✅ Tests E2E validan aislamiento

---

## 📋 Tablas por Módulo

### 1️⃣ CORE (Multi-tenancy y Usuarios)

#### `tenants`
Registro de todos los tenants del sistema.

```prisma
- id (uuid, PK)
- type (ROOT|EMPRESA|CATERING)
- name
- subdomain (unique)
- config (json) // Branding, features, etc.
- status (ACTIVE|SUSPENDED|INACTIVE)
```

**Índices**: `subdomain`, `type+status`

#### `users`
Usuarios de cada tenant.

```prisma
- id (uuid, PK)
- tenant_id (FK tenants)
- email
- password_hash
- name_enc (cifrado)
- phone_enc (cifrado, opcional)
- role (enum: 11 roles diferentes)
- mfa_enabled
- status (ACTIVE|DISABLED|PENDING)
```

**Índices**: `tenant_id+email` (unique), `tenant_id+status`

**Roles disponibles**:
- ROOT: `super_admin`, `auditor`
- EMPRESA: `admin_empresa`, `rrhh`, `finanzas`, `manager_sede`, `empleado`
- CATERING: `admin_catering`, `chef`, `cocinero`, `repartidor`, `finanzas_catering`

---

### 2️⃣ EMPRESAS

#### `companies`
Datos legales y configuración de empresa.

```prisma
- id (uuid, PK)
- tenant_id (FK tenants, unique)
- legal_name
- cif (unique)
- billing_address
- plan (STARTER|GROWTH|ENTERPRISE)
```

#### `company_sites`
Sedes/oficinas de la empresa.

```prisma
- id (uuid, PK)
- tenant_id
- company_id (FK companies)
- name
- address
- delivery_window (time range)
- active
```

#### `company_policies`
Política de beneficio de comida.

```prisma
- id (uuid, PK)
- tenant_id
- company_id (FK companies, unique)
- cutoff_time (HH:mm, default "11:00")
- days_active (json array)
- limit_per_day (decimal, default 11.00)
- copay_company (decimal)
- copay_employee (decimal)
- no_show_rule (CHARGE|NO_CHARGE|PARTIAL)
- effective_from, effective_to (opcional)
```

#### `employees`
Empleados con acceso al beneficio.

```prisma
- id (uuid, PK)
- tenant_id
- user_id (FK users)
- site_id (FK company_sites)
- diet_prefs (json) // Alergias, preferencias, calorías
- status
```

---

### 3️⃣ CATERINGS/RESTAURANTES

#### `restaurants`
Datos del catering.

```prisma
- id (uuid, PK)
- tenant_id (FK tenants, unique)
- display_name
- zones (json array de CPs)
- documents_status (OK|WARNING|BLOCKED)
```

#### `restaurant_documents`
Certificados y documentación sanitaria.

```prisma
- id (uuid, PK)
- tenant_id
- restaurant_id (FK restaurants)
- type (REGISTRO_SANITARIO|RC|MANIPULADORES|OTROS)
- file_url
- issued_at, expires_at
- status (VALID|EXPIRING|EXPIRED)
- verified_by, verified_at
```

**Alertas automáticas** cuando `expires_at` < 30 días.

---

### 4️⃣ PLATOS Y MENÚS

#### `dishes`
Catálogo de platos del catering.

```prisma
- id (uuid, PK)
- tenant_id (catering)
- restaurant_id (FK restaurants)
- name
- course (FIRST|SECOND|DESSERT)
- labels (json) // [alérgenos, etiquetas nutricionales]
- nutrition (json) // {kcal, protein, carbs, fat}
- base_price (decimal)
- active
```

#### `dish_schedules`
Disponibilidad de platos por día.

```prisma
- id (uuid, PK)
- tenant_id (catering)
- dish_id (FK dishes)
- date
- stock_limit (int, opcional)
- visible_to (json) // "all" | {companies: [], zones: []}
- price_override (decimal, opcional)
- status (PUBLISHED|HIDDEN)
```

**Unique**: `tenant_id + dish_id + date`

---

### 5️⃣ PEDIDOS (Núcleo del Sistema) ⭐

#### `orders`
Estado actual de cada pedido.

```prisma
- id (uuid, PK)
- tenant_empresa (FK tenants)
- tenant_catering (FK tenants)
- employee_id (FK employees)
- service_date (date)
- site_id (FK company_sites)
- selection (json) // {first: {dish_id, name}, second: {...}, dessert: {...}}
- price (decimal)
- menu_type (FULL|HALF)
- status (9 estados posibles)
- status_changed_at
- locked_at (timestamp del cutoff)
- created_by (user_id)
- last_modified_by (user_id)
- version (int, incrementa con cada cambio)
- integrity_hash (SHA-256)
```

**Estados del pedido** (FSM):
```
DRAFT → CONFIRMED → [CANCELLED_BEFORE_CUTOFF | LOCKED_AFTER_CUTOFF]
LOCKED_AFTER_CUTOFF → [DELIVERED | NO_SHOW | ISSUE_REPORTED]
ISSUE_REPORTED → [COMPENSATED | REJECTED]
```

**Índices críticos**:
- `tenant_empresa + employee_id + service_date` (unique, 1 pedido/día/empleado)
- `tenant_catering + service_date` (consolidación)
- `service_date + status` (queries operativas)

#### `order_history`
Versionado inmutable de cada cambio.

```prisma
- id (uuid, PK)
- order_id (FK orders)
- version (int)
- changed_at
- changed_by (user_id)
- change_reason (enum: 7 razones)
- prev_values (json, opcional)
- new_values (json)
- integrity_hash (SHA-256)
```

**Append-only**: Nunca se edita ni borra. Base de auditoría fiscal.

---

### 6️⃣ CONSOLIDACIÓN Y OPERACIÓN

#### `kitchen_sheets`
Resumen por plato para cocina (11:05 AM).

```prisma
- id (uuid, PK)
- tenant_catering
- service_date (date)
- generated_at
- content (json) // [{dish_id, course, qty, tags}]
- signature_hash
```

**Unique**: `tenant_catering + service_date`

#### `packing_sheets`
Resumen nominativo para empaquetado.

```prisma
- id (uuid, PK)
- tenant_catering
- tenant_empresa
- service_date (date)
- generated_at
- content (json) // [{employee_id, employee_name, selection, label_qr}]
- signature_hash
```

**Unique**: `tenant_catering + tenant_empresa + service_date`

#### `delivery_events`
Tracking de entregas.

```prisma
- id (uuid, PK)
- order_id (FK orders)
- timestamp
- marked_by (user_id)
- event (PACKED|OUT_FOR_DELIVERY|DELIVERED|FAILED)
- notes
```

---

### 7️⃣ FACTURACIÓN

#### `invoices`
Facturas catering → empresa.

```prisma
- id (uuid, PK)
- tenant_catering
- tenant_empresa
- period (YYYY-MM)
- number (serie + correlativo)
- issue_date, due_date
- subtotal, tax_rate, tax_amount, total (decimales)
- status (DRAFT|ISSUED|SENT|PAID|VOID)
- pdf_url
```

**Unique**: `tenant_catering + tenant_empresa + period`

#### `invoice_lines`
Líneas de factura (trazables a pedidos).

```prisma
- id (uuid, PK)
- invoice_id (FK invoices)
- date (date del pedido)
- order_id (FK orders)
- employee_id (nominativo)
- concept (string, ej: "Gazpacho + Merluza + Yogur")
- amount (decimal)
- facturable_flag (FULL|HALF|NONE)
- note (motivo si no es FULL)
```

#### `company_exports`
Exports contables (ERP/nómina).

```prisma
- id (uuid, PK)
- tenant_empresa
- period (YYYY-MM)
- type (ERP_CSV|PAYROLL_CSV|SUMMARY_PDF)
- file_url
- created_at
```

---

### 8️⃣ INCIDENCIAS Y CALIDAD

#### `incidents`
Incidencias operativas.

```prisma
- id (uuid, PK)
- tenant_empresa
- tenant_catering
- order_id (FK orders, nullable)
- type (string, de catálogo)
- severity (LOW|MEDIUM|HIGH)
- status (OPEN|IN_PROGRESS|RESOLVED|COMPENSATED)
- opened_by, assigned_to
- resolution (json) // {type, amount, details}
- created_at, updated_at, resolved_at
```

**Índices**: `tenant_empresa + status`, `tenant_catering + status`

#### `restaurant_audits`
Auditorías de calidad a caterings.

```prisma
- id (uuid, PK)
- tenant_catering
- audit_type (SANITARIA|OPERATIVA|SATISFACCION)
- score (int)
- report_url
- audited_at, audited_by
- notes
```

---

### 9️⃣ SNAPSHOTS DIARIOS (Compliance Fiscal)

#### `daily_snapshots`
Snapshot diario firmado (retención 4 años).

```prisma
- id (uuid, PK)
- tenant_empresa
- tenant_catering
- service_date (date)
- generated_at (23:59)
- orders_summary (json)
- sign_hash (SHA-256 firmado)
- file_url (PDF/CSV)
```

**Unique**: `tenant_empresa + tenant_catering + service_date`

**Generación automática**: Cron job 23:59 cada día.

---

### 🔟 AUDITORÍA GLOBAL

#### `audit_logs`
Log inmutable de todas las acciones.

```prisma
- id (uuid, PK)
- tenant_id (nullable para acciones root)
- actor_id (user_id)
- action (CREATE|UPDATE|DELETE|IMPERSONATE|POLICY_CHANGE|BILLING_RUN)
- entity (string, tabla afectada)
- entity_id (uuid)
- diff (json) // {before: {...}, after: {...}}
- ip, user_agent
- timestamp
- hash (SHA-256 encadenado)
```

**Append-only**: Nunca se edita ni borra. Tamper-evident con hash encadenado.

---

### 1️⃣1️⃣ INTEGRACIONES

#### `integrations`
Configuración de integraciones por tenant.

```prisma
- id (uuid, PK)
- tenant_id
- type (ERP|SSO|PAYMENTS|MESSAGING)
- config (json)
- status (ACTIVE|INACTIVE|ERROR)
```

#### `webhooks`
Webhooks configurados.

```prisma
- id (uuid, PK)
- tenant_id
- event (string, ej: "orders.consolidated")
- target_url
- secret
- active
```

#### `webhook_deliveries`
Log de entregas de webhooks.

```prisma
- id (uuid, PK)
- webhook_id (FK webhooks)
- event_id
- status (int, HTTP code)
- retries
- last_attempt_at
- payload (json)
- response (json)
```

---

## 🔐 Seguridad y Compliance

### Cifrado
- ✅ Columnas PII cifradas: `name_enc`, `phone_enc`
- ✅ Hashes de integridad: SHA-256 en pedidos y snapshots
- ✅ Secrets en vault (no en DB)

### Trazabilidad
- ✅ `audit_logs`: append-only, hash encadenado
- ✅ `order_history`: versionado completo
- ✅ `daily_snapshots`: firmados digitalmente

### Retención
- ✅ 4 años mínimo (obligación fiscal España)
- ✅ Soft delete con `deleted_at`
- ✅ Particionado por fecha en tablas grandes

---

## 📈 Optimizaciones

### Índices Críticos
```sql
-- Queries más frecuentes
orders (tenant_empresa, service_date, employee_id)
orders (tenant_catering, service_date, status)
dish_schedules (date, tenant_id)
invoice_lines (invoice_id, date)
incidents (tenant_empresa, status, created_at)
```

### Particionado (Futuro)
```sql
-- Cuando haya volumen (>100K pedidos/mes)
PARTITION orders BY RANGE (service_date)
PARTITION order_history BY RANGE (changed_at)
PARTITION audit_logs BY RANGE (timestamp)
```

### Vistas Materializadas (Futuro)
```sql
-- KPIs por tenant (refresco horario)
vw_kpis_tenant_empresa
vw_kpis_tenant_catering
vw_top_dishes
```

---

## 🚀 Comandos Útiles

```bash
# Generar Prisma Client
pnpm db:generate

# Push schema a DB (dev)
pnpm db:push

# Crear migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones (prod)
npx prisma migrate deploy

# Seed inicial
pnpm db:seed

# Abrir Prisma Studio
pnpm db:studio

# Resetear DB (⚠️ borra todo)
npx prisma migrate reset
```

---

## 📚 Recursos

- [Prisma Docs](https://www.prisma.io/docs)
- [Multi-tenancy Guide](https://www.prisma.io/docs/guides/database/multi-tenancy)
- [PRD Completo](../prd.md)
- [Schema Prisma](../prisma/schema.prisma)

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2025  
**Estado**: ✅ Schema completo y listo para desarrollo

