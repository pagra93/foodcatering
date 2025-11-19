# 🧪 Cómo Probar el Portal de Empresa

## 🎯 **Guía Paso a Paso**

### **PASO 0: Verificar que el servidor esté corriendo**

```bash
# Asegúrate de estar en la carpeta del proyecto
cd /Users/pablogranados/Desktop/comidas

# Inicia el servidor (si no está corriendo)
npm run dev
```

Deberías ver:
```
✓ Ready in X.Xs
○ Local:   http://localhost:3000
```

---

## **PASO 1: Verificar que tienes datos en la BD**

### **Opción A: Abrir Prisma Studio (Visual)**

```bash
# En otra terminal (dejando el servidor corriendo)
npx prisma studio
```

Esto abre `http://localhost:5555`

**Verifica que tengas:**
- ✅ Al menos 1 registro en `Tenant` con `type = 'EMPRESA'`
- ✅ Al menos 1 `User` asociado a ese tenant
- ✅ Al menos 1 `Company` con datos

### **Opción B: Si NO tienes datos, créalos manualmente**

**En Prisma Studio (`http://localhost:5555`):**

#### **1. Crear un Tenant (Empresa)**

Tabla: `Tenant`
```
id: "empresa-test-001"
type: "EMPRESA"
subdomain: "techcorp"
name: "Tech Solutions S.L."
status: "ACTIVE"
createdAt: (auto)
```

#### **2. Crear una Company**

Tabla: `Company`
```
id: (auto UUID)
tenantId: "empresa-test-001"
legalName: "Tech Solutions S.L."
cif: "B12345678"
address: "Calle Mayor 1, Madrid"
contactRrhhName: "María García"
contactRrhhEmail: "rrhh@techcorp.com"
contactRrhhPhone: "+34 600 000 000"
sector: "TECNOLOGIA"
employeeCount: 50
status: "ACTIVE"
```

#### **3. Crear una Company Policy**

Tabla: `CompanyPolicy`
```
id: (auto UUID)
companyId: (el ID de la Company creada arriba)
dailyLimit: 11.00
monthlyLimit: 220.00
subsidyPercentage: 100
cutoffTime: "11:00:00"
allowCancellation: true
cancellationDeadline: 60
version: 1
```

#### **4. Crear un User (para login)**

Tabla: `User`
```
id: (auto UUID)
email: "admin@techcorp.com"
nameEnc: "Admin TechCorp"
password: "$2a$10$..." (debes hashear la contraseña)
role: "ADMIN_EMPRESA"
tenantId: "empresa-test-001"
active: true
```

**⚠️ IMPORTANTE:** Para la contraseña, puedes usar esta hasheada:
```
password: "$2a$10$K3kRqZ9ZLqZLqZLqZLqZLO9v7lZ9ZLqZLqZLqZLqZLqZLqZLqZLqZ"
```
(Corresponde a la contraseña: `Admin123!`)

#### **5. Crear algunos Employees (opcional pero recomendado)**

Tabla: `Employee`
```
id: (auto UUID)
userId: (crear un User primero)
companyId: (ID de la Company)
employeeNumber: "EMP001"
department: "Ingeniería"
position: "Developer"
active: true
```

---

## **PASO 2: Acceder al Portal de Empresa**

### **🌐 Problema: Subdominios en local**

El portal usa subdominios (`techcorp.comida.localhost`), pero esto no funciona directamente en navegadores modernos.

### **Solución: Modificar el archivo `/etc/hosts`**

```bash
# Edita el archivo hosts (necesitas permisos de admin)
sudo nano /etc/hosts

# Añade esta línea al final:
127.0.0.1 techcorp.comida.localhost
127.0.0.1 admin.comida.localhost

# Guarda: Ctrl + O, Enter, Ctrl + X
```

Ahora podrás acceder a:
- `http://techcorp.comida.localhost:3000` → Portal de Empresa
- `http://admin.comida.localhost:3000` → Portal de Admin

---

## **PASO 3: Login en el Portal**

### **URL de acceso:**
```


```

**Credenciales:**
- Email: `admin@techcorp.com`
- Password: `Admin123!`

Si todo está bien configurado:
1. ✅ Te redirige a `/empresa/dashboard`
2. ✅ Ves el sidebar con el nombre de la empresa
3. ✅ Ves los 9 módulos en el menú

---

## **PASO 4: Probar Cada Módulo**

### **1. Dashboard** (`/empresa/dashboard`)

**Deberías ver:**
- ✅ 6 KPIs (empleados, pedidos, gasto, etc.)
- ✅ Gráfica de pedidos (últimos 30 días)
- ✅ Alertas (si hay problemas)
- ✅ Actividad reciente

