# 🎭 Sistema de Impersonación

Sistema seguro que permite a super admins ver la plataforma desde la perspectiva de otros usuarios.

## 🎯 Características

- ✅ **Solo super admins** pueden impersonar
- ✅ **Duración limitada** (15 minutos)
- ✅ **Auditoría completa** en `audit_logs`
- ✅ **Barra visual** indicando modo impersonación
- ✅ **Token temporal** en JWT
- ✅ **Restauración automática** al expirar

## 🔐 Seguridad

### Restricciones

- Solo `SUPER_ADMIN` puede iniciar impersonación
- No se puede impersonar a otro `SUPER_ADMIN`
- No se puede impersonar si ya hay una impersonación activa
- Token expira automáticamente después de 15 minutos
- Cada inicio y fin se registra en `audit_logs` con hash de integridad

### Auditoría

Cada impersonación genera 2 registros en `audit_logs`:

1. **`impersonation_started`**: Al iniciar
   - `userId`: ID del super admin
   - `resourceId`: ID del usuario objetivo
   - `details`: Email, nombre, rol, tenant del objetivo

2. **`impersonation_ended`**: Al terminar
   - `userId`: ID del super admin
   - `resourceId`: ID del usuario objetivo
   - `details`: Duración en minutos, razón (manual_stop / expired)

## 🚀 Uso

### 1. Iniciar Impersonación (API)

```typescript
// POST /api/admin/impersonate/start
const response = await fetch('/api/admin/impersonate/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'target-user-uuid'
  })
})

const data = await response.json()
// { success: true, token: { ... } }
```

### 2. Actualizar Session con Token

```typescript
import { update } from 'next-auth/react'

// Después de obtener el token
await update({
  impersonationToken: data.token
})

// Esto actualizará el JWT y la sesión
```

### 3. Terminar Impersonación

```typescript
// POST /api/admin/impersonate/stop
const response = await fetch('/api/admin/impersonate/stop', {
  method: 'POST'
})

// Después, actualizar sesión para remover el token
await update({
  impersonationToken: null
})
```

### 4. Verificar Estado

```typescript
// GET /api/admin/impersonate/status
const response = await fetch('/api/admin/impersonate/status')
const data = await response.json()

/*
{
  isImpersonating: true,
  originalUser: { id: '...', role: 'SUPER_ADMIN' },
  targetUser: { id: '...', role: 'EMPLEADO', tenantId: '...' },
  expiresAt: 1234567890,
  remainingMinutes: 12
}
*/
```

## 🎨 UI Components

### ImpersonationBanner

Barra visual que se muestra en la parte superior cuando hay impersonación activa.

```tsx
// app/layout.tsx o donde corresponda
import { ImpersonationBanner } from '@/components/ImpersonationBanner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ImpersonationBanner />
        {children}
      </body>
    </html>
  )
}
```

**Características del Banner:**
- Fondo naranja/rojo con gradiente
- Muestra: rol del usuario, tenant ID, tiempo restante
- Botón para salir de la impersonación
- Se actualiza cada minuto
- Desaparece automáticamente al expirar

### Hook useImpersonation

```tsx
import { useImpersonation } from '@/components/ImpersonationBanner'

function MyComponent() {
  const { isImpersonating, isLoading } = useImpersonation()
  
  if (isImpersonating) {
    return <div>Modo impersonación activo</div>
  }
  
  return <div>Normal</div>
}
```

## 📋 Flujo Completo

### Desde el Admin Panel

```typescript
// components/UserTable.tsx
async function handleImpersonate(userId: string) {
  try {
    // 1. Iniciar impersonación
    const res = await fetch('/api/admin/impersonate/start', {
      method: 'POST',
      body: JSON.stringify({ userId })
    })
    
    if (!res.ok) {
      const { error } = await res.json()
      alert(error)
      return
    }
    
    const { token } = await res.json()
    
    // 2. Actualizar sesión con el token
    await update({ impersonationToken: token })
    
    // 3. Redirigir al dashboard del usuario
    const targetDashboard = getDashboardPath(token.targetRole, token.targetTenantId)
    router.push(targetDashboard)
    
    // 4. Recargar para que el banner aparezca
    router.refresh()
  } catch (error) {
    console.error('Error impersonating:', error)
    alert('Error al iniciar impersonación')
  }
}
```

