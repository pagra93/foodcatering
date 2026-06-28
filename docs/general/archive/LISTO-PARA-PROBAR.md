# ✅ Setup Completado - Listo para Probar

## 🎉 ¡Todo Configurado Exitosamente!

Has completado todos los pasos del setup. La aplicación está corriendo y lista para probar.

---

## 📊 Estado Actual

### ✅ Base de Datos PostgreSQL
- **Ubicación:** Coolify (5.78.124.107:5432)
- **Estado:** ✅ Conectada y funcionando
- **Tablas:** ✅ 30+ tablas creadas
- **Datos:** ✅ Seed insertado correctamente

### ✅ Aplicación Next.js
- **URL Local:** http://localhost:3000
- **Estado:** ✅ Servidor corriendo
- **Proceso:** 71740

### ✅ Datos de Prueba Insertados

#### 🏢 Tenants Creados:
1. **ROOT** (admin.comida.localhost)
2. **ACME Corporation** (acme.comida.localhost)  
3. **Delicias Express** (deliciasexpress.comida.localhost)

#### 👥 Usuarios Disponibles:

**ROOT (Super Admin):**
- 📧 Email: `admin@comida.com`
- 🔑 Password: `Admin123!`

**ACME Corporation (Empresa):**
- 📧 RRHH: `rrhh@acme.com` / `Rrhh123!`
- 📧 Finanzas: `finanzas@acme.com` / `Finanzas123!`
- 📧 Empleado 1: `laura.gomez@acme.com` / `Empleado123!`
- 📧 Empleado 2: `pedro.martinez@acme.com` / `Empleado123!`

**Delicias Express (Catering):**
- 📧 Chef: `chef@deliciasexpress.com` / `Chef123!`
- 📧 Repartidor: `reparto@deliciasexpress.com` / `Reparto123!`

#### 🍽️ Datos del Catering:
- **Platos:** 6 (Gazpacho, Ensalada César, Pollo, Merluza, Yogur, Fruta)
- **Menús:** Programados para los próximos 4 días (L-J)
- **Restaurante:** Delicias Express Madrid

---

## 🧪 Cómo Probar la Aplicación

### 1. Abrir en el Navegador

Abre tu navegador y ve a:

```
http://localhost:3000
```

### 2. Iniciar Sesión como Super Admin

1. Click en **"Iniciar Sesión"** o ve directamente a: `http://localhost:3000/login`
2. Introduce las credenciales:
   - Email: `admin@comida.com`
   - Password: `Admin123!`
3. Click en **"Iniciar Sesión"**

### 3. Explorar el Dashboard de Admin

Una vez logueado, deberías ver:

- ✅ Dashboard principal con KPIs
- ✅ Lista de tenants (ROOT + ACME + Delicias Express)
- ✅ Panel de actividad reciente
- ✅ Alertas del sistema

### 4. Funcionalidades a Probar

#### 📋 Ver Lista de Tenants
- Ve a **"Tenants"** en el sidebar
- Deberías ver 3 tenants listados con sus badges de estado

#### 👁️ Ver Detalle de Tenant
- Click en **"Ver"** en cualquier tenant
- Verás información completa: empresa, usuarios, configuración, etc.

#### ✏️ Editar Tenant
- Click en **"Editar"** en un tenant
- Cambia el nombre o algún campo
- Guarda y verifica que se actualiza

#### 🔄 Cambiar Status de Tenant
- Click en **"Activar/Suspender"**
- Verifica que el badge cambia de color

#### ➕ Crear Nuevo Tenant
- Click en **"+ Nuevo Tenant"**
- Rellena el formulario con datos de prueba
- Verifica que se crea correctamente

---

## 🗄️ Explorar la Base de Datos (Opcional)

### Opción 1: Prisma Studio (Recomendado)

Abre una nueva terminal y ejecuta:

```bash
cd /Users/pablogranados/Desktop/comidas
pnpm prisma studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde puedes:
- Ver todas las tablas
- Editar datos visualmente
- Ejecutar queries

### Opción 2: Desde Coolify

1. Ve a tu base de datos en Coolify
2. Click en **"Database Console"**
3. Explora las tablas creadas

### Opción 3: psql (Terminal)

```bash
psql "postgresql://postgres:t3t9lUq8T29HNrp38Znhidr10ykVIx4mK9ScdWkllVewGcRq9mPWy4OMEBu01H93@5.78.124.107:5432/postgres"
```

Comandos útiles:
```sql
\dt                    -- Ver todas las tablas
\d+ tenants           -- Ver estructura de tabla tenants

SELECT * FROM tenants;
SELECT * FROM users LIMIT 5;
SELECT * FROM "Dish";
```

---

## 🔧 Comandos Útiles

### Detener el Servidor
```bash
# Encontrar el proceso
lsof -ti:3000