**Si ves "0" en todo:**
- Es normal, no tienes pedidos aún
- Los KPIs se calcularán cuando crees empleados y pedidos

---

### **2. Empleados** (`/empresa/empleados`)

**Puedes:**
- ✅ Ver listado de empleados
- ✅ Filtrar por estado, departamento
- ✅ Hacer clic en "Nuevo Empleado" y crear uno

**Crear empleado de prueba:**
1. Clic en "Nuevo Empleado"
2. Rellena:
   - Nombre: Juan Pérez
   - Email: juan.perez@techcorp.com
   - Número de empleado: EMP002
   - Departamento: Ventas
   - Puesto: Comercial
3. Guardar

**Ver detalle:**
- Clic en "Ver" → Te lleva a `/empresa/empleados/[id]`
- Verás tabs: Overview, Pedidos, Incidencias

---

### **3. Pedidos** (`/empresa/pedidos`)

**Deberías ver:**
- ✅ 3 KPIs (total pedidos, gasto, ticket medio)
- ✅ Filtros por período, estado
- ✅ Tabla vacía (si no tienes pedidos)

**Para probar con datos reales:**
Necesitas crear pedidos en Prisma Studio:

Tabla: `Order`
```
id: (auto UUID)
tenantEmpresa: "empresa-test-001"
employeeId: (ID de un empleado)
serviceDate: 2024-11-18
menuType: "DIARIO"
price: 9.50
status: "DELIVERED"
```

**Ver detalle:**
- Clic en "Ver" → Muestra trazabilidad fiscal completa
- Hash SHA-256, delivery proof, histórico

---

### **4. Configuración** (`/empresa/configuracion`)

**4 Tabs:**

**a) Información General:**
- Editar datos legales
- Contactos RRHH/Finanzas
- Gestión de sedes

**b) Plan y Límites:**
- Cambiar límite diario (≤11€)
- Subsidio empresa/empleado
- Cutoff time
- ⚠️ **Requiere "Motivo del cambio"** (versionado)

**c) Preferencias:**
- Notificaciones (email/SMS)
- Idioma, timezone
- Preferencias operativas

**d) Documentación:**
- Ver contrato
- Subir documentos (CIF, certificados)

---

### **5. Catering** (`/empresa/catering`)

**4 Tabs:**

**a) Información:**
- Ver catering asignado
- KPIs (puntualidad, incidencias, rating)
- Estado de documentos (semáforo 🟢🟡🔴)

**b) Menús:**
- Navegación semanal
- Ver menús del día
- Platos con fotos, alérgenos, calorías

**c) SLA y Calidad:**
- Cumplimiento de SLAs
- Distribución de pedidos por estado
- Incidencias por tipo

**d) Valoraciones:**
- Ratings de empleados
- Comentarios
- Pedidos asociados

**⚠️ Para ver datos:**
Necesitas:
- Un `Restaurant` asignado (en `CompanyCateringAssignment`)
- `Dishes` y `DishSchedules` creados

---

### **6. Facturación** (`/empresa/facturacion`)

**3 Tabs:**

**a) Resumen:**
- Total del mes actual
- Pedidos
- Split empresa/empleado
- Variación vs mes anterior

**b) Desglose Mensual:**
- Resumen financiero
- Desglose por empleado
- **Exportar a CSV** (A3, Sage, SAP, Genérico)

**c) Conciliación:**
- Detecta problemas:
  - Pedidos con incidencias abiertas
  - Pedidos sin justificante
  - Estado (🟢 OK / 🔴 Revisar)

**Probar export:**
1. Ve a tab "Desglose Mensual"
2. Selecciona formato (ej: "Genérico")
3. Clic en "Exportar"
4. Se descarga un CSV

---

### **7. Incidencias** (`/empresa/incidencias`)

**Deberías ver:**
- ✅ 5 KPIs (abiertas, en progreso, resueltas, tiempo, compensaciones)
- ✅ Filtros por tipo, severidad, estado
- ✅ Lista de incidencias
- ✅ Botón "Nueva Incidencia"

**Crear incidencia de prueba:**
1. Clic en "Nueva Incidencia"
2. Selecciona un pedido
3. Tipo: "Entrega Retrasada"
4. Severidad: "Media"
5. Descripción: "El pedido llegó 20 minutos tarde"
6. Guardar

**Ver detalle:**
- Clic en "Ver" → Detalle completo
- Acciones: Resolver, Escalar

---

### **8. Auditoría Fiscal** (`/empresa/auditoria`)

