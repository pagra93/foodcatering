# 🔍 Diagnóstico de Problemas con Rutas y Dominios

## ❌ Problemas Identificados

### 1. ERROR CRÍTICO: Redirección a URL incorrecta con error "Configuration"

**Síntoma:**
```
http://mckwk44w0w8g4cw8844ok4s8.5.78.124.107.sslip.io/error?error=Configuration
```

**Causa Raíz:**
NextAuth no tiene configurado correctamente `NEXTAUTH_URL` en las variables de entorno de Coolify.

**Análisis:**
- La URL `sslip.io` es la URL temporal que Coolify genera automáticamente
- El error `error=Configuration` de NextAuth significa que:
  1. `NEXTAUTH_URL` no está configurada, o
  2. `NEXTAUTH_URL` no coincide con el dominio actual, o
  3. `NEXTAUTH_SECRET` no está configurado

**Ubicación del problema:**
- Archivo: Variables de entorno en Coolify
- Afecta a: `lib/auth/config.ts` (líneas 32-37)

---

### 2. ERROR: Redirección incorrecta desde `/auth/login` a `/dashboard` (404)

**Síntoma:**
- Usuario autenticado va a `/auth/login`
- Se redirige a `/dashboard`
- Error 404 porque `/dashboard` NO EXISTE

**Causa Raíz:**
En `middleware.ts` línea 124:
```typescript
if (session && pathname === '/auth/login') {
  return NextResponse.redirect(new URL('/dashboard', req.url))
}
```

**El problema:**
La ruta `/dashboard` no existe en la aplicación. Cada tipo de usuario tiene su propia ruta:

| Rol | Dashboard correcto | Redirección actual | Estado |
|-----|-------------------|-------------------|--------|
| `SUPER_ADMIN` | `/admin` | `/dashboard` | ❌ 404 |
| `ADMIN_EMPRESA`, `RRHH`, `FINANZAS` | `/empresa/dashboard` | `/dashboard` | ❌ 404 |
| `ADMIN_CATERING`, `CHEF` | `/catering/dashboard` | `/dashboard` | ❌ 404 |
| `EMPLEADO` | `/empleado/menus` | `/dashboard` | ❌ 404 |

**Ubicación del problema:**
- Archivo: `middleware.ts` línea 124
- Función auxiliar necesaria: `getDashboardPath()` (existe en otros archivos pero no se usa aquí)

---

### 3. ERROR: Botones de Landing Page apuntan a `/auth/login` pero middleware causa problemas

**Síntoma:**
- Botón "Acceder" en landing (`/`) va a `/auth/login`
- Si el usuario ya está autenticado, el middleware lo redirige a `/dashboard` (404)

