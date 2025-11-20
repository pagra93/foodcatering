# 📊 Análisis: Cambio de Subdominios a Rutas Path-Based

## 🎯 Resumen Ejecutivo

**Pregunta**: ¿Cuánto costaría cambiar de subdominios (`acme.sintupper.com`) a rutas basadas en path (`sintupper.com/empresa/acme`)?

**Respuesta Corta**: **Es un cambio de arquitectura MEDIO-GRANDE** que afectaría a ~40-50 archivos, requeriría 3-5 días de desarrollo, y tendría implicaciones significativas en seguridad, UX y escalabilidad.

**Recomendación**: ⚠️ **NO recomendado** a menos que haya razones de negocio muy fuertes (ver sección de Pros/Contras).

---

## 📐 Arquitectura Actual vs Propuesta

### 🔵 ACTUAL: Multi-tenant con Subdominios

```
Empresas:
  - https://acme.sintupper.com/empresa/dashboard
  - https://globex.sintupper.com/empresa/pedidos
  - https://acme.sintupper.com/empleado/menus

Caterings:
  - https://delicias.sintupper.com/catering/dashboard
  - https://gourmet.sintupper.com/catering/produccion

Admin:
  - https://admin.sintupper.com/admin/empresas
```

**Resolución de tenant**:
1. Middleware extrae subdomain del header `host`
2. Busca `Tenant` en BD por `subdomain`
3. Inyecta `x-tenant-id` en headers del request
4. Todas las queries filtran por `tenant_id`

### 🟢 PROPUESTA: Path-based Routing

```
Empresas:
  - https://sintupper.com/empresa/acme/dashboard
  - https://sintupper.com/empresa/globex/pedidos
  - https://sintupper.com/empresa/acme/empleado/menus

Caterings:
  - https://sintupper.com/catering/delicias/dashboard
  - https://sintupper.com/catering/gourmet/produccion

Admin:
  - https://sintupper.com/admin/empresas
```

**Resolución de tenant**:
1. Middleware extrae slug del path (`/empresa/:slug` o `/catering/:slug`)
2. Busca `Tenant` en BD por `subdomain` (reutilizando el campo)
3. Inyecta `x-tenant-id` en headers del request
4. Todas las queries filtran por `tenant_id` (sin cambios)

---

## 🔍 Análisis Detallado de Cambios

### 1️⃣ MIDDLEWARE (Impacto: **ALTO**)

**Archivo**: `/middleware.ts` + `/lib/middleware/tenant.ts`

#### Cambios necesarios:

```typescript
// ANTES
const subdomain = getSubdomainFromRequest(req) // Extrae de host
const tenant = await resolveTenantFromSubdomain(subdomain)

// DESPUÉS
const slug = getTenantSlugFromPath(req.nextUrl.pathname) 
// Extrae de /empresa/:slug o /catering/:slug
const tenant = await resolveTenantFromSlug(slug)
```

**Archivos afectados**:
- ✏️ `middleware.ts` (40 líneas)
- ✏️ `lib/middleware/tenant.ts` (60 líneas)

**Complejidad**: Media
- Necesitas parsear paths con diferentes patrones
- Manejar casos edge (admin, auth, landing, api)
- Actualizar lógica de cache

---

### 2️⃣ ESTRUCTURA DE RUTAS (Impacto: **MEDIO-ALTO**)

**Directorios afectados**:
```
app/
  ├── (empresa)/            → MOVER a nueva estructura
  │   └── empresa/
  ├── (catering)/           → MOVER a nueva estructura
  │   └── catering/
  └── (empleado)/           → MOVER a nueva estructura
      └── empleado/
```

#### Nueva estructura propuesta:

```
app/
  ├── (portal)/
  │   ├── empresa/
  │   │   └── [slug]/                    ← Dynamic segment para tenant
  │   │       ├── dashboard/
  │   │       │   └── page.tsx
  │   │       ├── pedidos/
  │   │       │   └── page.tsx
  │   │       ├── empleados/
  │   │       │   └── page.tsx
  │   │       └── empleado/              ← Portal empleado dentro
  │   │           ├── menus/
  │   │           └── perfil/
  │   └── catering/
  │       └── [slug]/                    ← Dynamic segment para catering
  │           ├── dashboard/
  │           ├── menus/
  │           ├── produccion/
  │           └── rutas/
  ├── (admin)/
  │   └── admin/                         ← Sin cambios
  └── (landing)/                         ← Sin cambios
```