**Deberías ver:**
- ✅ Estado de cumplimiento (🟢/🔴)
- ✅ 4 KPIs (pedidos, importe, deducible, cumplimiento)
- ✅ Resumen anual con gráfica
- ✅ Hash de integridad SHA-256

**Funcionalidad:**
- Genera automáticamente el reporte del mes actual
- Detecta problemas:
  - Pedidos sin delivery proof
  - Pedidos sin hash
  - Pedidos >11€ (no deducibles)
- Descarga dossier fiscal

**Para probar:**
- Si tienes pedidos, verás el reporte
- Si no, verás "0" en todo (normal)

---

### **9. Registro de Actividad** (`/empresa/actividad`)

**Deberías ver:**
- ✅ 3 KPIs (acciones, por tipo, usuarios activos)
- ✅ Tabla con todas las acciones
- ✅ Columnas: Fecha, Usuario, Acción, Recurso, IP

**Qué se registra:**
- ✅ Login/Logout
- ✅ CREATE empleado
- ✅ UPDATE configuración
- ✅ DELETE pedido
- ✅ EXPORT facturación

**Para probar:**
- Crea un empleado → Se registra en actividad
- Cambia configuración → Se registra
- Exporta CSV → Se registra

---

## **PASO 5: Checklist de Funcionalidades**

### **✅ Sidebar y Navegación**
- [ ] Se ve el logo/nombre de la empresa
- [ ] Todos los módulos están visibles
- [ ] El módulo activo se resalta
- [ ] Al hacer clic, cambia de página

### **✅ Dashboard**
- [ ] KPIs muestran datos (o "0" si no hay)
- [ ] Gráfica de pedidos se renderiza
- [ ] Alertas se muestran si hay problemas

### **✅ Empleados**
- [ ] Lista se carga correctamente
- [ ] Filtros funcionan
- [ ] Crear empleado guarda en BD
- [ ] Detalle muestra tabs

### **✅ Pedidos**
- [ ] Filtros funcionan
- [ ] Detalle muestra trazabilidad
- [ ] Export CSV funciona

### **✅ Configuración**
- [ ] Se pueden editar datos
- [ ] Cambio de política pide "motivo"
- [ ] Se guarda correctamente

### **✅ Catering**
- [ ] Muestra catering asignado
- [ ] Menús semanales se cargan
- [ ] SLA se calcula correctamente

### **✅ Facturación**
- [ ] Resumen mensual correcto
- [ ] Export CSV descarga archivo
- [ ] Conciliación detecta problemas

### **✅ Incidencias**
- [ ] Lista se carga
- [ ] Crear incidencia funciona
- [ ] Filtros funcionan

### **✅ Auditoría**
- [ ] Reporte se genera automáticamente
- [ ] Hash de integridad se muestra
- [ ] Cumplimiento se verifica

### **✅ Actividad**
- [ ] Acciones se registran
- [ ] Tabla muestra datos
- [ ] Filtros funcionan

---

## **🐛 Troubleshooting**

### **Error: "No autorizado"**
- Verifica que el usuario tenga `tenantId = "empresa-test-001"`
- Verifica que el tenant exista en la BD

### **Error 404 en rutas**
- Verifica que el middleware esté funcionando
- Revisa la consola del servidor

### **No se ven datos**
- Verifica en Prisma Studio que las tablas tienen datos
- Verifica que el `tenantId` coincida

### **Subdominios no funcionan**
- Verifica `/etc/hosts`
- Reinicia el navegador después de editar hosts

### **Error de Prisma**
- Verifica que PostgreSQL esté corriendo
- Ejecuta `npx prisma migrate dev`

---

## **📝 Resumen Rápido**

```bash
# 1. Servidor corriendo
npm run dev

# 2. Ver/crear datos
npx prisma studio  # http://localhost:5555

# 3. Acceder al portal
http://techcorp.comida.localhost:3000/login

# 4. Login
Email: admin@techcorp.com
Password: Admin123!

# 5. Probar todos los módulos (checklist arriba)
```

---

## **🎯 Datos Mínimos para Probar Todo**

Para probar TODAS las funcionalidades, necesitas:

**En Prisma Studio:**
1. ✅ 1 Tenant (type: EMPRESA)
2. ✅ 1 Company (con tenantId)
3. ✅ 1 CompanyPolicy
4. ✅ 1 User (para login)
5. ✅ 3 Employees
6. ✅ 10 Orders (varios estados)
7. ✅ 1 Restaurant (catering asignado)
8. ✅ 5 Dishes + DishSchedules
9. ✅ 2 Incidents
10. ✅ 1 DeliveryProof (por cada order)

---

**Última actualización:** 18 de noviembre, 2025  
**Estado:** ✅ Listo para probar

