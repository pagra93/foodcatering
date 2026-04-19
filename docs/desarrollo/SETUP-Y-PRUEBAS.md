# 🚀 Guía de Setup y Pruebas - PASO 4

Esta guía te ayudará a configurar la base de datos y probar todo el sistema.

---

## ⚠️ Pre-requisitos

Antes de empezar, asegúrate de tener:

- ✅ Node.js 20+ instalado
- ✅ pnpm instalado (`npm install -g pnpm`)
- ✅ PostgreSQL 14+ (local, Docker, o PostgreSQL.app)

---

## 📦 PASO 1: Instalar Dependencias

```bash
cd /Users/pablogranados/Desktop/comidas

# Instalar todas las dependencias
pnpm install
```

**Tiempo estimado:** 2-3 minutos

---

## 🐘 PASO 2: Configurar PostgreSQL

### Opción A: Usando Docker (Recomendado)

```bash
# Crear y ejecutar contenedor PostgreSQL
docker run --name comidas-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=comidas \
  -p 5432:5432 \
  -d postgres:15

# Verificar que está corriendo
docker ps
```

### Opción B: PostgreSQL Local

Si ya tienes PostgreSQL instalado:

```bash
# Crear base de datos
createdb comidas

# O usando psql
psql -U postgres -c "CREATE DATABASE comidas;"
```

### Opción C: PostgreSQL.app (macOS)

1. Descargar desde https://postgresapp.com/
2. Instalar y abrir la app
3. Crear base de datos "comidas"

---

## 🔧 PASO 3: Configurar Variables de Entorno

El archivo `.env` ya está creado. Verifica que la URL de conexión sea correcta:

```bash
cat .env
```

Debería mostrar:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/comidas?schema=public"
NEXTAUTH_SECRET="tu-secret-super-seguro-cambialo-en-produccion-min-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"
```

**Si usas configuración diferente**, edita `.env`:
- Usuario diferente: cambia `postgres:postgres`
- Puerto diferente: cambia `5432`
- Nombre DB diferente: cambia `comidas`

---

## 🗃️ PASO 4: Crear las Tablas (Prisma Push)

Ahora vamos a sincronizar el schema de Prisma con PostgreSQL:

```bash
# Generar el cliente de Prisma
pnpm db:generate

# Crear todas las tablas en la base de datos
pnpm db:push
```

**Esto creará 31 tablas** según el schema definido.

**Tiempo estimado:** 30 segundos

### ✅ Verificar que funcionó

```bash
# Abrir Prisma Studio para ver las tablas
pnpm db:studio
```

Debería abrir http://localhost:5555 con todas las tablas visibles (vacías por ahora).

---

## 🌱 PASO 5: Insertar Datos de Prueba (Seed)

Ahora vamos a poblar la base de datos con datos de ejemplo:

```bash
# Ejecutar el seed
pnpm db:seed
```

**Esto creará:**
- ✅ 3 Tenants (ROOT, EMPRESA, CATERING)
- ✅ 7 Usuarios con diferentes roles
- ✅ 1 Empresa con 1 sede y política
- ✅ 2 Empleados
- ✅ 1 Restaurant con documentos
- ✅ 6 Platos (primeros, segundos, postres)
- ✅ Horarios de platos para 4 días

**Tiempo estimado:** 5 segundos

### ✅ Verificar los datos

Abre Prisma Studio nuevamente:
```bash
pnpm db:studio
```

Deberías ver:
- Tabla `tenants`: 3 registros
- Tabla `users`: 7 registros
- Tabla `companies`: 1 registro
- Tabla `employees`: 2 registros
- Tabla `restaurants`: 1 registro
- Tabla `dishes`: 6 registros

---

## 🚀 PASO 6: Ejecutar la Aplicación

```bash
# Ejecutar en modo desarrollo
pnpm dev
```

La app debería iniciar en http://localhost:3000

**Tiempo estimado:** 10-15 segundos para compilar

---

## 🧪 PASO 7: Probar el Sistema

### **1. Probar Landing Page**

```
URL: http://localhost:3000
```

Deberías ver:
- ✅ Hero section
- ✅ Características
- ✅ Cómo funciona
- ✅ Botón "Acceder"

---

### **2. Probar Login**

```
URL: http://localhost:3000/auth/login
```

**Credenciales de prueba (del seed):**

**Súper Admin:**
- Email: `admin@root.com`
- Password: `admin123`

**Admin Empresa:**
- Email: `rrhh@techcorp.com`
- Password: `test123`

**Admin Catering:**
- Email: `chef@catering.com`
- Password: `test123`

---

### **3. Probar Dashboard Súper Admin**

Una vez logueado con `admin@root.com`:

```
URL: http://localhost:3000/admin
```

Deberías ver:
- ✅ 6 tarjetas de KPI (con datos reales)
- ✅ Gráficas (pueden estar vacías si no hay pedidos)
- ✅ Panel de alertas
- ✅ Actividad reciente (tenants, usuarios)
- ✅ Botones de acción rápida

---

### **4. Probar CRUD de Tenants**

```
URL: http://localhost:3000/admin/tenants
```

**Acciones a probar:**

1. **Listado**
   - ✅ Ver 2 tenants (EMPRESA y CATERING, sin ROOT)
   - ✅ Buscar por nombre
   - ✅ Filtrar por tipo
   - ✅ Filtrar por estado

2. **Crear Nuevo Tenant**
   - Click en "Crear Tenant"
   - Seleccionar tipo (EMPRESA o CATERING)
   - Llenar formulario:
     - Nombre: "Nueva Empresa Test"
     - Subdominio: "nuevaempresa"
     - Email: "test@test.com"
   - Click "Crear Tenant"
   - ✅ Debería redirigir al listado
   - ✅ Debería aparecer el nuevo tenant

3. **Ver Detalles**
   - Click en un tenant
   - ✅ Ver ficha con 4 pestañas
   - ✅ Tab Resumen: KPIs, info general
   - ✅ Tab Configuración: branding, regional
   - ✅ Tab Usuarios: lista de usuarios
   - ✅ Tab Actividad: (vacío por ahora)

4. **Editar Tenant**
   - Click en "Editar" en la ficha
   - Cambiar nombre o color
   - Click "Guardar Cambios"
   - ✅ Debería actualizar

5. **Acciones en la Tabla**
   - Click en menú "..." de un tenant
   - ✅ Ver opciones: Ver, Editar, Suspender, Eliminar

---

### **5. Probar Navegación**

- ✅ Sidebar: Click en diferentes módulos
- ✅ Breadcrumbs: Click para navegar atrás
- ✅ User menu: Ver perfil, cerrar sesión
- ✅ Búsqueda global (en navbar)

---

## 🐛 Solución de Problemas Comunes

### **Error: Can't reach database server**

```bash
# Verificar que PostgreSQL está corriendo
docker ps  # Si usas Docker