**Archivos a mover**: ~50 archivos `.tsx`
- 14 archivos en `(empresa)/empresa/`
- 15 archivos en `(catering)/catering/`
- 6 archivos en `(empleado)/empleado/`

**Trabajo adicional**:
- Actualizar imports relativos
- Actualizar `layout.tsx` de cada grupo
- Ajustar guards de permisos

---

### 3️⃣ AUTENTICACIÓN (Impacto: **BAJO-MEDIO**)

**Archivos**:
- `lib/auth/config.ts`
- `app/(auth)/login/LoginForm.tsx`

#### Cambios necesarios:

**A. Callback de redirect**

```typescript
// ANTES (lib/auth/config.ts)
async redirect({ url, baseUrl }) {
  // baseUrl = https://acme.sintupper.com
  if (url.startsWith('/')) return `${baseUrl}${url}`
  return url
}

// DESPUÉS
async redirect({ url, baseUrl }) {
  // baseUrl = https://sintupper.com
  // Necesitas incluir el slug del tenant en la redirección
  const tenantSlug = getTenantSlugFromSession(session)
  if (url.startsWith('/')) return `${baseUrl}/empresa/${tenantSlug}${url}`
  return url
}
```

**B. Login form**

```tsx
// ANTES: LoginForm.tsx
// Usuario va a acme.sintupper.com/auth/login
// El subdomain identifica al tenant automáticamente

// DESPUÉS
// Usuario va a sintupper.com/auth/login
// Necesitas un selector de empresa/catering en el login
<Select>
  <option>Acme Corp</option>
  <option>Globex Inc</option>
  <option>Delicias Catering</option>
</Select>
```

**Implicación UX**: Los usuarios ahora necesitan **seleccionar su organización** en el login, en lugar de ir a su subdominio específico.

---

### 4️⃣ LINKS Y NAVEGACIÓN (Impacto: **MEDIO**)

**Problema**: Todos los `<Link>` internos necesitan incluir el slug del tenant.

```tsx
// ANTES
<Link href="/empresa/dashboard">Dashboard</Link>
<Link href="/empresa/pedidos">Pedidos</Link>

// DESPUÉS
<Link href={`/empresa/${tenantSlug}/dashboard`}>Dashboard</Link>
<Link href={`/empresa/${tenantSlug}/pedidos`}>Pedidos</Link>
```

**Solución**: Crear un hook helper

```typescript
// hooks/use-tenant-route.ts
export function useTenantRoute() {
  const { tenantSlug, tenantType } = useTenant()
  
  return (path: string) => {
    const prefix = tenantType === 'EMPRESA' ? 'empresa' : 'catering'
    return `/${prefix}/${tenantSlug}${path}`
  }
}

// Uso
const toRoute = useTenantRoute()
<Link href={toRoute('/dashboard')}>Dashboard</Link>
```

**Archivos afectados**: ~100+ componentes con links internos
- Todos los componentes en `/components/empresa/`
- Todos los componentes en `/components/catering/`
- Todos los componentes en `/components/empleado/`
- Todos los componentes de navegación

---

### 5️⃣ API ROUTES (Impacto: **BAJO**)

**Archivos**: ~39 API routes en `/app/api/`

**Buena noticia**: ✅ Las API routes **NO necesitan cambios** porque:
1. Ya obtienen el tenant desde headers (`x-tenant-id`)
2. El middleware sigue inyectando el tenant en headers
3. La autenticación sigue igual (JWT con `tenantId`)

**Ejemplo actual** (seguiría funcionando):

```typescript
// app/api/empresa/pedidos/route.ts
export async function GET(req: Request) {
  const session = await auth()
  const tenantId = session.user.tenantId // Sin cambios
  
  const orders = await prisma.order.findMany({
    where: { tenantEmpresa: tenantId } // Sin cambios
  })
  
  return Response.json(orders)
}
```

