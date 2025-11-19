# 🗄️ Entendiendo Prisma y PostgreSQL

## 🎯 **La Verdad Simple**

**Los datos están en PostgreSQL, NO en Prisma.**

Prisma es solo una herramienta que te facilita hablar con PostgreSQL desde tu código TypeScript.

---

## 📊 **Flujo de Datos Real**

```
┌─────────────────────────────────────────────────────────────┐
│  1. TU CÓDIGO (TypeScript)                                  │
│                                                             │
│  const orders = await prisma.order.findMany({              │
│    where: { tenantEmpresa: "123" }                         │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  2. PRISMA (ORM - Traductor)                                │
│                                                             │
│  Convierte tu código TypeScript a SQL:                      │
│  SELECT * FROM orders WHERE tenant_empresa = '123';         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  3. POSTGRESQL (Base de Datos - AQUÍ ESTÁN LOS DATOS)      │
│                                                             │
│  Servidor: localhost:5432                                   │
│  Base de datos: comidas_dev                                 │
│                                                             │
│  Tablas físicas:                                            │
│  - tenants                                                  │
│  - users                                                    │
│  - companies                                                │
│  - employees                                                │
│  - orders                                                   │
│  - fiscal_reports                                           │
│  - audit_logs                                               │
│  ... (50+ tablas reales)                                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  4. DATOS DEVUELTOS                                         │
│                                                             │
│  PostgreSQL → Prisma → Tu Código                            │
│  [{ id: "abc", price: 7.50, ... }]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 **¿Qué es Prisma exactamente?**

**Prisma es un ORM (Object-Relational Mapping)**

### **Sin Prisma (SQL directo):**
```typescript
// ❌ Complicado, propenso a errores
const result = await db.query(`
  SELECT o.*, e.name 
  FROM orders o 
  LEFT JOIN employees e ON o.employee_id = e.id 
  WHERE o.tenant_empresa = $1 
    AND o.service_date >= $2
`, [tenantId, startDate])

// Tienes que mapear manualmente los tipos
const orders: Order[] = result.rows.map(row => ({
  id: row.id,
  price: parseFloat(row.price),
  // ... más mapeo manual
}))
```

### **Con Prisma (TypeScript):**
```typescript
// ✅ Fácil, seguro, tipado
const orders = await prisma.order.findMany({
  where: {
    tenantEmpresa: tenantId,
    serviceDate: { gte: startDate }
  },
  include: {
    employee: true  // Joins automáticos
  }
})

// Ya está tipado, no necesitas mapear nada
orders[0].price  // TypeScript sabe que es Decimal
```

---

## 📍 **Dónde están tus datos REALMENTE**

### **Ubicación física:**

Tu archivo `.env` tiene esta línea:
```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/comidas_dev?schema=public"
```

**Desglosado:**
```
postgresql://           ← Tipo de base de datos
usuario:contraseña      ← Credenciales
@localhost              ← Servidor (tu máquina local)
:5432                   ← Puerto de PostgreSQL
/comidas_dev            ← Nombre de la base de datos
?schema=public          ← Schema (namespace)
```

**Los datos están en:**
- **Servidor:** Tu PostgreSQL local en `localhost:5432`
- **Base de datos:** `comidas_dev`
- **Tablas:** `orders`, `tenants`, `users`, `employees`, etc.

---

## 🛠️ **Cómo Ver los Datos DIRECTAMENTE en PostgreSQL**

### **Opción 1: Prisma Studio (Recomendado - UI visual)**

```bash
# Abre una interfaz visual para ver/editar datos
npx prisma studio
```

Esto abre `http://localhost:5555` con una interfaz gráfica donde puedes:
- ✅ Ver todas las tablas
- ✅ Ver y editar filas
- ✅ Filtrar y buscar
- ✅ Ver relaciones

### **Opción 2: psql (Terminal PostgreSQL)**

```bash
# Conéctate a PostgreSQL
psql -U usuario -d comidas_dev

# Ver todas las tablas
\dt

# Ver datos de una tabla
SELECT * FROM tenants;
SELECT * FROM orders LIMIT 10;
SELECT * FROM companies;

# Ver estructura de una tabla
\d orders

# Salir
\q
```

### **Opción 3: Cliente GUI (pgAdmin, TablePlus, DBeaver)**

Instala cualquier cliente de PostgreSQL:
- **pgAdmin** (oficial, gratis)
- **TablePlus** (bonito, pago)
- **DBeaver** (gratis, potente)

Conéctate con:
- Host: `localhost`
- Port: `5432`
- Database: `comidas_dev`
- User: tu usuario
- Password: tu contraseña

---

## 📝 **Cómo Funciona el Schema de Prisma**

### **1. Defines el schema (prisma/schema.prisma):**

```prisma
model Order {
  id            String   @id @default(uuid())
  tenantEmpresa String   @map("tenant_empresa")
  price         Decimal  @db.Decimal(8, 2)
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@map("orders")  ← Nombre real de la tabla en PostgreSQL
}
```

### **2. Generas la migración:**

```bash
# Prisma crea un archivo SQL
npx prisma migrate dev --name add_orders_table
```