## 🔄 Cómo Funciona Internamente

### 1. Token de Impersonación

```typescript
type ImpersonationToken = {
  originalUserId: string      // ID del super admin
  originalRole: UserRole      // Rol original (SUPER_ADMIN)
  targetUserId: string        // ID del usuario a impersonar
  targetRole: UserRole        // Rol del usuario objetivo
  targetTenantId: string      // Tenant del usuario objetivo
  startedAt: number           // Timestamp de inicio
  expiresAt: number           // Timestamp de expiración
}
```

### 2. JWT Callback

Cuando hay un token de impersonación en la sesión, el callback JWT:

1. **Sobrescribe** los datos del usuario con los del usuario objetivo:
   - `token.id` → `targetUserId`
   - `token.role` → `targetRole`
   - `token.tenantId` → `targetTenantId`
   - `token.name`, `token.email` → del usuario objetivo

2. **Almacena** el token completo en `token.impersonationToken`

3. **Restaura** los datos originales cuando se remueve el token

### 3. Session Callback

Pasa el token de impersonación a la sesión si existe:

```typescript
if (token.impersonationToken) {
  session.user.impersonationToken = token.impersonationToken
}
```

## ⚠️ Consideraciones

### Middleware

El middleware multi-tenant debe respetar el `tenantId` del JWT, que será el del usuario objetivo durante la impersonación.

### Permisos

Durante la impersonación, el super admin tiene **exactamente** los mismos permisos que el usuario objetivo. No puede hacer más ni menos.

### Tiempo de Expiración

Si el token expira mientras el admin está navegando:
- El banner mostrará 0 minutos
- La próxima request recargará la página
- La sesión volverá a la del super admin

Para extender la impersonación, debe:
1. Salir de la impersonación
2. Iniciar una nueva impersonación

### Rate Limiting

En producción, considera implementar rate limiting en el endpoint de inicio:
- Máximo 10 impersonaciones por hora por admin
- Log de todas las requests (exitosas y fallidas)

## 🧪 Testing

### Test de Integración

```typescript
describe('Impersonation', () => {
  it('should allow super admin to impersonate', async () => {
    // Login como super admin
    const superAdmin = await loginAs('SUPER_ADMIN')
    
    // Obtener un usuario objetivo
    const targetUser = await createUser('EMPLEADO')
    
    // Iniciar impersonación
    const res = await fetch('/api/admin/impersonate/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdmin.token}` },
      body: JSON.stringify({ userId: targetUser.id })
    })
    
    expect(res.status).toBe(200)
    
    const { token } = await res.json()
    expect(token.targetUserId).toBe(targetUser.id)
    expect(token.targetRole).toBe('EMPLEADO')
  })
  
  it('should not allow non-admin to impersonate', async () => {
    const employee = await loginAs('EMPLEADO')
    
    const res = await fetch('/api/admin/impersonate/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employee.token}` },
      body: JSON.stringify({ userId: 'some-user' })
    })
    
    expect(res.status).toBe(403)
  })
  
  it('should expire after 15 minutes', async () => {
    // ... test de expiración
  })
})
```

### Test E2E

```typescript
test('Super admin can impersonate employee', async ({ page }) => {
  // Login como super admin
  await loginAs(page, 'superadmin@example.com')
  
  // Ir a la lista de usuarios
  await page.goto('/admin/users')
  
  // Click en "Impersonar" en un empleado
  await page.click('[data-testid="impersonate-btn-employee-1"]')
  
  // Verificar que el banner aparece
  await expect(page.locator('[data-testid="impersonation-banner"]')).toBeVisible()
  
  // Verificar que estamos en el dashboard del empleado
  await expect(page.url()).toContain('/dashboard')
  
  // Verificar que solo vemos lo que ve el empleado
  await expect(page.locator('[data-testid="admin-menu"]')).not.toBeVisible()
  
  // Salir de la impersonación
  await page.click('[data-testid="stop-impersonation-btn"]')
  
  // Verificar que volvemos al panel de admin
  await expect(page.url()).toContain('/admin')
})
```

## 📚 Referencias

- [NextAuth JWT Callback](https://next-auth.js.org/configuration/callbacks#jwt-callback)
- [NextAuth Session Update](https://next-auth.js.org/getting-started/client#updating-the-session)

---

**Implementado en**: PASO 3.5  
**Fecha**: Enero 2025

