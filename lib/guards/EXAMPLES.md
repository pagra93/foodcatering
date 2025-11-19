# 🛡️ Guards - Ejemplos de Uso

## Server Components

### Ejemplo 1: Proteger componente por rol

```tsx
// app/(tenant)/[subdomain]/admin/users/page.tsx
import { RequireAdminEmpresa } from '@/lib/guards'

async function UsersPage() {
  // Solo ADMIN_EMPRESA y SUPER_ADMIN pueden ver esto
  return <div>Lista de usuarios</div>
}

export default RequireAdminEmpresa(UsersPage)
```

### Ejemplo 2: Proteger con múltiples roles

```tsx
import { RoleGuard } from '@/lib/guards'

async function RRHHPanel() {
  return <div>Panel RRHH</div>
}

export default RoleGuard(RRHHPanel, {
  allowedRoles: ['ADMIN_EMPRESA', 'RRHH', 'FINANZAS'],
  redirectTo: '/unauthorized',
})
```

### Ejemplo 3: Proteger por permiso específico

```tsx
import { PermissionGuard } from '@/lib/guards'

async function CreateOrderPage() {
  return <form>Crear pedido...</form>
}

export default PermissionGuard(CreateOrderPage, 'orders:create')
```

### Ejemplo 4: Requiere múltiples permisos

```tsx
import { RequireAllPermissions } from '@/lib/guards'

async function AdvancedSettingsPage() {
  return <div>Configuración avanzada</div>
}

export default RequireAllPermissions(AdvancedSettingsPage, [
  'company:update',
  'settings:write',
])
```

### Ejemplo 5: Requiere al menos un permiso

```tsx
import { RequireAnyPermission } from '@/lib/guards'

async function OrdersListPage() {
  return <div>Lista de pedidos</div>
}

export default RequireAnyPermission(OrdersListPage, [
  'orders:read',
  'orders:read:own',
])
```

## API Routes

### Ejemplo 1: Verificar autenticación

```typescript
// app/api/orders/route.ts
import { requireAuth } from '@/lib/guards'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    
    // Usuario autenticado, continuar
    const orders = await getOrders(session.user.tenantId)
    
    return Response.json(orders)
  } catch (error) {
    return Response.json(
      { error: 'No autenticado' },
      { status: 401 }
    )
  }
}
```

### Ejemplo 2: Verificar rol específico

```typescript
// app/api/admin/users/route.ts
import { requireRoles } from '@/lib/guards'

export async function POST(req: Request) {
  try {
    const session = await requireRoles(['ADMIN_EMPRESA', 'SUPER_ADMIN'])
    
    // Solo admins pueden crear usuarios
    const body = await req.json()
    const user = await createUser(body, session.user.tenantId)
    
    return Response.json(user)
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return Response.json(
        { error: 'No tienes permisos suficientes' },
        { status: 403 }
      )
    }
    return Response.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
```

### Ejemplo 3: Verificar permiso

```typescript
// app/api/orders/[id]/delete/route.ts
import { requirePermission } from '@/lib/guards'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission('orders:delete')
    
    await deleteOrder(params.id, session.user.tenantId)
    
    return Response.json({ success: true })
  } catch (error) {
    return Response.json(
      { error: 'No autorizado' },
      { status: 403 }
    )
  }
}
```

### Ejemplo 4: Verificar acceso a tenant

```typescript
// app/api/tenants/[id]/route.ts
import { requireAuth, requireTenantAccess } from '@/lib/guards'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    
    // Verificar que puede acceder a este tenant
    await requireTenantAccess(params.id)
    
    const tenant = await getTenant(params.id)
    
    return Response.json(tenant)
  } catch (error) {
    return Response.json(
      { error: 'No tienes acceso a este tenant' },
      { status: 403 }
    )
  }
}
```

### Ejemplo 5: Usar wrapper `withAuth`

```typescript
// app/api/profile/route.ts
import { withAuth } from '@/lib/guards'

export const GET = withAuth(async (req, session) => {
  // session está garantizado aquí
  const profile = await getProfile(session.user.id)
  
  return Response.json(profile)
})

export const PATCH = withAuth(async (req, session) => {
  const body = await req.json()
  const updated = await updateProfile(session.user.id, body)
  
  return Response.json(updated)
})
```

### Ejemplo 6: Usar wrapper `withRoles`

```typescript
// app/api/admin/settings/route.ts
import { withRoles } from '@/lib/guards'

export const POST = withRoles(
  ['ADMIN_EMPRESA', 'SUPER_ADMIN'],
  async (req, session) => {
    const body = await req.json()
    const settings = await updateSettings(body, session.user.tenantId)
    
    return Response.json(settings)
  }
)
```

### Ejemplo 7: Usar wrapper `withPermission`

```typescript
// app/api/dishes/route.ts
import { withPermission } from '@/lib/guards'

export const POST = withPermission(
  'dishes:create',
  async (req, session) => {
    const body = await req.json()
    const dish = await createDish(body, session.user.tenantId)
    
    return Response.json(dish)
  }
)
```

## Manejo de Errores en API Routes

### Patrón recomendado

```typescript
import { requireAuth, requirePermission } from '@/lib/guards'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // 1. Verificar autenticación
    const session = await requireAuth()
    
    // 2. Verificar permisos
    await requirePermission('orders:create')
    
    // 3. Validar datos
    const body = await req.json()
    const validated = orderSchema.parse(body)
    
    // 4. Verificar tenant
    if (validated.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: 'No puedes crear pedidos para otro tenant' },
        { status: 403 }
      )
    }
    
    // 5. Ejecutar lógica
    const order = await createOrder(validated)
    
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      // Errores de autenticación
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autenticado' },
          { status: 401 }
        )
      }
      
      // Errores de permisos
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json(
          { error: 'Sin permisos suficientes' },
          { status: 403 }
        )
      }
      
      // Errores de validación (Zod)
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Datos inválidos', details: error.errors },
          { status: 400 }
        )
      }
    }
    
    // Error genérico
    console.error('[API Error]', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

## Combinando Guards

### Verificar múltiples condiciones

```typescript
import { requireAuth, requireRoles, requireTenantAccess } from '@/lib/guards'

export async function POST(req: Request) {
  // 1. Autenticación
  const session = await requireAuth()
  
  // 2. Rol
  await requireRoles(['ADMIN_EMPRESA', 'RRHH'])
  
  // 3. Acceso al tenant específico
  const body = await req.json()
  await requireTenantAccess(body.targetTenantId)
  
  // Ahora sí, ejecutar lógica
  // ...
}
```

## Testing

### Mockear guards en tests

```typescript
import { vi } from 'vitest'

// Mockear requireAuth
vi.mock('@/lib/guards', () => ({
  requireAuth: vi.fn(() =>
    Promise.resolve({
      user: {
        id: 'test-user',
        role: 'ADMIN_EMPRESA',
        tenantId: 'test-tenant',
      },
    })
  ),
}))
```

## Tips de Seguridad

1. **Siempre verifica el tenant**: No confíes solo en el rol, verifica que el usuario pertenezca al tenant correcto.

2. **Valida en ambos lados**: Server Components + API routes.

3. **No expongas información sensible**: Los mensajes de error deben ser genéricos para el usuario final.

4. **Loguea intentos de acceso**: Usa `audit_logs` para registrar intentos de acceso no autorizados.

5. **Rate limiting**: Implementa rate limiting en API routes críticas (próximo paso).

---

**Siguiente**: Implementar impersonación segura (PASO 3.5)

