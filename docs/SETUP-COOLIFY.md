# 🚀 Setup PostgreSQL con Coolify

Esta guía te ayudará a configurar PostgreSQL en tu servidor Coolify y conectar tu proyecto local.

---

## 📋 Prerrequisitos

- ✅ Acceso a tu instancia de Coolify
- ✅ Servidor funcionando con Coolify instalado
- ✅ Proyecto Next.js local (`/Users/pablogranados/Desktop/comidas`)

---

## PASO 1: Crear Base de Datos PostgreSQL en Coolify

### 1.1 Acceder a Coolify

1. Abre tu instancia de Coolify en el navegador
2. Inicia sesión

### 1.2 Crear nuevo PostgreSQL

1. En el dashboard de Coolify, ve a **"Databases"** o **"Resources"**
2. Click en **"+ New Database"** o **"+ Add Resource"**
3. Selecciona **PostgreSQL**
4. Configura los siguientes datos:

```
Name: comidas-db
Description: Base de datos para plataforma de gestión de menús
PostgreSQL Version: 15 o 16 (recomendado)
```

### 1.3 Configuración de la Base de Datos

Coolify te pedirá configurar:

```
Database Name: comidas
Username: (dejar por defecto o usar "comidas_user")
Password: (Coolify generará uno seguro - GUÁRDALO)
```

**⚠️ IMPORTANTE**: Guarda estos datos, los necesitarás para la cadena de conexión.

### 1.4 Exponer el Puerto (para acceso externo)

Para conectar desde tu Mac local:

1. En la configuración de la base de datos en Coolify
2. Busca la sección **"Network"** o **"Ports"**
3. Expone el puerto `5432` públicamente (o configura un túnel)

**Opciones:**

- **Opción A**: Exponer públicamente el puerto 5432 (menos seguro, solo para desarrollo)
- **Opción B**: Usar un puerto custom mapeado (ej: 54321 → 5432)
- **Opción C**: Usar túnel SSH (más seguro)

### 1.5 Obtener la Cadena de Conexión

Coolify te mostrará algo como:

```
Internal URL: postgresql://username:password@localhost:5432/comidas
External URL: postgresql://username:password@tu-servidor.com:5432/comidas
```

O puedes construirla manualmente:

```
postgresql://[USERNAME]:[PASSWORD]@[IP_O_DOMINIO]:[PUERTO]/comidas
```

**Ejemplo:**
```
postgresql://comidas_user:mi_password_seguro@servidor.example.com:5432/comidas
```

---

## PASO 2: Configurar Proyecto Local

### 2.1 Crear archivo `.env` local

En tu proyecto local (`/Users/pablogranados/Desktop/comidas`), crea el archivo `.env`:

```env
# Database - Cadena de conexión de Coolify
DATABASE_URL="postgresql://USUARIO:PASSWORD@TU_SERVIDOR:PUERTO/comidas?schema=public"

# Auth
NEXTAUTH_SECRET="cambiar-en-produccion-minimo-32-caracteres-aleatorios-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
WILDCARD_DOMAIN=".localhost:3000"

# Features (opcional)
FEATURE_AI_NUTRITION=false
FEATURE_AUTO_SELECTION=false
```

**⚠️ Reemplaza estos valores:**
- `USUARIO`: El username de PostgreSQL de Coolify
- `PASSWORD`: El password que guardaste
- `TU_SERVIDOR`: IP o dominio de tu servidor (ej: `123.45.67.89` o `db.example.com`)
- `PUERTO`: Normalmente `5432` (o el puerto custom que configuraste)

**Ejemplo real:**
```env
DATABASE_URL="postgresql://comidas_user:8h2kL9pQw3nM@192.168.1.100:5432/comidas?schema=public"
```

### 2.2 Verificar Conexión

Prueba que puedas conectar desde tu Mac:

```bash
# Opción 1: Si tienes psql instalado
psql "postgresql://USUARIO:PASSWORD@TU_SERVIDOR:PUERTO/comidas"

# Opción 2: Usar Prisma
cd /Users/pablogranados/Desktop/comidas
pnpm install
pnpm prisma db pull
```

