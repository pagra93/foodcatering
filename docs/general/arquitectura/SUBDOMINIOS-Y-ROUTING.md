# 🌐 Sistema de Subdominios y Routing

## 📋 Tabla de Contenidos
1. [Arquitectura de Subdominios](#arquitectura-de-subdominios)
2. [Routing por Tipo](#routing-por-tipo)
3. [Middleware de Autenticación](#middleware-de-autenticación)
4. [Ejemplos de URLs](#ejemplos-de-urls)
5. [Implementación Técnica](#implementación-técnica)

---

## 🏗️ Arquitectura de Subdominios

### Tipos de Portales

```
┌────────────────────────────────────────────────────────────┐
│                    comida.com                              │
│                  (Página Marketing)                         │
└────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼───────┐
│ admin.        │  │ {empresa}.      │  │ {catering}.  │
│ comida.com    │  │ comida.com      │  │ comida.com   │
│               │  │                 │  │              │
│ Super Admin   │  │ Portal Empresa  │  │ Portal       │
│ (Root)        │  │ (RRHH/Finanzas) │  │ Catering     │
└───────────────┘  └─────────────────┘  └──────────────┘
```

### Tabla de Subdominios

| Subdominio | Tipo | Usuarios | Acceso |
|------------|------|----------|--------|
| `admin.comida.com` | Super Admin | Root users | Dashboard global |
| `techcorp.comida.com` | Empresa | ADMIN_EMPRESA, RRHH, FINANZAS | Gestión interna |
| `deluxe.comida.com` | Catering | ADMIN_CATERING, CHEF, COCINA | Operaciones |
| `comida.com` | Marketing | Público | Landing page |

---

## 🗺️ Routing por Tipo

### Super Admin (`admin.comida.com`)
```
/admin
  ├─ /dashboard          → KPIs globales
  ├─ /empresas           → Listado empresas
  │   ├─ /new            → Crear empresa
  │   ├─ /[id]           → Detalle empresa
  │   └─ /[id]/edit      → Editar empresa
  ├─ /caterings          → Listado caterings
  │   ├─ /new            → Crear catering
  │   ├─ /[id]           → Detalle catering
  │   └─ /[id]/edit      → Editar catering
  ├─ /incidencias        → Incidencias globales
  ├─ /facturacion        → Facturación plataforma
  └─ /configuracion      → Config global
```

### Portal Empresa (`{subdomain}.comida.com`)
```
/empresa
  ├─ /dashboard          → KPIs de la empresa
  ├─ /configuracion      → Datos y preferencias
  │   ├─ /general        → Info legal, contactos
  │   ├─ /plan           → Tipo de plan, límites
  │   ├─ /catering       → Catering asignado
  │   └─ /notificaciones → Preferencias de alertas
  ├─ /empleados          → Gestión de empleados
  │   ├─ /nuevo          → Alta de empleado
  │   ├─ /importar       → CSV import
  │   └─ /[id]           → Detalle empleado
  ├─ /pedidos            → Consumo diario
  │   └─ /[id]           → Detalle pedido + trazabilidad
  ├─ /catering           → Info catering asignado
  │   └─ /menus          → Menús por día (lectura)
  ├─ /facturacion        → Facturas y pagos
  │   ├─ /catering       → Facturas del catering
  │   ├─ /plataforma     → Cuota Comida.com
  │   └─ /descargas      → Export ERP (A3/Sage/SAP)
  ├─ /incidencias        → Incidencias propias
  │   ├─ /nueva          → Crear incidencia
  │   └─ /[id]           → Detalle incidencia
  ├─ /auditoria          → Auditoría fiscal
  │   ├─ /fiscal         → Informes fiscales
  │   ├─ /dossier        → Generar dossier 1-clic
  │   └─ /exportar       → Export contable
  └─ /actividad          → Audit log (registro)
```

### Portal Catering (`{subdomain}.comida.com`)
```
/catering
  ├─ /dashboard          → KPIs operacionales
  ├─ /operacion          → Operación diaria
  │   ├─ /menu           → Programación menús
  │   ├─ /consolidacion  → Kitchen sheets
  │   └─ /logistica      → Rutas y entregas
  ├─ /platos             → Catálogo de platos
  │   ├─ /nuevo          → Crear plato
  │   └─ /[id]           → Editar plato
  ├─ /empresas           → Empresas asignadas
  │   └─ /[id]           → Detalle empresa
  ├─ /pedidos            → Pedidos del día
  │   └─ /[id]           → Detalle pedido
  ├─ /facturacion        → Facturación a empresas
  │   └─ /[id]           → Detalle factura
  ├─ /incidencias        → Incidencias reportadas
  │   └─ /[id]           → Resolver incidencia
  └─ /configuracion      → Config del catering
      ├─ /general        → Datos legales
      ├─ /capacidad      → Capacidad diaria
      ├─ /zonas          → Zonas de servicio
      └─ /documentos     → Docs sanitarios
```

---

## 🔐 Middleware de Autenticación

### Flujo de Autenticación

```typescript
// 1. Usuario accede a techcorp.comida.com/empresa/dashboard

// 2. Middleware extrae subdomain
const subdomain = extractSubdomain(req.host) // 'techcorp'

// 3. Buscar tenant por subdomain
const tenant = await prisma.tenant.findUnique({
  where: { subdomain: 'techcorp', type: 'EMPRESA' }
})

// 4. Verificar sesión del usuario
const session = await getServerSession()

// 5. Verificar que user.tenantId === tenant.id
if (session.user.tenantId !== tenant.id) {
  return redirect('/login?error=unauthorized')
}

// 6. Verificar rol permitido para empresa
const allowedRoles = ['ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE']
if (!allowedRoles.includes(session.user.role)) {
  return redirect('/acceso-denegado')
}

// 7. Inyectar tenantId en contexto
req.tenantId = tenant.id
req.user = session.user

// 8. Permitir acceso
next()
```

### Archivo: `middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl
  const subdomain = extractSubdomain(host)

  // ============================================================================
  // 1. ADMIN PORTAL (admin.comida.com)
  // ============================================================================
  if (subdomain === 'admin') {
    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (token.role !== 'ROOT' && token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/acceso-denegado', request.url))
    }

    return NextResponse.next()
  }

  // ============================================================================
  // 2. EMPRESA PORTAL ({empresa}.comida.com)
  // ============================================================================
  if (pathname.startsWith('/empresa')) {
    const tenant = await getTenantBySubdomain(subdomain, 'EMPRESA')
    
    if (!tenant) {
      return NextResponse.redirect(new URL('/404', request.url))
    }

    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar que el usuario pertenece a este tenant
    if (token.tenantId !== tenant.id) {
      return NextResponse.redirect(new URL('/acceso-denegado', request.url))
    }

    // Verificar rol permitido
    const allowedRoles = ['ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE', 'VIEWER']
    if (!allowedRoles.includes(token.role as string)) {
      return NextResponse.redirect(new URL('/acceso-denegado', request.url))
    }

    // Inyectar tenantId en headers (para server components)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-id', tenant.id)
    requestHeaders.set('x-tenant-type', tenant.type)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // ============================================================================
  // 3. CATERING PORTAL ({catering}.comida.com)
  // ============================================================================
  if (pathname.startsWith('/catering')) {
    const tenant = await getTenantBySubdomain(subdomain, 'CATERING')
    
    if (!tenant) {
      return NextResponse.redirect(new URL('/404', request.url))
    }

    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (token.tenantId !== tenant.id) {
      return NextResponse.redirect(new URL('/acceso-denegado', request.url))
    }

    const allowedRoles = ['ADMIN_CATERING', 'CHEF', 'COCINERO', 'REPARTIDOR']
    if (!allowedRoles.includes(token.role as string)) {
      return NextResponse.redirect(new URL('/acceso-denegado', request.url))
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-id', tenant.id)
    requestHeaders.set('x-tenant-type', tenant.type)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/empresa/:path*',
    '/catering/:path*',
  ],
}

// ============================================================================
// HELPERS
// ============================================================================

function extractSubdomain(host: string): string {
  // Remover puerto si existe
  const hostname = host.split(':')[0]
  
  // Si es localhost, usar subdomain de query param (desarrollo)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'admin' // Por defecto en desarrollo
  }
  
  // Extraer subdomain
  const parts = hostname.split('.')
  
  // Si es comida.com directamente, no hay subdomain
  if (parts.length <= 2) {
    return ''
  }
  
  // Retornar primer segmento
  return parts[0]
}

async function getTenantBySubdomain(subdomain: string, type: 'EMPRESA' | 'CATERING') {
  const { prisma } = await import('@/lib/db/prisma')
  
  return prisma.tenant.findFirst({
    where: {
      subdomain,
      type,
      status: { not: 'BLOCKED' },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      type: true,
      status: true,
    },
  })
}
```

---

## 🌍 Ejemplos de URLs

### Super Admin
```bash
# Dashboard global
https://admin.comida.com/admin/dashboard

# Ver empresa TechCorp
https://admin.comida.com/admin/empresas/2e519a0a-16f8-4644-8136-85df42687e57

# Editar catering Deluxe
https://admin.comida.com/admin/caterings/1/edit
```

### Empresa (TechCorp)
```bash
# Dashboard de TechCorp
https://techcorp.comida.com/empresa/dashboard

# Configuración de TechCorp
https://techcorp.comida.com/empresa/configuracion

# Ver empleados
https://techcorp.comida.com/empresa/empleados

# Añadir nuevo empleado
https://techcorp.comida.com/empresa/empleados/nuevo

# Ver pedidos del mes
https://techcorp.comida.com/empresa/pedidos?period=month

# Generar dossier fiscal
https://techcorp.comida.com/empresa/auditoria/dossier
```

### Catering (Deluxe Catering)
```bash
# Dashboard del catering
https://deluxe.comida.com/catering/dashboard

# Programar menús
https://deluxe.comida.com/catering/operacion/menu

# Ver pedidos consolidados de hoy
https://deluxe.comida.com/catering/pedidos?date=2025-01-17

# Gestionar incidencias
https://deluxe.comida.com/catering/incidencias
```

---

## 🛠️ Implementación Técnica

### 1. Estructura de Directorios

```
/app
  /(admin)                     # admin.comida.com
    /admin
      /dashboard
      /empresas
      /caterings
      ...
  
  /(empresa)                   # {empresa}.comida.com
    /empresa
      /dashboard
      /configuracion
      /empleados
      /pedidos
      ...
  
  /(catering)                  # {catering}.comida.com
    /catering
      /dashboard
      /operacion
      /platos
      ...
  
  /(auth)                      # Login universal
    /login
    /forgot-password
    /reset-password
  
  /(marketing)                 # comida.com
    page.tsx                   # Landing page
    /features
    /pricing
    /contacto
```

### 2. Helper de Tenant en Server Components

```typescript
// lib/tenant/get-tenant.ts
import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'

export async function getCurrentTenant() {
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  
  if (!tenantId) {
    throw new Error('No tenant ID in headers')
  }
  
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      companies: true,
      restaurants: true,
    },
  })
}
```

### 3. Uso en Páginas

```typescript
// app/(empresa)/empresa/dashboard/page.tsx
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getCompanyDashboardData } from '@/lib/db/queries/empresa-dashboard'

export default async function EmpresaDashboardPage() {
  const tenant = await getCurrentTenant()
  const data = await getCompanyDashboardData(tenant.id)
  
  return (
    <div>
      <h1>{tenant.name} - Dashboard</h1>
      {/* ... render data ... */}
    </div>
  )
}
```

### 4. Desarrollo Local (sin subdominios reales)

Para desarrollo, usar query params:

```bash
# Simular empresa TechCorp
http://localhost:3000/empresa/dashboard?tenant=techcorp

# Simular catering Deluxe
http://localhost:3000/catering/dashboard?tenant=deluxe
```

O editar `/etc/hosts`:

```bash
# /etc/hosts
127.0.0.1 admin.comida.local
127.0.0.1 techcorp.comida.local
127.0.0.1 deluxe.comida.local
```

Luego acceder con:

```bash
http://admin.comida.local:3000/admin/dashboard
http://techcorp.comida.local:3000/empresa/dashboard
http://deluxe.comida.local:3000/catering/dashboard
```

---

## ✅ Checklist de Implementación

- [ ] Crear middleware de subdominios
- [ ] Añadir helper `getCurrentTenant()`
- [ ] Crear layouts para cada portal
- [ ] Implementar login universal con redirect por tipo
- [ ] Añadir verificación de tenant en queries
- [ ] Configurar Vercel/Coolify para wildcard domains
- [ ] Añadir tests para aislamiento de tenants
- [ ] Documentar flujo de onboarding por portal

---

## 🚨 Seguridad Crítica

### ⚠️ NUNCA hacer esto:

```typescript
// ❌ MAL: Sin verificación de tenant
export async function getEmployees() {
  return prisma.employee.findMany() // EXPONE TODOS LOS EMPLEADOS
}
```

### ✅ SIEMPRE hacer esto:

```typescript
// ✅ BIEN: Con tenant_id obligatorio
export async function getEmployees(tenantId: string) {
  return prisma.employee.findMany({
    where: { tenantId, deletedAt: null }
  })
}
```

### Test de Aislamiento

```typescript
// tests/tenant-isolation.spec.ts
test('Empresa A no puede ver datos de Empresa B', async () => {
  const empresaA = await loginAs('admin@techcorp.com')
  const empresaB = await loginAs('admin@consultoria.com')
  
  // Intentar acceder a empleados de B desde sesión de A
  const response = await fetch(`https://techcorp.comida.com/api/employees`, {
    headers: { Cookie: empresaA.cookie }
  })
  
  const employees = await response.json()
  
  // Verificar que SOLO vemos empleados de A
  expect(employees).toHaveLength(45) // TechCorp tiene 45 empleados
  expect(employees.every(e => e.tenantId === empresaA.tenantId)).toBe(true)
})
```

---

**Siguiente paso:** Implementar el middleware y layouts base para cada portal. 🚀

