# 🔐 PASO 3: Auth + Middleware Multi-Tenant - ✅ COMPLETADO

## Estado Actual

```
✅ 3.1 NextAuth v5 Base + Prisma Adapter       100%
✅ 3.2 Helpers y Utilities de Auth             100%
✅ 3.3 Middleware Multi-Tenant                 100%
✅ 3.4 Protección de Rutas                     100%
✅ 3.5 Impersonación Segura                    100%

═══════════════════════════════════════════════════
PROGRESO PASO 3:                  [██████████] 100%
```

---

## ✅ SUB-PASO 3.1 COMPLETADO

### NextAuth v5 Base + Prisma Adapter

**Archivos creados:**

```
lib/
├─ db/
│  ├─ prisma.ts              (Prisma client singleton)
│  └─ index.ts               (Exports + tipos)
├─ auth/
│  ├─ config.ts              (Configuración NextAuth)
│  └─ index.ts               (Handlers + exports)

app/api/auth/
└─ [...nextauth]/
   └─ route.ts               (API route handler)

types/
└─ next-auth.d.ts            (Tipos extendidos)
```

### Características Implementadas

✅ **Prisma Client Singleton**
- Evita múltiples instancias en dev (hot reload)
- Logging según environment
- Helper para disconnect en tests

✅ **NextAuth v5 con Prisma Adapter**
- Credentials provider configurado
- Validación con Zod
- Verificación de contraseña con bcrypt
- Multi-tenant por subdominio

✅ **JWT Extendido**
- Incluye: `id`, `email`, `role`, `tenantId`, `tenantType`, `mfaEnabled`
- Preparado para impersonación
- Session de 30 días

✅ **Callbacks Configurados**
- jwt: Enriquece token con datos del usuario
- session: Pasa datos del JWT a la sesión
- signIn: Control adicional (MFA preparado)
- redirect: Lógica de redirección

✅ **Tipos TypeScript**
- Session extendida
- JWT extendido
- User extendido
- Type-safe en toda la app

---

## ✅ SUB-PASO 3.2 COMPLETADO

### Helpers y Utilities de Auth

**Archivos creados:**

```
lib/auth/
├─ permissions.ts            (Sistema de permisos RBAC)
├─ session.ts                (Helpers de sesión)
└─ audit.ts                  (Sistema de auditoría)
```

### Sistema de Permisos (RBAC)

✅ **Matriz de Permisos Completa**
```typescript
// Ejemplo de permisos por rol
SUPER_ADMIN: ['tenants:*', 'users:*', 'impersonate:*']
RRHH: ['employees:*', 'company:update', 'orders:read']
EMPLEADO: ['orders:create', 'orders:read:own']
CHEF: ['dishes:*', 'orders:read', 'kitchen_sheets:read']
```

✅ **Funciones de Verificación**
- `hasPermission(role, permission)` - Verificar permisos
- `canAccessTenant(userTenantId, role, targetTenantId)` - Validar acceso tenant
- `canImpersonate(role)` - Verificar si puede impersonar
- `getDashboardPath(role, tenantType)` - Obtener ruta del dashboard
- `isEmpresaRole()`, `isCateringRole()`, `isRootRole()` - Helpers de tipo

### Helpers de Sesión

✅ **Server-side Helpers**
```typescript
getRequiredSession()          // Sesión o redirect a login
requireRole([roles])          // Verificar roles permitidos
requirePermission(permission) // Verificar permiso específico
requireTenantAccess(tenantId) // Verificar acceso a tenant
getTenantContext()            // Obtener contexto del tenant
isSuperAdmin()                // Verificar si es super admin
redirectToDashboard()         // Redirigir al dashboard apropiado
```

### Sistema de Auditoría

✅ **Funciones de Logging**
```typescript
logAudit(input)                      // Log genérico
logLogin(userId, tenantId)           // Log de login
logLogout(userId, tenantId)          // Log de logout
logImpersonation(admin, target)      // Log de impersonación
```

