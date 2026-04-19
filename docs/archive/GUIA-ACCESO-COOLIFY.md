# 🚀 Guía de Acceso - Despliegue en Coolify

## ✅ Estado Actual del Despliegue

- ✅ Servidor Next.js corriendo correctamente
- ✅ Base de datos PostgreSQL conectada
- ✅ Schema de Prisma sincronizado
- ✅ Variables de entorno configuradas en Coolify

## 📊 Configuración de la Base de Datos

### URLs Disponibles

**URL Pública** (desde fuera del servidor):
```
postgres://postgres:t3t9lUq8T29HNrp38Znhidr10ykVIx4mK9ScdWkllVewGcRq9mPWy4OMEBu01H93@5.78.124.107:5432/postgres
```

**URL Interna** (dentro de la red Docker de Coolify):
```
postgresql://postgres:t3t9lUq8T29HNrp38Znhidr10ykVIx4mK9ScdWkllVewGcRq9mPWy4OMEBu01H93@fws4wwks04kwkg8ss0sk004c:5432/postgres
```

### ⚠️ Importante

La aplicación usa la **URL interna** porque está en la misma red Docker que PostgreSQL.
Esto está configurado en Coolify como variable de entorno `DATABASE_URL`.

## 🌐 URLs de Acceso

### Dominio Actual de Coolify

```
http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io
```

### Rutas Disponibles

#### 1. Landing Page (sin tenant)
```
http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io/
```
- No requiere subdomain
- Página de presentación pública
- Debe mostrar la landing page de Comidas Platform

#### 2. Login (sin tenant)
```
http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io/login
```
- No requiere subdomain
- Página de login general

#### 3. Portal Admin (sin tenant)
```
http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io/admin
```
- Solo para Super Admin
- No requiere subdomain

## 🔍 Verificar Tenants en la Base de Datos

Para saber qué subdominios/tenants están disponibles, conéctate a PostgreSQL:

### Opción 1: Desde tu ordenador (usando URL pública)

```bash
psql "postgres://postgres:t3t9lUq8T29HNrp38Znhidr10ykVIx4mK9ScdWkllVewGcRq9mPWy4OMEBu01H93@5.78.124.107:5432/postgres"
```

Luego ejecuta:

```sql
-- Ver todos los tenants
SELECT id, subdomain, name, type, status FROM "Tenant";

-- Ver usuarios disponibles
SELECT u.id, u.email, u.role, t.subdomain as tenant_subdomain
FROM "User" u
JOIN "Tenant" t ON u."tenantId" = t.id
LIMIT 10;
```

### Opción 2: Usando DBeaver/TablePlus

1. Crear nueva conexión PostgreSQL
2. Host: `5.78.124.107`
3. Puerto: `5432`
4. Base de datos: `postgres`
5. Usuario: `postgres`
6. Contraseña: `t3t9lUq8T29HNrp38Znhidr10ykVIx4mK9ScdWkllVewGcRq9mPWy4OMEBu01H93`

## 🎯 Cómo Usar Subdominios con Coolify

### El Problema con sslip.io

El dominio de Coolify es:
```
mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io
```

Este formato NO soporta subdominios reales. Para usar subdominios necesitas:

### Solución 1: Dominio Propio (RECOMENDADO)

1. **Comprar un dominio**: Por ejemplo `comida.com`
2. **Configurar DNS wildcard**: 
   ```
   *.comida.com  A  5.78.124.107
   comida.com    A  5.78.124.107
   ```
3. **Configurar en Coolify**: Cambiar el dominio de la aplicación a `comida.com`
4. **Acceder con subdominios**:
   ```
   http://techcorp.comida.com/empresa/dashboard
   http://admin.comida.com/admin
   ```

### Solución 2: Acceso Directo por IP (TEMPORAL)

Sin subdominios, puedes:

1. **Acceder a la landing page**: `http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io/`
2. **Login como admin**: `http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io/admin`
3. **Gestionar tenants**: Desde el admin, crear/editar empresas y caterings

## 🐛 Diagnóstico de Problemas

### Problema: "Tenant no encontrado"

**Causa**: Estás accediendo a una ruta que requiere subdomain sin tener uno válido.

**Soluciones**:
- Accede a `/` o `/login` que no requieren tenant
- Verifica que el subdomain existe en la base de datos
- Usa un dominio propio con wildcard DNS

### Problema: No veo datos

**Verificar**:
1. ¿La base de datos tiene datos?
   ```sql
   SELECT COUNT(*) FROM "Tenant";
   SELECT COUNT(*) FROM "User";
   SELECT COUNT(*) FROM "Company";
   ```

2. ¿El middleware permite el acceso?
   - Revisa los logs del contenedor
   - Asegúrate de estar logueado con las credenciales correctas

### Problema: 502 Bad Gateway

**Verificar**:
1. Revisa los logs del contenedor en Coolify
2. Asegúrate de que el servidor esté corriendo:
   ```
   Debe aparecer: "🌐 Iniciando servidor Next.js..."
   ```

## 📝 Variables de Entorno en Coolify

Verifica que tienes configuradas estas variables:

```env
DATABASE_URL=postgresql://postgres:t3t9lUq8T29HNrp38Znhidr10ykVIx4mK9ScdWkllVewGcRq9mPWy4OMEBu01H93@fws4wwks04kwkg8ss0sk004c:5432/postgres
NEXTAUTH_SECRET=L0mRpS/k2fb/0WhNP3rJKLPjBp3PIT2/taJuty6yeb8=
NEXTAUTH_URL=http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io
WILDCARD_DOMAIN=.mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io
```

## 🚀 Próximos Pasos

1. **Redesplegar**: Para aplicar los últimos cambios del middleware
2. **Acceder a la landing page**: `http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io/`
3. **Verificar tenants**: Consultar la base de datos para ver qué subdominios existen
4. **Considerar dominio propio**: Para usar subdominios reales

## 💡 Credenciales de Prueba (si ejecutaste el seed)

Si ejecutaste `npm run db:seed`, estas credenciales deberían funcionar:

```
Super Admin:
Email: admin@comida.com
Password: Admin123!

Usuario Empresa (TechCorp):
Email: admin@techcorp.com
Password: Techcorp123!
```

**Nota**: Verifica en la base de datos si estos usuarios existen.

