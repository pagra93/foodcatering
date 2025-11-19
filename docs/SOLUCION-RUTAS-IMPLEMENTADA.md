# ✅ Solución de Problemas de Rutas - IMPLEMENTADA

## 📦 Commit
```
Commit: 501da39
Mensaje: fix: corregir rutas de dashboard y auth según rol de usuario
```

---

## ✅ Cambios Implementados

### 1. ✅ Nuevo archivo: `lib/utils/dashboard.ts`

**Función principal:**
```typescript
getDashboardPath(role: UserRole, tenantType?: TenantType): string
```

**Mapeo de roles a dashboards:**
```
SUPER_ADMIN          → /admin
ADMIN_EMPRESA        → /empresa/dashboard
RRHH                 → /empresa/dashboard
FINANZAS             → /empresa/dashboard
MANAGER_SEDE         → /empresa/dashboard
VIEWER               → /empresa/dashboard
ADMIN_CATERING       → /catering/dashboard
CHEF                 → /catering/dashboard
COCINERO             → /catering/dashboard
REPARTIDOR           → /catering/dashboard
EMPLEADO             → /empleado/menus
Fallback             → /
```

---

### 2. ✅ Modificado: `middleware.ts`

**Antes (ROTO):**
```typescript
if (session && pathname === '/auth/login') {
  return NextResponse.redirect(new URL('/dashboard', req.url))  // ❌ 404
}
```

**Después (CORRECTO):**
```typescript
if (session && pathname === '/auth/login') {
  const dashboardPath = getDashboardPath(session.user.role, session.user.tenantType)
  return NextResponse.redirect(new URL(dashboardPath, req.url))  // ✅ Dinámico
}
```

**Resultado:**
- ✅ Ya NO redirige a `/dashboard` inexistente
- ✅ Cada usuario va a SU dashboard correcto
- ✅ Super Admin → `/admin`
- ✅ RRHH → `/empresa/dashboard`
- ✅ Chef → `/catering/dashboard`
- ✅ Empleado → `/empleado/menus`

---

### 3. ✅ Modificado: `lib/auth/config.ts`

**Antes (INCORRECTO):**
```typescript
pages: {
  signIn: '/login',          // ❌ Ruta no existe
  signOut: '/login',         // ❌ Ruta no existe
  error: '/error',           // ❌ Ruta no existe
  verifyRequest: '/verify',  // ❌ Ruta no existe
}
```

**Después (CORRECTO):**
```typescript
pages: {
  signIn: '/auth/login',          // ✅ Ruta real
  signOut: '/auth/login',         // ✅ Ruta real
  error: '/auth/error',           // ✅ Ruta real
  verifyRequest: '/auth/verify',  // ✅ Ruta real
}
```

**Resultado:**
- ✅ NextAuth usa las rutas correctas
- ✅ Ya NO busca páginas en rutas inexistentes
- ✅ Errores de auth se muestran en `/auth/error` (que SÍ existe)

---

## 🚀 Siguientes Pasos

### 1. Redeploy en Coolify

Como ya configuraste las variables de entorno, ahora necesitas hacer **redeploy**:

1. Ve a **Coolify → Tu aplicación**
2. Click en **"Redeploy"** o **"Force Rebuild"**
3. Espera 5-10 minutos a que compile

### 2. Verificar que se aplicaron los cambios

Una vez desplegado, verifica en los logs de build:
```
✓ Compiled successfully
```

---

## 🧪 Tests de Validación

### ✅ Test 1: Login como Super Admin

```bash
URL: https://admin.sintupper.com/login
Email: admin@sintupper.com
Password: Admin123!

ESPERADO:
✅ Redirige a: https://admin.sintupper.com/admin
❌ NO redirige a: https://admin.sintupper.com/dashboard (404)
```

---

### ✅ Test 2: Login como RRHH

```bash
URL: https://acme.sintupper.com/auth/login
Email: rrhh@acme.com
Password: Rrhh123!

ESPERADO:
✅ Redirige a: https://acme.sintupper.com/empresa/dashboard
❌ NO redirige a: https://acme.sintupper.com/dashboard (404)
```

---

### ✅ Test 3: Login como Empleado

```bash
URL: https://acme.sintupper.com/auth/login
Email: laura.gomez@acme.com
Password: Empleado123!

ESPERADO:
✅ Redirige a: https://acme.sintupper.com/empleado/menus
❌ NO redirige a: https://acme.sintupper.com/dashboard (404)
```

---

### ✅ Test 4: Login como Chef de Catering