**Causa Raíz:**
Dos problemas relacionados:
1. Landing page correcta (líneas 30 y 54 de `app/(landing)/page.tsx`)
2. Middleware redirige mal (problema #2 arriba)

**Ubicación del problema:**
- Archivo: `app/(landing)/page.tsx` líneas 30, 54 (correcto, pero afectado por middleware)
- Archivo: `middleware.ts` línea 124 (causa del error)

---

### 4. PROBLEMA DE CONFIGURACIÓN: Variables de entorno inconsistentes

**Análisis de configuración:**

#### En desarrollo local (`env.example`):
```env
NEXTAUTH_URL="http://localhost:3000"
WILDCARD_DOMAIN=".sintupper.localhost"
```

#### En producción (debería ser):
```env
NEXTAUTH_URL="https://sintupper.com"
WILDCARD_DOMAIN=".sintupper.com"
```

#### Actualmente en Coolify (inferido del error):
```
NEXTAUTH_URL = NO CONFIGURADO o incorrecto
→ NextAuth usa la URL de Coolify por defecto (sslip.io)
```

**Problema:**
Si `NEXTAUTH_URL` no está configurado en Coolify, NextAuth intenta usar la URL de la request, lo que causa:
- Callbacks incorrectos
- CSRF token mismatch
- Error "Configuration"

---

### 5. PROBLEMA ESTRUCTURAL: Inconsistencia en rutas de auth

**Análisis de páginas de auth:**

#### Páginas configuradas en `authConfig.pages`:
```typescript
pages: {
  signIn: '/login',          // ❌ Incorrecto (debería ser /auth/login)
  signOut: '/login',         // ❌ Incorrecto
  error: '/error',           // ❌ Incorrecto (debería ser /auth/error)
  verifyRequest: '/verify',  // ❌ Incorrecto (debería ser /auth/verify)
}
```

#### Páginas reales en la aplicación:
```
/Users/pablogranados/Desktop/comidas/app/
├── (auth)/
│   ├── login/page.tsx           ← Ruta real: /auth/login
│   ├── error/page.tsx           ← Ruta real: /auth/error
│   ├── verify/page.tsx          ← Ruta real: /auth/verify
│   ├── forgot-password/page.tsx ← Ruta real: /auth/forgot-password
│   └── reset-password/page.tsx  ← Ruta real: /auth/reset-password
```

**Problema:**
Las rutas configuradas en `lib/auth/config.ts` no coinciden con las rutas reales debido al route group `(auth)`.

**Ubicación del problema:**
- Archivo: `lib/auth/config.ts` líneas 32-37

---

## 🔧 Soluciones Propuestas

### Solución 1: Configurar variables de entorno en Coolify

**En Coolify → Tu aplicación → Environment Variables:**

```env
# NextAuth (CRÍTICO)
NEXTAUTH_URL=https://sintupper.com
NEXTAUTH_SECRET=[generar con: openssl rand -base64 32]

# Multi-tenant
WILDCARD_DOMAIN=.sintupper.com

# Base de datos
DATABASE_URL=[tu connection string de PostgreSQL]

# Node
NODE_ENV=production
```

**Prioridad:** 🔴 CRÍTICO - Resolver primero

---

### Solución 2: Corregir redirección en middleware

**En `middleware.ts` línea 124:**

**Código actual (MALO):**
```typescript
if (session && pathname === '/auth/login') {
  return NextResponse.redirect(new URL('/dashboard', req.url))
}
```

**Código correcto (BUENO):**
```typescript
if (session && pathname === '/auth/login') {
  // Importar getDashboardPath desde lib/utils/dashboard
  const dashboardPath = getDashboardPath(session.user.role, session.user.tenantType)
  return NextResponse.redirect(new URL(dashboardPath, req.url))
}
```

**Crear función auxiliar en `lib/utils/dashboard.ts`:**
```typescript
import { UserRole, TenantType } from '@prisma/client'

export function getDashboardPath(role: UserRole, tenantType?: TenantType): string {
  // Super Admin
  if (role === 'SUPER_ADMIN') {
    return '/admin'
  }
  
  // Empresa roles
  if (['ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE', 'VIEWER'].includes(role)) {
    return '/empresa/dashboard'
  }
  
  // Catering roles
  if (['ADMIN_CATERING', 'CHEF', 'COCINERO', 'REPARTIDOR'].includes(role)) {
    return '/catering/dashboard'
  }
  
  // Empleado
  if (role === 'EMPLEADO') {
    return '/empleado/menus'
  }
  
  // Fallback
  return '/'
}
```

**Prioridad:** 🔴 CRÍTICO

---

### Solución 3: Corregir rutas de auth en config

**En `lib/auth/config.ts` líneas 32-37:**

**Código actual (MALO):**
```typescript
pages: {
  signIn: '/login',
  signOut: '/login',
  error: '/error',
  verifyRequest: '/verify',
}
```

**Código correcto (BUENO):**
```typescript
pages: {
  signIn: '/auth/login',
  signOut: '/auth/login',
  error: '/auth/error',
  verifyRequest: '/auth/verify',
}
```

**Prioridad:** 🟡 ALTA

---

### Solución 4: Verificar configuración de dominios en Coolify

**En Coolify → Tu aplicación → Domains:**

Debe tener configurado:
```
✅ sintupper.com (dominio principal)
✅ *.sintupper.com (wildcard para subdominios)
```

**O subdominios individuales:**
```
✅ admin.sintupper.com
✅ acme.sintupper.com
✅ deliciasexpress.sintupper.com
```

**Prioridad:** 🟡 ALTA

---

## 📊 Orden de Implementación

### FASE 1: Emergencia (hacer YA)
1. ✅ Configurar `NEXTAUTH_URL` y `NEXTAUTH_SECRET` en Coolify
2. ✅ Configurar `WILDCARD_DOMAIN` en Coolify
3. ✅ Hacer redeploy de la aplicación

### FASE 2: Crítico (hacer hoy)
4. ✅ Crear función `getDashboardPath()` en `lib/utils/dashboard.ts`
5. ✅ Corregir redirección en `middleware.ts` línea 124
6. ✅ Corregir rutas de auth en `lib/auth/config.ts`
7. ✅ Commit y push

### FASE 3: Validación (después del deploy)
8. ✅ Probar login desde `https://sintupper.com`
9. ✅ Probar login desde `https://admin.sintupper.com/login`
10. ✅ Verificar que cada rol redirige al dashboard correcto
11. ✅ Verificar que ya NO aparece la URL `sslip.io`

---

## 🧪 Tests de Validación

### Test 1: Login como Super Admin
```
1. Ir a: https://admin.sintupper.com/login
2. Login: admin@sintupper.com / Admin123!
3. ✅ DEBE redirigir a: https://admin.sintupper.com/admin
4. ❌ NO DEBE redirigir a: https://admin.sintupper.com/dashboard
```

### Test 2: Login como RRHH de empresa
```
1. Ir a: https://acme.sintupper.com/auth/login
2. Login: rrhh@acme.com / Rrhh123!
3. ✅ DEBE redirigir a: https://acme.sintupper.com/empresa/dashboard
4. ❌ NO DEBE redirigir a: https://acme.sintupper.com/dashboard
```

### Test 3: Login como Empleado
```
1. Ir a: https://acme.sintupper.com/auth/login
2. Login: laura.gomez@acme.com / Empleado123!
3. ✅ DEBE redirigir a: https://acme.sintupper.com/empleado/menus
4. ❌ NO DEBE redirigir a: https://acme.sintupper.com/dashboard
```

### Test 4: Login como Chef de catering
```
1. Ir a: https://deliciasexpress.sintupper.com/auth/login
2. Login: chef@deliciasexpress.com / Chef123!
3. ✅ DEBE redirigir a: https://deliciasexpress.sintupper.com/catering/dashboard
4. ❌ NO DEBE redirigir a: https://deliciasexpress.sintupper.com/dashboard
```

### Test 5: Botón "Acceder" de landing
```
1. Ir a: https://sintupper.com/
2. Click en botón "Acceder"
3. ✅ DEBE llevar a: https://sintupper.com/auth/login
4. ❌ NO DEBE mostrar error 404
```

---

## 📝 Resumen Ejecutivo

**Problemas encontrados:** 5  
**Prioridad crítica:** 3  
**Prioridad alta:** 2

**Root cause principal:**
- Variables de entorno NO configuradas en Coolify (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`)
- Redirección hardcodeada a `/dashboard` que no existe

**Impacto:**
- 🔴 **BLOQUEANTE:** Ningún usuario puede hacer login correctamente
- 🔴 **BLOQUEANTE:** Error "Configuration" en todos los intentos de auth
- 🔴 **BLOQUEANTE:** 404 después de login exitoso

**Tiempo estimado de fix:**
- Configurar variables de entorno: 5 minutos
- Corregir código: 15 minutos
- Deploy y testing: 10 minutos
- **TOTAL: ~30 minutos**

---

**Fecha del diagnóstico:** Noviembre 19, 2024  
**Estado:** 🔴 CRÍTICO - Requiere acción inmediata