Si conecta correctamente, verás un mensaje de éxito.

---

## PASO 3: Crear Estructura de Base de Datos

### 3.1 Instalar Dependencias

```bash
cd /Users/pablogranados/Desktop/comidas
pnpm install
```

### 3.2 Generar Cliente Prisma

```bash
pnpm prisma generate
```

### 3.3 Crear Todas las Tablas (Push Schema)

```bash
pnpm db:push
```

Esto creará todas las tablas en tu PostgreSQL de Coolify:
- `tenants`
- `users`
- `roles`
- `companies`
- `employees`
- `orders`
- `caterings`
- `dishes`
- `invoices`
- `audit_logs`
- etc.

### 3.4 Insertar Datos de Prueba (Seed)

```bash
pnpm db:seed
```

Esto insertará:
- ✅ Tenant ROOT
- ✅ Usuario super_admin (email: `admin@root.com`, password: `admin123`)
- ✅ Tenant de prueba "Acme Corp"
- ✅ Usuarios de ejemplo
- ✅ Empresa y empleados de prueba
- ✅ Catering de prueba con menús

---

## PASO 4: Ejecutar y Probar la Aplicación

### 4.1 Iniciar Servidor de Desarrollo

```bash
cd /Users/pablogranados/Desktop/comidas
pnpm dev
```

Deberías ver:

```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
✓ Prisma Client generated
```

### 4.2 Acceder a la Aplicación

1. Abre el navegador en **http://localhost:3000**
2. Click en **"Iniciar Sesión"** o ve a **http://localhost:3000/login**

### 4.3 Login como Super Admin

```
Email: admin@root.com
Password: admin123
```

### 4.4 Verificar Dashboard de Admin

1. Una vez logueado, ve a **http://localhost:3000/admin**
2. Deberías ver:
   - KPIs del sistema
   - Tabla de tenants (1 ROOT + 1 Acme Corp)
   - Actividad reciente
   - Panel de alertas

### 4.5 Probar Funcionalidades

✅ **Ver Tenants:**
- Ve a "Tenants" en el sidebar
- Deberías ver 2 tenants listados

✅ **Ver Detalle de Tenant:**
- Click en "Ver" en la tabla
- Verás la información detallada de Acme Corp

✅ **Editar Tenant:**
- Click en "Editar"
- Cambia algún dato (ej: nombre)
- Guarda y verifica que se actualiza

✅ **Cambiar Status:**
- Click en "Activar/Suspender"
- Verifica que cambia el badge de estado

✅ **Crear Nuevo Tenant:**
- Click en "+ Nuevo Tenant"
- Rellena el formulario
- Verifica que se crea correctamente

---

## PASO 5: Verificar Datos en la Base de Datos

### Opción A: Desde Coolify

1. En Coolify, ve a tu base de datos `comidas-db`
2. Click en **"Database Console"** o **"phpPgAdmin"**
3. Explora las tablas creadas

### Opción B: Desde Terminal (psql)

```bash
# Conectar a la base de datos
psql "postgresql://USUARIO:PASSWORD@TU_SERVIDOR:PUERTO/comidas"

# Ver todas las tablas
\dt

# Ver tenants
SELECT id, name, subdomain, status FROM tenants;

# Ver usuarios
SELECT id, email, role FROM users LIMIT 5;

# Salir
\q
```

### Opción C: Prisma Studio (Visual)

