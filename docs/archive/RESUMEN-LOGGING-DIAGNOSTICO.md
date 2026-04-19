# 🔍 LOGGING TEMPORAL PARA DIAGNÓSTICO - RRHH UNAUTHORIZED

**Fecha**: 2025-11-24  
**Objetivo**: Identificar por qué `rrhh@acme.com` es redirigido a `/unauthorized`

---

## 📝 CAMBIOS REALIZADOS

### 1. `middleware.ts`
✅ Agregado logging detallado:
- Estado de sesión
- Presencia de tenantId
- Email y role del usuario
- Headers inyectados

✅ Agregado redirect explícito si NO hay tenantId:
```typescript
if (!session?.user?.tenantId) {
  console.error('[MIDDLEWARE] ⚠️ NO TENANT ID for user:', session.user.email)
  return NextResponse.redirect(new URL('/login?error=NoTenant', req.url))
}
```

### 2. `lib/auth/config.ts` - authorize()
✅ Agregado logging:
- Usuario encontrado en BD
- tenantId del usuario
- Objeto final normalizado que se retorna al JWT

---

## 🚀 PRÓXIMOS PASOS

### 1. REDEPLOY en Coolify
```bash
git add -A
git commit -m "debug: agregar logging temporal para diagnosticar rrhh unauthorized"
git push origin main
```

### 2. Ver logs en Coolify
1. Abre Coolify
2. Ve a la aplicación
3. Abre la pestaña de "Logs"
4. Inicia sesión con `rrhh@acme.com` / `Rrhh123!`
5. Observa los logs

### 3. Analizar los logs
Buscar estas líneas:
```
[AUTHORIZE] User found in DB: { email: '...', tenantId: '...', role: '...', tenantType: '...' }
[AUTHORIZE] Returning normalized user: { ... }
[MIDDLEWARE] { pathname: '...', hasSession: ..., hasTenantId: ..., tenantId: '...', email: '...', role: '...' }
```

### 4. Posibles resultados

#### Caso A: `[AUTHORIZE]` NO aparece en logs
**Causa**: El usuario NO se está autenticando correctamente.

**Solución**: 
- Verificar que el usuario existe en BD
- Verificar password
- Re-ejecutar seed

#### Caso B: `[AUTHORIZE]` muestra `tenantId: null`
**Causa**: El usuario en BD NO tiene tenantId.

**Solución**:
- Re-ejecutar seed
- O hacer update manual:
```sql
UPDATE users
SET "tenantId" = (SELECT id FROM tenants WHERE subdomain = 'acme')
WHERE email = 'rrhh@acme.com';
```

#### Caso C: `[AUTHORIZE]` muestra tenantId correcto PERO `[MIDDLEWARE]` muestra `hasTenantId: false`
**Causa**: El callback de NextAuth NO está pasando tenantId de authorize() → jwt() → session().

**Solución**:
- Verificar que los callbacks están funcionando
- Limpiar sesión (logout + clear cookies)
- Re-login

#### Caso D: `[MIDDLEWARE]` muestra `hasTenantId: true` PERO sigue redirigiendo
**Causa**: El error NO es del tenantId, sino de otro componente.

**Solución**:
- Buscar el error "Event handlers cannot be passed" en otro componente
- Verificar EmpresaNavbar, EmpresaSidebar, etc.

---

## 📊 INFORMACIÓN ESPERADA

Si todo está correcto, deberías ver:

```
[AUTHORIZE] User found in DB: {
  email: 'rrhh@acme.com',
  tenantId: 'acme-tenant-id-aqui',
  role: 'rrhh',
  tenantType: 'empresa'
}
[AUTHORIZE] Returning normalized user: {
  id: '...',
  email: 'rrhh@acme.com',
  name: 'María García (RRHH)',
  role: 'RRHH',
  tenantId: 'acme-tenant-id-aqui',
  tenantType: 'EMPRESA',
  mfaEnabled: false,
  status: 'ACTIVE'
}
[MIDDLEWARE] {
  pathname: '/empresa/dashboard',
  hasSession: true,
  hasUser: true,
  hasTenantId: true,
  tenantId: 'acme-tenant-id-aqui',
  email: 'rrhh@acme.com',
  role: 'RRHH'
}
[MIDDLEWARE] Headers injected: {
  'x-tenant-id': 'acme-tenant-id-aqui',
  'x-tenant-type': 'EMPRESA'
}
```

---

## ⚠️ NOTA IMPORTANTE

**ESTOS LOGS SON TEMPORALES**

Una vez que identifiquemos el problema, **DEBES ELIMINAR** estos logs porque:
1. Exponen información sensible (emails, IDs)
2. Afectan performance
3. Llenan los logs de Coolify innecesariamente

---

## 🎯 ACCIÓN INMEDIATA

**EJECUTA ESTO AHORA**:
```bash
cd /Users/pablogranados/Desktop/comidas
git add -A
git commit -m "debug: agregar logging temporal para diagnosticar rrhh unauthorized"
git push origin main
```

Luego:
1. Ve a Coolify
2. Espera el redeploy
3. Intenta login con `rrhh@acme.com`
4. **COPIA Y PEGA LOS LOGS COMPLETOS** aquí

Con esos logs podré decirte EXACTAMENTE cuál es el problema.

