# 🚀 Guía de Despliegue y Configuración de Dominios

## ✅ Código Subido a GitHub

El código se ha subido exitosamente a:
```
https://github.com/pagra93/foodcatering.git
```

## 📋 Pre-requisitos

1. **Dominio comprado** (ej: `tudominio.com`)
2. **Cuenta en Vercel/Netlify/Coolify** (recomendamos Vercel para Next.js)
3. **Base de datos PostgreSQL** (Vercel Postgres, Supabase, Railway, etc.)
4. **Acceso al panel de DNS** de tu proveedor de dominio

---

## 🌐 1. Configuración de Subdominios

### ¿Cómo funcionan los subdominios en este proyecto?

La plataforma utiliza subdominios para identificar cada tenant (empresa o catering):

- **Super Admin**: `admin.tudominio.com` o `tudominio.com/admin`
- **Empresa (Portal Empresa)**: `mediacreative.tudominio.com/empresa`
- **Catering (Portal Catering)**: `lacocinadejuan.tudominio.com/catering`
- **Empleado (Portal Empleado)**: `mediacreative.tudominio.com/empleado`

### ¿Los subdominios se crean automáticamente?

**NO**, pero hay dos opciones:

#### Opción A: Wildcard DNS (Recomendado)

Configura un registro DNS **wildcard** que permite que todos los subdominios funcionen automáticamente.

**En tu proveedor de DNS (GoDaddy, Cloudflare, Namecheap, etc.):**

1. Ve al panel de DNS de tu dominio
2. Añade un nuevo registro tipo **A** o **CNAME**:
   - **Nombre/Host**: `*` (asterisco = wildcard)
   - **Tipo**: `CNAME` si despliegas en Vercel, `A` si tienes IP fija
   - **Valor**: 
     - Si usas Vercel: `cname.vercel-dns.com`
     - Si usas IP fija: tu IP del servidor

**Ejemplo en Cloudflare:**
```
Tipo: CNAME
Nombre: *
Destino: cname.vercel-dns.com
TTL: Auto
```

**Ejemplo en GoDaddy:**
```
Tipo: CNAME
Host: *
Apunta a: cname.vercel-dns.com
TTL: 600 segundos
```

#### Opción B: Subdominios manuales

Si no quieres usar wildcard, tendrás que crear un registro DNS para cada tenant:

```
Tipo: CNAME
Nombre: mediacreative
Destino: cname.vercel-dns.com

Tipo: CNAME
Nombre: lacocinadejuan
Destino: cname.vercel-dns.com

Tipo: CNAME
Nombre: admin
Destino: cname.vercel-dns.com
```

⚠️ **Nota**: Con esta opción, cada vez que des de alta una empresa o catering nuevo, tendrás que crear manualmente el subdominio.

---

## 🚀 2. Despliegue en Vercel (Recomendado)

### Paso 1: Conectar el Repositorio

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **"Add New Project"**
3. Conecta tu cuenta de GitHub
4. Selecciona el repositorio `pagra93/foodcatering`
5. Haz clic en **"Import"**

### Paso 2: Configurar Variables de Entorno

Antes de desplegar, configura estas variables:

```bash
# Base de datos
DATABASE_URL="postgresql://usuario:contraseña@host:5432/database"

# NextAuth
NEXTAUTH_SECRET="genera_un_secreto_aleatorio_aqui"
NEXTAUTH_URL="https://tudominio.com"

# Configuración Multi-tenant
WILDCARD_DOMAIN=".tudominio.com"

# Features (opcional)
FEATURE_AI_NUTRITION=false
FEATURE_AUTO_SELECTION=false
```

**Generar `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

### Paso 3: Configurar el Dominio

1. En el dashboard de Vercel, ve a **Settings > Domains**
2. Añade tu dominio: `tudominio.com`
3. Vercel te mostrará los registros DNS que necesitas configurar
4. **Importante**: Añade también el wildcard:
   - `*.tudominio.com` → Apunta a tu proyecto de Vercel

### Paso 4: Desplegar

1. Haz clic en **"Deploy"**
2. Espera 2-3 minutos a que el build termine
3. Vercel generará una URL de preview automáticamente

---

## 🔧 3. Configurar Base de Datos

### Opción A: Vercel Postgres (Recomendado)

1. En tu proyecto de Vercel, ve a **Storage**
2. Crea una nueva base de datos **Postgres**
3. Vercel añadirá automáticamente `DATABASE_URL` a tus variables de entorno
4. Conecta tu proyecto local:
   ```bash
   vercel env pull .env.local
   ```

5. Ejecuta las migraciones:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Opción B: Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **Settings > Database** y copia el **Connection String**
4. Añádelo a Vercel como `DATABASE_URL`

### Opción C: Railway

1. Ve a [railway.app](https://railway.app)
2. Crea un nuevo proyecto PostgreSQL
3. Copia el **DATABASE_URL**
4. Añádelo a Vercel

---

## 🧪 4. Cómo Probar los Subdominios

### Desarrollo Local (sin dominio real)

Edita tu archivo `/etc/hosts` (Mac/Linux) o `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 tudominio.test
127.0.0.1 mediacreative.tudominio.test
127.0.0.1 admin.tudominio.test
127.0.0.1 lacocinadejuan.tudominio.test
```

Luego accede a:
- `http://admin.tudominio.test:3000` (Super Admin)
- `http://mediacreative.tudominio.test:3000/empresa` (Portal Empresa)
- `http://mediacreative.tudominio.test:3000/empleado` (Portal Empleado)

