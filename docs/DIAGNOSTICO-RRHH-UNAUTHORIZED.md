# 🚨 DIAGNÓSTICO - RRHH REDIRECT A /UNAUTHORIZED

**Fecha**: 2025-11-24  
**Usuario afectado**: `rrhh@acme.com`  
**Problema**: Redirige a `/unauthorized` después de login exitoso

---

## 🔍 ANÁLISIS DEL FLUJO

### 1. Login (✅ EXITOSO)
```
✅ Login exitoso: rrhh@acme.com
```

El usuario SÍ se autentica correctamente.

### 2. Error Inmediato
```
⨯ Error: Event handlers cannot be passed to Client Component props.
  {onClick: function onClick, className: ..., children: ...}
```

Este error aparece ANTES del redirect.

### 3. Redirect a `/unauthorized`
```
https://acme.sintupper.com/unauthorized
```

---

## 🔎 CAUSA IDENTIFICADA

### Middleware NO Inyecta Headers

**Archivo**: `middleware.ts` líneas 41-62

```typescript
if (!isPublic) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ⚠️ AQUÍ ESTÁ EL PROBLEMA
  if (session?.user?.tenantId) {  // ← Si esto es false, NO inyecta headers
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tenant-id', session.user.tenantId)
    
    if (session.user.tenantType) {
      requestHeaders.set('x-tenant-type', session.user.tenantType)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
}
```

**Si `session.user.tenantId` es `null/undefined`**:
1. NO inyecta los headers
2. Cae al `return NextResponse.next()` (línea 64)
3. La request llega al layout SIN headers
4. `getCurrentTenant()` intenta leer `x-tenant-id`
5. No lo encuentra → lanza error
6. Next.js redirige a `/unauthorized`

---

## 🧪 VERIFICACIONES

### ¿El usuario tiene tenantId en BD?

**En el seed** (líneas 174-181):
```typescript
const rrhhUser = await prisma.user.upsert({
  where: {
    tenantId_email: {
      tenantId: empresaTenant.id,
      email: 'rrhh@acme.com',
    },
  },
  update: {},
  create: {
    tenantId: empresaTenant.id,  // ✅ SÍ SE ASIGNA
    email: 'rrhh@acme.com',
    passwordHash: await hash('Rrhh123!', 10),
    nameEnc: 'María García (RRHH)',
    role: 'RRHH',
    status: 'ACTIVE',
  },
})
```

✅ El usuario DEBERÍA tener tenantId.

### ¿NextAuth está pasando tenantId?

**En `lib/auth/config.ts`**:

#### `authorize()` (líneas 98-107):
```typescript
return {
  id: user.id,
  email: user.email,
  name: user.nameEnc,
  role: normalizedRole,
  tenantId: user.tenantId,  // ✅ SÍ RETORNA
  tenantType: normalizedTenantType,
  mfaEnabled: user.mfaEnabled,
  status: user.status,
}
```

#### `jwt()` callback (línea 128):
```typescript
if (user) {
  token.id = user.id
  token.email = user.email
  token.name = user.name
  token.role = user.role
  token.tenantId = user.tenantId  // ✅ SÍ ASIGNA
  token.tenantType = user.tenantType
  token.mfaEnabled = user.mfaEnabled
}
```

#### `session()` callback (línea 199):
```typescript
if (session.user) {
  session.user.id = token.id
  session.user.email = token.email
  session.user.name = token.name
  session.user.role = token.role
  session.user.tenantId = token.tenantId  // ✅ SÍ ASIGNA
  session.user.tenantType = token.tenantType
  session.user.mfaEnabled = token.mfaEnabled
}
```

✅ NextAuth DEBERÍA estar pasando tenantId correctamente.

---

## 🎯 HIPÓTESIS

### Hipótesis 1: Base de datos no tiene tenantId
❓ **Posible** si el seed no se ejecutó o falló.

**Verificación**: Ejecutar query directa en BD:
```sql
SELECT id, email, "tenantId", role, status
FROM "users"
WHERE email = 'rrhh@acme.com';
```

### Hipótesis 2: Caché de sesión antiguo
❓ **Posible** si el usuario se logueó ANTES de ejecutar el seed actualizado.

**Solución**: Logout completo + Clear cookies + Re-login

### Hipótesis 3: Error en NextAuth callback
❓ **Menos probable** pero posible si hay un error silencioso en el authorize().

**Verificación**: Agregar logs al authorize() y verificar qué retorna.

### Hipótesis 4: Middleware mal configurado
❓ **Menos probable** ya que el código se ve correcto.

**Verificación**: Agregar logs al middleware para ver qué tiene `session.user`.

---

## 🚀 PLAN DE ACCIÓN

### Sprint 1: Logging y Diagnóstico
1. Agregar logs al authorize() para ver qué retorna
2. Agregar logs al middleware para ver session.user
3. Redeploy y ver los logs en Coolify

### Sprint 2: Verificación BD
1. Conectar a BD en Coolify
2. Ejecutar query para verificar tenantId de rrhh@acme.com
3. Si no tiene tenantId, ejecutar seed nuevamente

### Sprint 3: Sesión y Caché
1. Hacer logout completo
2. Limpiar cookies en el navegador
3. Re-login con rrhh@acme.com
4. Verificar si funciona

### Sprint 4: Fix del Middleware
Si el problema persiste, cambiar el middleware para manejar el caso donde tenantId es null:
```typescript
if (!session?.user?.tenantId) {
  console.error('[MIDDLEWARE] User without tenantId:', session.user)
  return NextResponse.redirect(new URL('/login?error=NoTenant', req.url))
}
```

---

## 📝 RECOMENDACIÓN INMEDIATA

**AGREGAR LOGGING TEMPORAL** para diagnosticar:

1. En `lib/auth/config.ts` authorize():
```typescript
const userReturn = {
  id: user.id,
  email: user.email,
  name: user.nameEnc,
  role: normalizedRole,
  tenantId: user.tenantId,
  tenantType: normalizedTenantType,
  mfaEnabled: user.mfaEnabled,
  status: user.status,
}
console.log('[AUTHORIZE] Returning user:', userReturn)
return userReturn
```

2. En `middleware.ts`:
```typescript
if (!isPublic) {
  const session = await auth()
  console.log('[MIDDLEWARE] Session:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    hasTenantId: !!session?.user?.tenantId,
    tenantId: session?.user?.tenantId,
    email: session?.user?.email,
  })
  
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session?.user?.tenantId) {
    // ...
  } else {
    console.error('[MIDDLEWARE] NO TENANT ID for user:', session.user.email)
  }
}
```

3. Redeploy y revisar logs