✅ **Características**
- Hash de integridad (SHA-256)
- Captura de IP y User-Agent
- Append-only (nunca se edita)
- Error handling (no falla operación principal)

---

## 📊 Métricas del Sub-Paso Actual

```
Archivos creados:        10
Líneas de código:       ~850
Tipos definidos:          8
Funciones helpers:       20+
Roles configurados:      11
Permisos definidos:      50+
```

---

## ✅ SUB-PASO 3.3 COMPLETADO

### Middleware Multi-Tenant

**Archivos creados:**

```
middleware.ts                    (Middleware principal de Next.js)
lib/middleware/
├─ tenant.ts                     (Resolución de tenant)
└─ headers.ts                    (Helpers para leer headers)
```

### Características Implementadas

✅ **Detección de Subdominio**
- Extrae subdomain del host header
- Compatible con dev (`*.localhost`) y prod (`*.comida.com`)
- Ignora subdominios del sistema (`www`, `api`)

✅ **Resolución de Tenant**
- Busca tenant en DB por subdomain
- Cache en memoria (TTL 5 min)
- Verifica que no esté deleted
- Retorna: `id`, `type`, `status`, `name`

✅ **Verificación de Estado**
- Solo permite tenants con `status = ACTIVE`
- Bloquea tenants `SUSPENDED` o `INACTIVE`
- Respuesta HTTP 403 si está suspendido

✅ **Inyección en Headers**
- `x-tenant-id`: UUID del tenant
- `x-tenant-type`: ROOT/EMPRESA/CATERING
- `x-tenant-status`: ACTIVE/SUSPENDED/INACTIVE

✅ **Protección de Rutas**
- Rutas públicas: `/auth/*`, `/api/auth`
- Verifica que el usuario pertenezca al tenant
- Super admin puede acceder a todos los tenants
- Redirect a login si no autenticado

✅ **Helpers de Headers**
```typescript
getTenantIdFromHeaders()      // Obtener tenant ID
getTenantTypeFromHeaders()    // Obtener tipo
getTenantFromHeaders()        // Obtener todo el contexto
requireTenantId()             // Tenant ID o error
```

### Cache de Tenants

```typescript
// Cache en memoria (5 min TTL)
const tenantCache = new Map<string, {
  id: string
  type: string
  status: string
  timestamp: number
}>()

// Funciones de gestión
clearTenantCache(subdomain)   // Limpiar uno
clearAllTenantCache()         // Limpiar todos
```

**Nota**: En producción, migrar a Redis para cache distribuido.

---

## ✅ SUB-PASO 3.4 COMPLETADO

### Protección de Rutas (Guards por Rol)

**Archivos creados:**

```
lib/guards/
├─ RoleGuard.tsx            (HOC para proteger por rol)
├─ PermissionGuard.tsx      (HOC para proteger por permiso)
├─ api.ts                   (Guards para API routes)
├─ index.ts                 (Exports centralizados)
└─ EXAMPLES.md              (Ejemplos de uso)

app/unauthorized/
└─ page.tsx                 (Página de error 403)
```

### Características Implementadas

✅ **HOCs para Server Components**
- `RoleGuard`: Proteger por uno o varios roles
- `PermissionGuard`: Proteger por permiso específico
- `RequireAllPermissions`: Requiere TODOS los permisos
- `RequireAnyPermission`: Requiere AL MENOS UNO
- HOCs específicos: `RequireSuperAdmin`, `RequireRRHH`, etc.

✅ **Guards para API Routes**
- `requireAuth()`: Verifica autenticación
- `requireRoles([...])`: Verifica roles permitidos
- `requirePermission(perm)`: Verifica permiso específico
- `requireTenantAccess(id)`: Verifica acceso a tenant
- `requireSuperAdmin()`: Verifica que sea super admin