### Producción (con dominio real)

Una vez desplegado en Vercel y configurados los DNS:

1. Espera 5-15 minutos a que los DNS se propaguen
2. Accede a:
   - `https://admin.tudominio.com` (Super Admin)
   - `https://mediacreative.tudominio.com/empresa` (Portal Empresa)
   - `https://mediacreative.tudominio.com/empleado` (Portal Empleado)

---

## 🔐 5. Crear Usuario Super Admin

Después del primer despliegue, necesitas crear el primer usuario:

### Opción A: Seed de la base de datos

El proyecto ya incluye un seed con datos de prueba. Ejecútalo:

```bash
npx prisma db seed
```

Esto creará:
- Usuario Super Admin: `admin@mediacreative.com` / `Admin123!`
- 2 empresas de ejemplo
- 2 caterings de ejemplo
- Empleados de prueba

### Opción B: Manual con Prisma Studio

```bash
npx prisma studio
```

Abre `http://localhost:5555` y crea manualmente un usuario con rol `SUPER_ADMIN`.

---

## 📊 6. Verificar que Todo Funciona

### Checklist Post-Despliegue

- [ ] El dominio principal (`tudominio.com`) carga correctamente
- [ ] `admin.tudominio.com` muestra el login del Super Admin
- [ ] Puedes hacer login con el usuario de prueba
- [ ] Los subdominios wildcard funcionan (prueba con un subdominio inexistente, debería dar 404 "Tenant no encontrado")
- [ ] La base de datos tiene datos de seed
- [ ] Las migraciones de Prisma se ejecutaron correctamente

### URLs de Prueba

```bash
# Super Admin
https://admin.tudominio.com

# Portal Empresa (necesita subdomain de empresa existente)
https://mediacreative.tudominio.com/empresa/dashboard

# Portal Empleado (necesita subdomain de empresa existente)
https://mediacreative.tudominio.com/empleado/menus

# Portal Catering (necesita subdomain de catering existente)
https://lacocinadejuan.tudominio.com/catering/dashboard
```

---

## ⚡ 7. Despliegue Alternativo: Coolify (Self-hosted)

Si prefieres tener control total del servidor:

### Paso 1: Instalar Coolify

```bash
curl -fsSL https://get.coolify.io | bash
```

### Paso 2: Crear Aplicación

1. Accede a Coolify: `http://tu-servidor-ip:8000`
2. Crea un nuevo **Proyecto**
3. Añade una **Nueva Aplicación**
4. Conecta el repositorio: `https://github.com/pagra93/foodcatering.git`
5. Tipo: **Next.js**

### Paso 3: Configurar Dominio

1. En **Domains**, añade:
   - `tudominio.com`
   - `*.tudominio.com` (wildcard)
2. Coolify generará certificados SSL automáticamente

### Paso 4: Variables de Entorno

Añade las mismas variables que en Vercel (ver sección 2).

### Paso 5: Desplegar

Haz clic en **Deploy** y espera a que el build termine.

---

## 🆘 Problemas Comunes

### "Tenant no encontrado"

- **Causa**: El subdominio no existe en la base de datos
- **Solución**: Verifica que el tenant exista en la tabla `tenants` con el `subdomain` correcto

### Wildcard no funciona

- **Causa**: DNS no propagado o mal configurado
- **Solución**: 
  1. Verifica el registro DNS con `nslookup test.tudominio.com`
  2. Espera hasta 24h para propagación completa
  3. Usa [whatsmydns.net](https://whatsmydns.net) para verificar

### Error de CORS

- **Causa**: `NEXTAUTH_URL` mal configurado
- **Solución**: Asegúrate de que `NEXTAUTH_URL` sea `https://tudominio.com` (sin subdomain)

### Base de datos no conecta

- **Causa**: `DATABASE_URL` incorrecto o firewall
- **Solución**: 
  1. Verifica el string de conexión
  2. Asegúrate de que la BD acepta conexiones externas
  3. Revisa los logs de Vercel

---

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [Prisma Migrations](https://www.prisma.io/docs/guides/database/migrations)
- [NextAuth.js](https://next-auth.js.org/)
- [Wildcard DNS Setup](https://vercel.com/docs/concepts/projects/domains/wildcard-domains)

---

## 🎉 ¡Listo!

Ahora tu plataforma está desplegada y funcionando en producción con subdominios dinámicos para cada tenant.

**Siguientes Pasos:**
1. Personaliza los colores y branding
2. Configura el email transaccional (SendGrid, Resend, etc.)
3. Configura backups automáticos de la base de datos
4. Implementa monitoreo (Sentry, LogRocket)
5. Configura CI/CD con GitHub Actions

---

**¿Tienes dudas?** Revisa los logs de Vercel o abre un issue en GitHub.

