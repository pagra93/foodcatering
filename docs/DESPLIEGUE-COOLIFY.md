# 🚀 Guía de Despliegue en Coolify

## ✅ Archivos Necesarios (Ya incluidos)

- ✅ `Dockerfile` - Configuración de Docker multi-stage
- ✅ `.dockerignore` - Optimización del build
- ✅ `next.config.js` - Con `output: 'standalone'` habilitado
- ✅ `package.json` - Con scripts de Prisma
- ✅ `prisma/schema.prisma` - Schema de la base de datos
- ✅ `prisma/migrations/*.sql` - Migraciones SQL

## 📋 Pasos para Desplegar en Coolify

### 1. Crear Base de Datos PostgreSQL

En Coolify:
1. Ve a **Resources** → **Database**
2. Crea una nueva **PostgreSQL** database
3. Anota el **Connection String** (lo necesitarás para las variables de entorno)

### 2. Crear Nueva Aplicación

1. En Coolify, ve a tu **Proyecto**
2. Haz clic en **"New Resource"** → **"Application"**
3. Selecciona **"GitHub"** como fuente
4. Conecta tu cuenta de GitHub si no lo has hecho
5. Selecciona el repositorio: `pagra93/foodcatering`
6. Branch: `main`
7. Tipo de aplicación: **"Dockerfile"** (Coolify detectará automáticamente el Dockerfile)

### 3. Configurar Variables de Entorno

En la configuración de la aplicación, añade estas variables:

```bash
# Base de datos (usa el connection string de Coolify)
DATABASE_URL="postgresql://usuario:contraseña@host:5432/database"

# NextAuth (genera uno nuevo para producción)
NEXTAUTH_SECRET="genera_un_secreto_aleatorio_aqui"
NEXTAUTH_URL="https://tudominio.com"

# Configuración Multi-tenant
WILDCARD_DOMAIN=".tudominio.com"

# Node Environment
NODE_ENV="production"
```

**Generar `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

### 4. Configurar Dominio

1. En **Domains**, añade:
   - `tudominio.com` (dominio principal)
   - `*.tudominio.com` (wildcard para subdominios)

2. Coolify generará automáticamente los certificados SSL

### 5. Configurar Puerto

- **Puerto interno**: `3000` (Next.js por defecto)
- Coolify manejará el proxy automáticamente

### 6. Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que el build termine (puede tardar 5-10 minutos la primera vez)
3. Revisa los logs si hay algún error

## 🔍 Verificar el Despliegue

### Logs Importantes

Después del despliegue, verifica en los logs:

1. **Prisma Client generado**: Deberías ver `Prisma Client generated`
2. **Migraciones ejecutadas**: Deberías ver `Applied migration: ...`
3. **Next.js iniciado**: Deberías ver `Ready on http://0.0.0.0:3000`

### URLs de Prueba

```bash
# Super Admin
https://admin.tudominio.com

# Portal Empresa (necesita tenant existente)
https://mediacreative.tudominio.com/empresa/dashboard

# Portal Empleado
https://mediacreative.tudominio.com/empleado/menus
```

## 🆘 Troubleshooting

### Error: "Prisma Client not generated"

**Solución**: Verifica que `DATABASE_URL` esté configurada correctamente. El Dockerfile ejecuta `prisma generate` automáticamente.

### Error: "Migration failed"

**Solución**: 
1. Verifica que la base de datos esté accesible desde el contenedor
2. Revisa los logs de Coolify para ver el error específico
3. Asegúrate de que `DATABASE_URL` tenga permisos de escritura

### Error: "Cannot find module"

**Solución**: 
1. Verifica que `pnpm-lock.yaml` esté en el repo
2. Revisa que el Dockerfile esté usando `pnpm install --frozen-lockfile`

### Build muy lento

**Solución**: 
- El primer build puede tardar 10-15 minutos
- Los builds siguientes serán más rápidos gracias al cache de Docker
- Verifica que `.dockerignore` esté excluyendo archivos innecesarios

### Subdominios no funcionan

**Solución**:
1. Verifica que el wildcard DNS esté configurado: `*.tudominio.com`
2. Espera 5-15 minutos para propagación DNS
3. Verifica en Coolify que el dominio wildcard esté añadido

## 📊 Monitoreo

### Ver Logs en Tiempo Real

En Coolify:
1. Ve a tu aplicación
2. Haz clic en **"Logs"**
3. Selecciona **"Real-time logs"**

### Verificar Estado de la Aplicación

- **Health Check**: Coolify verificará automáticamente que la app responda en el puerto 3000
- **Restart automático**: Si la app falla, Coolify la reiniciará automáticamente

## 🔄 Actualizaciones

Para actualizar la aplicación:

1. Haz cambios en tu código local
2. Haz commit y push a `main`:
   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad"
   git push origin main
   ```
3. Coolify detectará automáticamente el nuevo commit
4. Iniciará un nuevo despliegue automáticamente

## 🗄️ Base de Datos

### Ejecutar Migraciones Manualmente

Si necesitas ejecutar migraciones manualmente:

1. En Coolify, ve a tu aplicación
2. Haz clic en **"Execute Command"**
3. Ejecuta:
   ```bash
   pnpm prisma migrate deploy
   ```

### Seed de Datos Iniciales

Para poblar la base de datos con datos de prueba:

1. En **"Execute Command"**, ejecuta:
   ```bash
   pnpm prisma db seed
   ```

Esto creará:
- Usuario Super Admin: `admin@mediacreative.com` / `Admin123!`
- Empresas de ejemplo
- Caterings de ejemplo
- Empleados de prueba

## 🔐 Seguridad

### Variables Sensibles

Nunca subas estos archivos al repo:
- `.env*`
- `DATABASE_URL` con credenciales
- `NEXTAUTH_SECRET`

Configúralos siempre en Coolify como **Variables de Entorno**.

### Certificados SSL

Coolify genera automáticamente certificados SSL con Let's Encrypt. No necesitas configurar nada manualmente.

## 📚 Recursos

- [Documentación de Coolify](https://coolify.io/docs)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Prisma Migrations](https://www.prisma.io/docs/guides/database/migrations)

---

**¿Problemas?** Revisa los logs en Coolify o abre un issue en GitHub.