✅ **Wrappers para API Routes**
- `withAuth(handler)`: Wrapper con autenticación
- `withRoles([...], handler)`: Wrapper con verificación de rol
- `withPermission(perm, handler)`: Wrapper con verificación de permiso
- Manejo automático de errores 401/403/500

✅ **Página de Error Personalizada**
- Diseño moderno y responsive
- Muestra información del usuario actual
- Botón para volver al dashboard apropiado
- Link de soporte

---

## ✅ SUB-PASO 3.5 COMPLETADO

### Impersonación Segura

**Archivos creados:**

```
lib/auth/
├─ impersonation.ts         (Lógica de impersonación)
└─ IMPERSONATION.md         (Documentación completa)

app/api/admin/impersonate/
├─ start/route.ts           (Iniciar impersonación)
├─ stop/route.ts            (Terminar impersonación)
└─ status/route.ts          (Estado actual)

components/
└─ ImpersonationBanner.tsx  (Barra visual)

types/
└─ next-auth.d.ts           (Actualizado con impersonationToken)

lib/auth/
└─ config.ts                (Actualizado con lógica de impersonación)
```

### Características Implementadas

✅ **Sistema de Tokens**
- Token temporal (15 minutos)
- Incluye: originalUserId, targetUserId, roles, tenant, timestamps
- Almacenado en JWT
- Validación de expiración
- Cache en sesión

✅ **Seguridad**
- Solo `SUPER_ADMIN` puede impersonar
- No puede impersonar a otro `SUPER_ADMIN`
- No permite impersonaciones múltiples simultáneas
- Expiración automática
- Auditoría completa en `audit_logs`

✅ **API Endpoints**
- `POST /api/admin/impersonate/start`: Iniciar
- `POST /api/admin/impersonate/stop`: Terminar
- `GET /api/admin/impersonate/status`: Ver estado

✅ **UI Components**
- `ImpersonationBanner`: Barra visual en parte superior
- Muestra: usuario objetivo, tiempo restante
- Botón para salir
- Actualización automática cada minuto
- Hook `useImpersonation()` para componentes

✅ **JWT Integration**
- Callbacks actualizados en `config.ts`
- Sobrescribe datos del usuario con el objetivo
- Restaura datos originales al terminar
- Tipos extendidos en `next-auth.d.ts`

---

## 🎯 Próximos Pasos

El **PASO 3** está **COMPLETADO al 100%**. 

### Próximo: PASO 4 - Estructura de Aplicación

**Objetivos:**
1. Crear estructura de carpetas por portal
2. Layouts principales (Root, Empresa, Catering)
3. Dashboards iniciales
4. Componentes UI base (shadcn/ui)
5. Sistema de navegación

---

## 🔐 Ejemplos de Uso

### En Server Component

```typescript
import { getRequiredSession } from '@/lib/auth/session'

export default async function Dashboard() {
  const session = await getRequiredSession()
  
  return (
    <div>
      <h1>Hola {session.user.name}</h1>
      <p>Rol: {session.user.role}</p>
    </div>
  )
}
```

### Con verificación de rol

```typescript
import { requireRole } from '@/lib/auth/session'

export default async function RRHHPanel() {
  const session = await requireRole(['RRHH', 'ADMIN_EMPRESA'])
  
  return <div>Panel RRHH</div>
}
```

### En API Route

```typescript
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(req: Request) {
  const session = await auth()
  
  if (!session || !hasPermission(session.user.role, 'orders:read')) {
    return new Response('Unauthorized', { status: 403 })
  }
  
  // ... lógica
}
```

---

## 📚 Recursos

- [NextAuth v5 Docs](https://authjs.dev/)
- [Prisma Adapter](https://authjs.dev/reference/adapter/prisma)
- [Configuración Actual](../lib/auth/config.ts)
- [Sistema de Permisos](../lib/auth/permissions.ts)

---

**Estado**: ✅ PASO 3 COMPLETADO AL 100%  
**Fecha**: Enero 2025  
**Siguiente**: PASO 4 - Estructura de Aplicación