---

### 6️⃣ BASE DE DATOS (Impacto: **MÍNIMO**)

**Schema Prisma**: ✅ **SIN CAMBIOS** necesarios

```prisma
model Tenant {
  id        String @id
  subdomain String @unique  // ← Podemos reutilizar como "slug"
  type      TenantType
  name      String
  // ... resto igual
}
```

**Queries**: ✅ **SIN CAMBIOS** necesarios

```typescript
// Todas las queries siguen filtrando por tenantId
const orders = await prisma.order.findMany({
  where: { tenantEmpresa: tenantId } // Sin cambios
})
```

**Migraciones**: NO necesarias (el campo `subdomain` se convierte en "slug")

---

### 7️⃣ COMPONENTES UI (Impacto: **ALTO**)

**Componentes afectados**: ~90 componentes

#### A. Navigation Components
- `components/empresa/SidebarNav.tsx`
- `components/catering/SidebarNav.tsx`
- Breadcrumbs
- Tabs

#### B. Form Actions
- Redirects después de submit
- Callbacks de success/error

#### C. Data Tables
- Links en filas (ver pedido, editar empleado, etc.)

**Patrón de cambio**:

```tsx
// ANTES
function SidebarNav() {
  return (
    <nav>
      <Link href="/empresa/dashboard">Dashboard</Link>
      <Link href="/empresa/pedidos">Pedidos</Link>
      <Link href="/empresa/empleados">Empleados</Link>
    </nav>
  )
}

// DESPUÉS
function SidebarNav() {
  const toRoute = useTenantRoute()
  return (
    <nav>
      <Link href={toRoute('/dashboard')}>Dashboard</Link>
      <Link href={toRoute('/pedidos')}>Pedidos</Link>
      <Link href={toRoute('/empleados')}>Empleados</Link>
    </nav>
  )
}
```

---

### 8️⃣ GUARDS Y PERMISOS (Impacto: **BAJO**)

**Archivos**:
- `lib/guards/RoleGuard.tsx`
- `lib/guards/PermissionGuard.tsx`

✅ **SIN CAMBIOS** necesarios porque:
- Ya validan basándose en `session.user.role` y `session.user.tenantId`
- No dependen de subdominios

---

### 9️⃣ TESTING (Impacto: **MEDIO**)

**Archivos**:
- `e2e/*.spec.ts`
- `tests/e2e/*.ts`

**Cambios necesarios**:

```typescript
// ANTES
await page.goto('https://acme.sintupper.localhost:3000/empresa/dashboard')

// DESPUÉS
await page.goto('https://sintupper.localhost:3000/empresa/acme/dashboard')
```

**Tests afectados**: Todos los E2E (~10 archivos potenciales)

---

### 🔟 CONFIGURACIÓN Y DEPLOY (Impacto: **ALTO** 🚨)

#### A. DNS y Dominios

**ANTES**:
```
*.sintupper.com → Wildcard DNS apuntando a servidor
acme.sintupper.com → Resuelve automáticamente
globex.sintupper.com → Resuelve automáticamente
```

**DESPUÉS**:
```
sintupper.com → Un solo dominio
(No se necesitan wildcard DNS)
```

✅ **VENTAJA**: Configuración DNS más simple
✅ **VENTAJA**: Certificados SSL más simples (1 dominio vs wildcard)
✅ **AHORRO**: ~$50-100/año si usas CDN con wildcard SSL

#### B. Coolify / Docker

**Archivo**: `Dockerfile`, `docker-entrypoint.sh`

```bash
# ANTES
WILDCARD_DOMAIN=".sintupper.com"

# DESPUÉS
# No se necesita
```

#### C. Variables de entorno

```env
# ANTES
NEXTAUTH_URL=https://acme.sintupper.com
WILDCARD_DOMAIN=".sintupper.com"

# DESPUÉS
NEXTAUTH_URL=https://sintupper.com
# WILDCARD_DOMAIN ya no es necesario
```