Esto crea `prisma/migrations/XXXX_add_orders_table/migration.sql`:
```sql
-- ESTE ES EL SQL REAL QUE SE EJECUTA EN POSTGRESQL
CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "tenant_empresa" TEXT NOT NULL,
  "price" DECIMAL(8,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### **3. Prisma ejecuta el SQL en PostgreSQL:**

```bash
# Aplica la migración a tu base de datos
# Esto ejecuta el SQL real en PostgreSQL
npx prisma migrate deploy
```

### **4. Ahora la tabla existe FÍSICAMENTE en PostgreSQL:**

```bash
psql -U usuario -d comidas_dev
\d orders  # Ver estructura
SELECT * FROM orders;  # Ver datos
```

---

## 🔄 **Flujo Completo de una Query**

### **Cuando escribes esto en tu código:**

```typescript
// app/(empresa)/empresa/pedidos/page.tsx
const orders = await prisma.order.findMany({
  where: {
    tenantEmpresa: 'abc-123',
    status: 'DELIVERED'
  },
  include: {
    employee: {
      include: {
        user: true
      }
    }
  }
})
```

### **Prisma traduce a SQL y lo ejecuta en PostgreSQL:**

```sql
-- ESTE SQL SE EJECUTA EN TU POSTGRESQL
SELECT 
  o.*,
  e.*,
  u.*
FROM orders o
LEFT JOIN employees e ON e.id = o.employee_id
LEFT JOIN users u ON u.id = e.user_id
WHERE o.tenant_empresa = 'abc-123'
  AND o.status = 'DELIVERED';
```

### **PostgreSQL devuelve los datos:**

```json
[
  {
    "id": "ord_001",
    "price": 7.50,
    "status": "DELIVERED",
    "employee": {
      "id": "emp_001",
      "user": {
        "nameEnc": "Juan Pérez",
        "email": "juan@empresa.com"
      }
    }
  }
]
```

---

## 🗂️ **Estructura de tu Base de Datos**

### **En PostgreSQL existen FÍSICAMENTE estas tablas:**

```sql
-- Ver todas tus tablas
\dt

 Schema |            Name                | Type  |  Owner  
--------+--------------------------------+-------+---------
 public | tenants                        | table | usuario
 public | users                          | table | usuario
 public | companies                      | table | usuario
 public | company_policies               | table | usuario
 public | company_policy_history         | table | usuario
 public | company_sites                  | table | usuario
 public | company_catering_assignments   | table | usuario
 public | employees                      | table | usuario
 public | orders                         | table | usuario
 public | order_history                  | table | usuario
 public | delivery_proofs                | table | usuario
 public | order_ratings                  | table | usuario
 public | incidents                      | table | usuario
 public | fiscal_reports                 | table | usuario
 public | audit_logs                     | table | usuario
 public | restaurants                    | table | usuario
 public | restaurant_documents           | table | usuario
 public | dishes                         | table | usuario
 public | dish_schedules                 | table | usuario
 public | notifications                  | table | usuario
 public | company_settings               | table | usuario
 public | employee_invitations           | table | usuario
 ... (y más)
```

### **Cada tabla tiene filas REALES:**

```sql
-- Ver pedidos reales
SELECT id, tenant_empresa, price, status FROM orders LIMIT 5;

        id        | tenant_empresa | price | status   
------------------+----------------+-------+----------
 ord_abc123       | tenant_001     |  7.50 | DELIVERED
 ord_def456       | tenant_001     |  9.00 | CONFIRMED
 ord_ghi789       | tenant_002     | 10.50 | DELIVERED
```

---

## 🎯 **Resumen para que lo entiendas**

### **Prisma NO es una base de datos:**
- ❌ Prisma NO guarda datos
- ❌ Prisma NO es un servidor
- ✅ Prisma es solo un TRADUCTOR

### **PostgreSQL SÍ es tu base de datos:**
- ✅ PostgreSQL guarda TODOS los datos
- ✅ PostgreSQL está en `localhost:5432`
- ✅ Base de datos: `comidas_dev`
- ✅ Todas las tablas están ahí físicamente

### **Analogía simple:**

```
Prisma = Google Translate (traductor)
TypeScript = Español
SQL = Inglés
PostgreSQL = Persona que habla inglés (tiene la información)

Tú hablas en español → Google Translate traduce → 
La persona responde en inglés → Google Translate traduce de vuelta
```

---

## 🔧 **Comandos Útiles**

### **Ver el estado de tu base de datos:**

```bash
# Ver qué migraciones se han aplicado
npx prisma migrate status

# Abrir interfaz visual (Prisma Studio)
npx prisma studio

# Conectar a PostgreSQL directamente
psql -U usuario -d comidas_dev
```

### **Dentro de psql:**

```sql
-- Ver todas las tablas
\dt

-- Ver estructura de una tabla
\d orders

-- Contar filas
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM companies;

-- Ver últimos 10 pedidos
SELECT id, tenant_empresa, price, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver empresas
SELECT id, name, status FROM tenants WHERE type = 'EMPRESA';

-- Salir
\q
```

---

## 📊 **Verificar que tienes datos**

### **Desde tu terminal:**

```bash
# 1. Abrir Prisma Studio (interfaz visual)
npx prisma studio

# 2. O desde psql
psql -U usuario -d comidas_dev

# Dentro de psql:
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM companies;
```

Si todas esas queries devuelven `0`, significa que no tienes datos aún y necesitas:

1. Ejecutar el seed:
```bash
npx prisma db seed
```

2. O crear datos manualmente desde Prisma Studio

---

## 🎉 **Conclusión**

**Prisma = Herramienta para escribir código TypeScript**  
**PostgreSQL = Donde están TUS DATOS REALMENTE**

```
Código → Prisma → PostgreSQL
                    ↑
                AQUÍ están tus datos
                (localhost:5432/comidas_dev)
```

**Para ver tus datos:**
1. `npx prisma studio` (visual, fácil) ✅
2. `psql -U usuario -d comidas_dev` (terminal)
3. pgAdmin / TablePlus / DBeaver (GUI)

---

**Última actualización:** 18 de noviembre, 2025