# O
pg_isready  # Si es local
```

**Solución:**
```bash
# Si usas Docker, iniciar el contenedor
docker start comidas-db
```

---

### **Error: P1001 Can't reach database**

**Causa:** La URL de conexión en `.env` es incorrecta.

**Solución:**
```bash
# Verificar el archivo .env
cat .env

# Asegurarte que la URL es correcta
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

---

### **Error: Relation "Tenant" does not exist**

**Causa:** Las tablas no se han creado.

**Solución:**
```bash
# Ejecutar push de nuevo
pnpm db:push
```

---

### **Error: No users in database**

**Causa:** El seed no se ha ejecutado.

**Solución:**
```bash
# Ejecutar seed
pnpm db:seed
```

---

### **Error: Cannot read properties of null (reading 'user')**

**Causa:** La sesión no está configurada correctamente.

**Solución:**
1. Verificar que `NEXTAUTH_SECRET` está en `.env`
2. Cerrar sesión y volver a loguear
3. Limpiar cookies del navegador

---

### **Error: Port 3000 already in use**

**Solución:**
```bash
# Matar el proceso en el puerto 3000
lsof -ti:3000 | xargs kill -9

# O usar otro puerto
PORT=3001 pnpm dev
```

---

## 📊 Datos de Prueba Creados

### **Tenants**
- ROOT (súper admin)
- Tech Corp S.L. (empresa)
  - Subdomain: `techcorp`
- Catering Deluxe (catering)
  - Subdomain: `deluxe`

### **Usuarios**
1. `admin@root.com` - SUPER_ADMIN
2. `rrhh@techcorp.com` - RRHH (empresa)
3. `finanzas@techcorp.com` - FINANZAS (empresa)
4. `empleado@techcorp.com` - EMPLEADO
5. `chef@catering.com` - CHEF (catering)
6. `cocinero@catering.com` - COCINERO (catering)
7. `repartidor@catering.com` - REPARTIDOR (catering)

### **Platos**
- 2 Primeros (Ensalada César, Sopa de Verduras)
- 2 Segundos (Pollo Asado, Merluza al Horno)
- 2 Postres (Fruta, Yogurt)

---

## ✅ Checklist de Pruebas

Marca cada item cuando lo hayas probado:

**Setup:**
- [ ] PostgreSQL corriendo
- [ ] Dependencias instaladas (`pnpm install`)
- [ ] Tablas creadas (`pnpm db:push`)
- [ ] Datos insertados (`pnpm db:seed`)
- [ ] App corriendo (`pnpm dev`)

**Funcionalidad:**
- [ ] Landing page carga
- [ ] Login funciona (admin@root.com)
- [ ] Dashboard muestra KPIs reales
- [ ] Listado de tenants muestra 2 registros
- [ ] Filtros funcionan
- [ ] Crear tenant funciona
- [ ] Ver detalle de tenant funciona
- [ ] Editar tenant funciona
- [ ] Navegación en sidebar funciona
- [ ] Cerrar sesión funciona

---

## 🎯 Próximos Pasos Después de Probar

Una vez que hayas probado todo y funcione:

1. **Reportar bugs** encontrados
2. **Ajustar** lo que no funcione bien
3. **Decidir** si continuamos con Fase 2 (Portal Catering)
4. **O mejorar** algo del Portal Súper Admin

---

## 💡 Consejos

- **Prisma Studio** es tu amigo para ver/editar datos: `pnpm db:studio`
- **Console del navegador** (F12) te mostrará errores de React
- **Terminal** donde corre `pnpm dev` mostrará errores del servidor
- Si algo falla, **reinicia** el servidor (Ctrl+C y `pnpm dev`)
- **Limpia la caché** del navegador si ves cosas raras (Cmd+Shift+R)

---

**¿Listo para empezar?** 🚀

1. Copia y pega los comandos uno por uno
2. Verifica que cada paso funcione antes de seguir
3. Si algo falla, revisa la sección de "Solución de Problemas"