---

## ⚖️ Pros y Contras

### ✅ VENTAJAS del Cambio

1. **DNS más simple**
   - No necesitas wildcard DNS (*)
   - Más fácil configurar en providers restrictivos
   - Menos configuración de certificados SSL

2. **URLs más predecibles**
   - Usuarios pueden "navegar" las URLs
   - Más fácil compartir links específicos
   - Mejor para bookmarks

3. **SEO potencialmente mejor**
   - Todo bajo un solo dominio
   - Autoridad de dominio consolidada
   - (Aunque esto es poco relevante para un SaaS B2B)

4. **Desarrollo más simple**
   - No necesitas configurar subdominios en local
   - `localhost:3000` funciona sin hosts file
   - Más fácil para nuevos desarrolladores

5. **Costos reducidos**
   - Sin wildcard SSL (~$50-100/año)
   - Sin necesidad de IPs dedicadas en algunos providers

### ❌ DESVENTAJAS del Cambio

1. **🔒 Seguridad reducida**
   - **Aislamiento más débil**: Los subdominios proveen aislamiento natural (cookies, localStorage, CORS)
   - Con rutas, todos los tenants comparten el mismo origin
   - Mayor riesgo de data leaks si hay bugs en el código
   - Session cookies visibles para todos los paths

2. **📝 Experiencia de usuario afectada**
   - Usuarios deben **seleccionar su organización** en el login
   - URLs más largas: `/empresa/acme/dashboard` vs `/dashboard`
   - Menos "white-label" feeling (todos ven "sintupper.com")
   - Más difícil de recordar ("¿Era /empresa/acme o /acme/empresa?")

3. **🎨 Branding más limitado**
   - No puedes tener dominios custom fácilmente (`acme.com` → `acme.sintupper.com`)
   - Menos percepción de "plataforma exclusiva"
   - Bar de navegación siempre muestra "sintupper.com"

4. **⚡ Performance potencialmente peor**
   - Cache de CDN menos efectivo (más paths dinámicos)
   - No puedes cachear por subdomain
   - Más requests al backend para resolver tenant desde slug

5. **📊 Analytics más complejos**
   - Más difícil segmentar por tenant en Google Analytics
   - No puedes usar filtros por hostname
   - Necesitas custom dimensions para todo

6. **🔐 Session management más complejo**
   - Todos los tenants comparten cookies de sesión
   - Riesgo de "session leaking" si cambias de organización
   - Necesitas logout más robusto al cambiar de tenant

7. **🌍 Multi-tenant "standard"**
   - Los subdominios son el estándar en SaaS:
     - Slack: `acme.slack.com`
     - Notion: `acme.notion.site`
     - Asana: `acme.asana.com`
     - Zendesk: `acme.zendesk.com`
   - Los usuarios esperan subdominios en B2B

---

## 🔢 Estimación de Esfuerzo

### Desglose por área:

| Área | Archivos | Horas | Complejidad |
|------|----------|-------|-------------|
| 1. Middleware y resolución tenant | 3 | 4h | Media |
| 2. Reestructurar rutas (`app/`) | 50 | 8h | Alta |
| 3. Autenticación y login | 5 | 3h | Media |
| 4. Links y navegación (hooks/utils) | 5 | 4h | Media |
| 5. Actualizar componentes | 90 | 16h | Alta |
| 6. Testing E2E | 10 | 4h | Baja |
| 7. Documentación | - | 2h | Baja |
| 8. QA y bugs | - | 8h | - |
| **TOTAL** | **~160** | **49h** | **6-7 días** |

### Por persona/rol:

- **Desarrollador Senior**: 6-7 días (49 horas)
- **QA/Tester**: 1-2 días (testing completo)
- **DevOps**: 0.5 días (cambios de configuración)

### Fases:

**Fase 1**: Setup básico (2 días)
- Middleware y resolución de tenant
- Reestructurar rutas
- Hook `useTenantRoute()`

**Fase 2**: Actualización masiva (3 días)
- Actualizar todos los componentes
- Actualizar links
- Actualizar forms