```bash
cd /Users/pablogranados/Desktop/comidas
pnpm prisma studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde puedes:
- Ver todas las tablas
- Editar datos visualmente
- Ejecutar queries

---

## 🔧 Troubleshooting

### ❌ Error: "Can't reach database server"

**Causa:** No puedes conectar al servidor PostgreSQL.

**Soluciones:**

1. **Verificar que el puerto está expuesto en Coolify:**
   - Ve a la configuración de la DB
   - Asegúrate de que el puerto 5432 está mapeado públicamente

2. **Verificar firewall del servidor:**
   ```bash
   # Desde el servidor (SSH)
   sudo ufw allow 5432/tcp
   ```

3. **Verificar la IP/dominio:**
   ```bash
   # Desde tu Mac
   ping TU_SERVIDOR
   telnet TU_SERVIDOR 5432
   ```

### ❌ Error: "Authentication failed"

**Causa:** Usuario o password incorrectos.

**Solución:**

1. Verifica las credenciales en Coolify
2. Resetea la password de la DB si es necesario
3. Actualiza el archivo `.env` con los datos correctos

### ❌ Error: "database 'comidas' does not exist"

**Causa:** La base de datos no se creó con ese nombre.

**Solución:**

1. En Coolify, verifica el nombre de la database
2. O créala manualmente:
   ```sql
   CREATE DATABASE comidas;
   ```

### ❌ Error: "SSL connection required"

**Causa:** PostgreSQL requiere SSL.

**Solución:**

Actualiza la cadena de conexión en `.env`:

```env
DATABASE_URL="postgresql://USER:PASS@SERVER:PORT/comidas?schema=public&sslmode=require"
```

### ❌ Prisma no puede conectar pero psql sí

**Causa:** Configuración de red o timeout.

**Solución:**

Añade parámetros de conexión:

```env
DATABASE_URL="postgresql://USER:PASS@SERVER:PORT/comidas?schema=public&connect_timeout=10&pool_timeout=10"
```

---

## 🔒 Seguridad (Importante)

### Para Desarrollo:

✅ Exponer puerto 5432 está OK temporalmente
✅ Usar firewall para limitar IPs permitidas

### Para Producción:

1. **NO expongas el puerto 5432 públicamente**
2. **Usa un túnel SSH:**
   ```bash
   ssh -L 5432:localhost:5432 usuario@tu-servidor.com
   # Luego conecta a localhost:5432
   ```

3. **O configura VPN/Tailscale** para acceso seguro

4. **Configura SSL obligatorio** en PostgreSQL

5. **Usa variables de entorno diferentes:**
   ```env
   # .env.production
   DATABASE_URL="postgresql://prod_user:STRONG_PASSWORD@private-db:5432/comidas?sslmode=require"
   ```

---

## 📊 Datos de Prueba Insertados

Después del seed, tendrás:

### Tenants:
- `ROOT` (tenant raíz del sistema)
- `Acme Corp` (empresa de prueba)

### Usuarios:
- Super Admin: `admin@root.com` / `admin123`
- Admin Empresa: `admin@acme.com` / `admin123`
- Empleados de prueba

### Empresas:
- Acme Corporation (con sedes y empleados)

### Caterings:
- Catering de prueba con menús del día

---

## 🎯 Siguientes Pasos

Ahora que tienes todo funcionando, puedes:

1. ✅ **Explorar el código y hacer cambios**
2. ✅ **Probar las diferentes vistas (admin, empresa, empleado)**
3. ✅ **Crear más tenants de prueba**
4. ✅ **Implementar nuevas features (pedidos, facturación, etc.)**
5. ✅ **Configurar el despliegue completo en Coolify**

---

## 📚 Comandos Útiles

```bash
# Ver logs de Prisma
pnpm prisma:log

# Resetear base de datos (⚠️ BORRA TODO)
pnpm db:reset

# Crear migración (después de cambios en schema)
pnpm prisma migrate dev --name nombre_migracion

# Ver estado de migraciones
pnpm prisma migrate status

# Formatear schema.prisma
pnpm prisma format

# Abrir Prisma Studio
pnpm prisma studio
```

---

## 🆘 ¿Necesitas Ayuda?

Si algo no funciona:

1. **Revisa los logs de Coolify** (Database Logs)
2. **Revisa los logs de Next.js** (terminal donde ejecutas `pnpm dev`)
3. **Verifica la cadena de conexión** en `.env`
4. **Prueba conectar con `psql` primero** (para aislar el problema)

---

**Última actualización:** Noviembre 2025  
**Autor:** Setup para proyecto Comidas con Coolify