# Matar el proceso
kill -9 71740
```

O simplemente presiona `Ctrl+C` en la terminal donde corre `pnpm dev`.

### Reiniciar el Servidor
```bash
cd /Users/pablogranados/Desktop/comidas
pnpm dev
```

### Ver Logs en Tiempo Real
El servidor ya está corriendo, revisa la terminal donde ejecutaste `pnpm dev`.

### Resetear Base de Datos (⚠️ Borra TODO)
```bash
cd /Users/pablogranados/Desktop/comidas
pnpm prisma db push --force-reset
pnpm db:seed
```

### Regenerar Cliente Prisma (después de cambios en schema)
```bash
cd /Users/pablogranados/Desktop/comidas
pnpm prisma generate
```

---

## 🐛 Troubleshooting

### ❌ No puedo acceder a http://localhost:3000

**Solución:**
1. Verifica que el servidor está corriendo:
   ```bash
   lsof -ti:3000
   ```
2. Si no hay output, ejecuta:
   ```bash
   cd /Users/pablogranados/Desktop/comidas
   pnpm dev
   ```

### ❌ Error "Can't reach database"

**Solución:**
1. Verifica que el puerto está expuesto en Coolify
2. Prueba la conexión:
   ```bash
   cd /Users/pablogranados/Desktop/comidas
   pnpm prisma db pull
   ```

### ❌ Página en blanco o error 404

**Posibles causas:**
1. El servidor todavía está compilando (espera 10-20 segundos)
2. Hay un error en el código

**Solución:**
- Revisa los logs en la terminal donde ejecutaste `pnpm dev`
- Busca errores en rojo

### ❌ Error de autenticación

**Solución:**
1. Verifica que usas el email correcto: `admin@comida.com`
2. Verifica la password: `Admin123!` (con mayúsculas)
3. Si persiste, resetea el seed:
   ```bash
   cd /Users/pablogranados/Desktop/comidas
   pnpm prisma db push --force-reset
   pnpm db:seed
   ```

---

## 📸 Capturas Esperadas

### Landing Page
- Página de bienvenida con botón "Iniciar Sesión"

### Login
- Formulario con email/password
- Mensaje de error si credenciales incorrectas
- Redirección al dashboard si correctas

### Dashboard Admin
- KPIs del sistema (Total Tenants, Activos, etc.)
- Tabla de tenants con acciones
- Sidebar con navegación
- Header con perfil de usuario

---

## 🎯 Siguientes Pasos

Una vez que verifiques que todo funciona:

1. ✅ **Explorar el código**
   - Revisa la estructura de carpetas
   - Entiende el flujo de autenticación
   - Explora los componentes de UI

2. ✅ **Probar diferentes roles**
   - Logout y login con usuario RRHH
   - Login con empleado
   - Login con chef del catering

3. ✅ **Implementar nuevas features**
   - Sistema de pedidos
   - Gestión de menús
   - Facturación
   - Dashboard de empleados

4. ✅ **Configurar deployment**
   - Desplegar en Coolify
   - Configurar dominio
   - Setup de staging/production

---

## 📚 Documentación Adicional

- **PRD Completo:** `/Users/pablogranados/Desktop/comidas/prd.md`
- **Schema Prisma:** `/Users/pablogranados/Desktop/comidas/prisma/schema.prisma`
- **Cursor Rules:** `/Users/pablogranados/Desktop/comidas/.cursorrules`
- **Progreso:** `/Users/pablogranados/Desktop/comidas/docs/PROGRESO.md`

---

## 🆘 ¿Necesitas Ayuda?

Si encuentras algún problema:

1. **Revisa los logs** en la terminal donde ejecutaste `pnpm dev`
2. **Revisa este documento** en la sección de Troubleshooting
3. **Pregunta** - Estoy aquí para ayudarte

---

## ✅ Checklist de Verificación

Antes de continuar, asegúrate de que puedes:

- [ ] Acceder a http://localhost:3000
- [ ] Ver la página de login
- [ ] Iniciar sesión con admin@comida.com
- [ ] Ver el dashboard de admin
- [ ] Ver la lista de tenants (3 tenants)
- [ ] Editar un tenant
- [ ] Ver el detalle de un tenant
- [ ] Crear un nuevo tenant (opcional)

---

**¡FELICIDADES! 🎉**  
Has completado el setup completo de la plataforma.  
**Ahora a construir algo increíble.** 🚀

---

**Última actualización:** Noviembre 16, 2025  
**Estado:** ✅ Setup Completado  
**Próximo paso:** Probar la aplicación en el navegador