```bash
URL: https://deliciasexpress.sintupper.com/auth/login
Email: chef@deliciasexpress.com
Password: Chef123!

ESPERADO:
✅ Redirige a: https://deliciasexpress.sintupper.com/catering/dashboard
❌ NO redirige a: https://deliciasexpress.sintupper.com/dashboard (404)
```

---

### ✅ Test 5: Botón "Acceder" desde Landing

```bash
1. Ir a: https://sintupper.com/
2. Click en botón "Acceder" (header)
3. Click en botón "Empezar ahora" (hero)

ESPERADO:
✅ Ambos llevan a: https://sintupper.com/auth/login
✅ Página de login carga correctamente
❌ NO muestra error 404
❌ NO muestra error "Configuration"
```

---

### ✅ Test 6: Error de NextAuth

```bash
1. Ir a: https://sintupper.com/auth/login
2. Introducir credenciales INCORRECTAS
3. Submit

ESPERADO:
✅ Muestra mensaje de error en la MISMA página (/auth/login)
❌ NO redirige a una URL con "sslip.io"
❌ NO muestra "error=Configuration"
```

---

## 📊 Checklist de Validación Post-Deploy

Marca cada item después de probarlo:

**Variables de entorno:**
- [ ] `NEXTAUTH_URL` configurado en Coolify
- [ ] `NEXTAUTH_SECRET` configurado en Coolify
- [ ] `WILDCARD_DOMAIN` configurado en Coolify
- [ ] `DATABASE_URL` configurado en Coolify

**Dominios:**
- [ ] `sintupper.com` configurado en Coolify
- [ ] `*.sintupper.com` (wildcard) configurado en Coolify
- [ ] SSL activo para todos los dominios

**Tests funcionales:**
- [ ] Login como Super Admin → `/admin`
- [ ] Login como RRHH → `/empresa/dashboard`
- [ ] Login como Empleado → `/empleado/menus`
- [ ] Login como Chef → `/catering/dashboard`
- [ ] Botón "Acceder" de landing funciona
- [ ] Error de login NO muestra "Configuration"
- [ ] Error de login NO muestra "sslip.io"

---

## 🐛 Si aún tienes problemas

### Problema: Sigue mostrando "sslip.io"

**Causa:** Variables de entorno no se aplicaron correctamente

**Solución:**
1. Ir a Coolify → Environment Variables
2. Verificar que `NEXTAUTH_URL=https://sintupper.com` (sin subdomain)
3. Hacer **Force Rebuild** (no solo Redeploy)
4. Esperar a que termine el build
5. Verificar en logs que las variables se cargaron

---

### Problema: Sigue dando 404 en `/dashboard`

**Causa:** El código nuevo no se desplegó

**Solución:**
1. Verificar en GitHub que el commit `501da39` existe
2. En Coolify, verificar que está usando la rama `main`
3. Hacer **Force Rebuild**
4. Verificar en logs de build: "Compiled successfully"

---

### Problema: Error "Configuration" persiste

**Causa:** `NEXTAUTH_SECRET` falta o es incorrecto

**Solución:**
1. Generar uno nuevo:
   ```bash
   openssl rand -base64 32
   ```
2. Copiar el resultado (debería ser ~44 caracteres)
3. En Coolify → Environment Variables
4. Añadir/actualizar: `NEXTAUTH_SECRET=[resultado del comando]`
5. Force Rebuild

---

## 📝 Resumen de Archivos Modificados

```
✅ lib/utils/dashboard.ts          (NUEVO - 47 líneas)
✅ middleware.ts                    (MODIFICADO - línea 17, 125-126)
✅ lib/auth/config.ts              (MODIFICADO - líneas 33-36)
✅ docs/DIAGNOSTICO-PROBLEMAS-RUTAS.md  (NUEVO - 358 líneas)
✅ docs/CREDENCIALES-PRUEBA.md     (NUEVO - 254 líneas)
✅ docs/SOLUCION-RUTAS-IMPLEMENTADA.md  (ESTE ARCHIVO)
```

---

## 🎯 Estado Final

```
Problemas identificados:  5
Problemas resueltos:     5
Estado:                  ✅ COMPLETO
Requiere:                Redeploy en Coolify
```

**Fecha:** Noviembre 19, 2024  
**Commit:** 501da39  
**Branch:** main

---

## 🔗 Referencias

- [Diagnóstico completo](./DIAGNOSTICO-PROBLEMAS-RUTAS.md)
- [Credenciales de prueba](./CREDENCIALES-PRUEBA.md)
- [Configuración DNS](./CONFIGURACION-DNS-SINTUPPER.md)
- [Guía de despliegue](./DESPLIEGUE-COOLIFY.md)