**Fase 3**: Testing y ajustes (2 días)
- Tests E2E
- QA manual
- Bugs y edge cases

---

## 🚨 Riesgos y Consideraciones

### 🔴 RIESGOS ALTOS

1. **Data Leaks entre tenants**
   - Sin aislamiento de subdominios, un bug en el código puede exponer datos
   - Necesitas ser MUY cuidadoso con el filtering por `tenant_id`
   - Tests E2E de aislamiento son CRÍTICOS

2. **Session leaking**
   - Si un usuario trabaja en múltiples organizaciones, necesitas manejo especial
   - ¿Qué pasa si va a `/empresa/acme` pero su sesión es de `globex`?

3. **Breaking change MASIVO**
   - Todos los links existentes (bookmarks, emails, etc.) dejarán de funcionar
   - Necesitas redirects permanentes: `acme.sintupper.com` → `sintupper.com/empresa/acme`

4. **Complejidad en middleware**
   - Parsear paths es más complejo que extraer subdominios
   - Más casos edge: `/empresa`, `/empresa/`, `/empresa/acme`, etc.

### 🟡 RIESGOS MEDIOS

5. **Cache invalidation**
   - CDN/Redis cache será más difícil de gestionar
   - No puedes cachear por `host` header

6. **Performance del middleware**
   - Necesitas lookups de BD en cada request para resolver slug → tenant
   - El cache es crítico

7. **URLs no bookmarkeables fácilmente**
   - URLs más largas y complejas
   - Más fácil equivocarse al compartir

---

## 🎯 Recomendación Final

### ⛔ **NO RECOMENDADO** cambiar a rutas path-based SALVO que:

1. **Tienes problemas reales con DNS**
   - Tu provider no soporta wildcard DNS
   - Los certificados wildcard son prohibitivamente caros
   - Restricciones corporativas de IT

2. **Tu producto es diferente**
   - No es multi-tenant "tradicional"
   - Es más un "marketplace" que SaaS
   - Los usuarios ya esperan rutas (no subdominios)

3. **Estás en fase muy temprana**
   - Menos de 5 tenants activos
   - Sin usuarios en producción
   - Puedes permitirte el breaking change

### ✅ **ALTERNATIVA RECOMENDADA**: Híbrido

Si realmente necesitas rutas por alguna razón, considera un **enfoque híbrido**:

```
Producción:
  - acme.sintupper.com/dashboard (subdominios - MANTENER)

Alternativa (opcional):
  - sintupper.com/empresa/acme/dashboard (rutas - agregar como alias)
  
Implementación:
  - Middleware detecta AMBOS patrones
  - Redirect canonical a subdominios
  - Rutas solo como fallback/convenience
```

Esto te da flexibilidad sin sacrificar la arquitectura actual.

---

## 📝 Conclusión

El cambio de subdominios a rutas path-based es **técnicamente factible** pero implica:

- ⏱️ **6-7 días de desarrollo**
- 📝 **~160 archivos modificados**
- 🚨 **Riesgos de seguridad incrementados**
- 😕 **UX potencialmente degradada**
- 💰 **Ahorro de ~$100/año en DNS/SSL**
- ❌ **NO es la práctica estándar en SaaS B2B**

**Recomendación**: ⛔ **Mantener subdominios** salvo razones de negocio muy fuertes.

La arquitectura actual con subdominios es:
- ✅ Más segura (aislamiento natural)
- ✅ Mejor UX (URLs cortas, familiar)
- ✅ Estándar de la industria
- ✅ Mejor branding
- ✅ Ya está implementada y funciona

---

## 📚 Referencias

- [Next.js Multi-Tenancy Patterns](https://vercel.com/guides/nextjs-multi-tenant-application)
- [Subdomain vs Path-based Routing](https://www.heavybit.com/library/article/subdomain-vs-path-based-routing-for-saas-apps/)
- [Auth0 Multi-Tenant Apps](https://auth0.com/docs/manage-users/organizations/configure-organizations)

---

**Documento creado**: 2025-01-20  
**Autor**: Análisis técnico del proyecto Comidas  
**Versión**: 1.0

