# Multi-tenancy

La separación entre tenants es **la invariante más importante del sistema**.
Si un empleado de ACME puede ver un pedido de otra empresa, todo lo demás
da igual: el producto es insostenible.

Este documento explica las 5 capas que evitan ese fallo.

## Capa 1: tipos de tenant

```prisma
enum TenantType {
  ROOT      // SinTupper mismo: subdomain "admin"
  EMPRESA   // Cliente B2B: subdomain "acme", "globex"
  CATERING  // Proveedor: subdomain "deliciasexpress"
}
```

- **ROOT**: un único registro con `name = "SinTupper Root"`. Sus usuarios
  son `SUPER_ADMIN` o `AUDITOR`. Pueden cruzar tenants (wildcard `*:*`
  en permisos).
- **EMPRESA**: N registros, uno por empresa cliente. `Company` 1:1 con
  este tenant. Sus usuarios son `ADMIN_EMPRESA`, `RRHH`, `FINANZAS`,
  `MANAGER_SEDE`, `EMPLEADO`.
- **CATERING**: N registros, uno por catering. `Restaurant` 1:1 con este
  tenant. Sus usuarios son `ADMIN_CATERING`, `CHEF`, `COCINERO`,
  `REPARTIDOR`, `FINANZAS_CATERING`.

## Capa 2: subdominios y resolución

Cada tenant tiene `subdomain` único. El middleware (`middleware.ts`)
extrae el subdominio del `Host` header y lo traduce a `tenantId`:

```
acme.sintupper.com     → Tenant{id: "abc-123", type: "EMPRESA"}
deliciasexpress.sint…  → Tenant{id: "xyz-789", type: "CATERING"}
admin.sintupper.com    → Tenant{id: "root-000", type: "ROOT"}
```

La resolución está **cacheada en memoria** con TTL 5 min
(`lib/middleware/tenant.ts`) para no pegarle a Postgres en cada request.
Si se actualiza un subdomain (raro), hay `clearTenantCache(subdomain)`.

En dev, la URL es `acme.localhost:3000` — `WILDCARD_DOMAIN=".localhost:3000"`
en `.env` habilita el patrón.

## Capa 3: filtrado por tenant en queries

Toda tabla multi-tenant lleva uno de estos campos:

- `tenantId` — tablas "simples" que pertenecen a un solo tenant
  (`User`, `Company`, `Restaurant`, `Dish`, `Employee`, `Notification`, …).
- `tenantEmpresa` + `tenantCatering` — tablas que **cruzan** dos tenants
  (un pedido relaciona empresa ↔ catering; una factura relaciona los
  mismos dos; una incidencia también).

### La regla de oro en el código

```ts
// ✅ bien
await prisma.order.findMany({
  where: { tenantEmpresa: tenantId, ...filters }
})

// ❌ mal — aparece en dev como warning
await prisma.order.findMany({
  where: filters  // ¡falta tenant!
})
```

El **Prisma middleware de desarrollo** (`lib/db/prisma.ts`) detecta el
segundo caso y loguea:

```
[prisma:tenant-check] Order.findMany sin filtro de tenant.
Añadir tenantId/tenantEmpresa/tenantCatering al where.
```

No bloquea la ejecución (se ejecutaría la query, devolvería mezclado),
pero mientras se desarrolla lo ves y lo arreglas. En producción no corre
el middleware — la defensa real es la capa 4 y 5.

## Capa 4: `getScopedTenantId` — fuente de verdad de "qué tenant"

Nunca confíes en headers del cliente para decidir qué tenant está pidiendo.
Un atacante puede mandar `x-tenant-id: <tenant-vecino>` y si lo honraras
sin validar, acceso cruzado.

La función `getScopedTenantId` en `lib/auth/session.ts` es la **única**
forma autorizada de obtener el tenant efectivo:

```ts
export async function getScopedTenantId(req?: NextRequest): Promise<string> {
  const session = await auth()
  if (!session?.user?.tenantId) {
    throw new Error('No authenticated session')
  }

  // ¿Impersonación activa? El token dice cuál es el tenant objetivo.
  if (session.user.impersonationToken) {
    const token = session.user.impersonationToken
    if (token.expiresAt < Date.now()) {
      throw new TenantMismatchError('Impersonation token expired')
    }
    return token.targetTenantId
  }

  // ¿Super admin pidiendo acceso cruzado? Header x-tenant-id solo
  // aceptado si el rol tiene permiso y el tenant objetivo existe.
  if (session.user.role === 'SUPER_ADMIN' && req) {
    const headerTenant = req.headers.get('x-tenant-id')
    if (headerTenant && headerTenant !== session.user.tenantId) {
      // verificar que existe
      const exists = await prisma.tenant.findUnique({ where: { id: headerTenant }})
      if (!exists) throw new TenantMismatchError('Tenant not found')
      return headerTenant
    }
  }

  // Caso normal: el tenant del usuario es el del JWT firmado.
  return session.user.tenantId
}
```

**Todas las queries de páginas y actions deben partir de aquí**, no del
header directo ni del user-agent:

```ts
// Una page típica:
export default async function Page() {
  const tenantId = await getScopedTenantId()
  const orders = await getOrders(tenantId, filters)
  return <OrdersTable orders={orders} />
}
```

## Capa 5: Row-Level Security de Postgres (preparada)

Hoy las capas 3+4 son suficientes, pero hay casos donde **un bug en una
query en desarrollo** podría revelar datos. RLS es la red de seguridad
final: aunque el `where` esté mal, Postgres filtra por política.

### Estado actual

Las policies están **escritas** en
`prisma/migrations-parked/20260419000000_enable_rls_multi_tenant/`. No
están aplicadas todavía porque requieren que las queries críticas pasen
por el wrapper `withTenantContext`, que setea las variables de sesión
que las policies consumen.

### Cómo funciona cuando se active

```sql
-- Policy ejemplo sobre tabla "orders"
CREATE POLICY orders_tenant_isolation ON orders
  USING (
    tenant_empresa = current_setting('app.tenant_id')::uuid
    OR tenant_catering = current_setting('app.tenant_id')::uuid
    OR current_setting('app.role') = 'super_admin'
  );
```

Para que esas `current_setting` tengan valor, hay que envolver la query
en una transacción que las setee:

```ts
// lib/db/prisma.ts
export async function withTenantContext<T>(
  tenantId: string,
  role: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantId}'`)
    await tx.$executeRawUnsafe(`SET LOCAL app.role = '${role}'`)
    return fn(tx)
  })
}
```

### Plan de activación progresiva

1. Migrar queries críticas (pedidos, facturas, empleados) a
   `withTenantContext` una a una.
2. En cada una, test E2E que verifica aislación: crear 2 tenants,
   entrar como A, hacer `findMany` sin `where` → verificar que **no**
   devuelve datos de B.
3. Cuando todas estén migradas, mover la migración de
   `migrations-parked/` a `migrations/` y aplicar en `comidas_dev` primero.
4. Activar en `comidas_prod` tras 1 semana de verificación en dev.

Más detalle en `prisma/migrations-parked/README.md`.

## El caso especial: SUPER_ADMIN y AUDITOR

Los roles root necesitan saltar el filtro para ver datos de todos los
tenants. El mecanismo:

- En queries de `lib/db/queries/admin-*`, el `where` no lleva `tenantId`.
- `canAccessTenant(userTenantId, role, targetTenantId)` en
  `lib/auth/permissions.ts` devuelve `true` si rol es `SUPER_ADMIN`.
- Cuando un super admin quiere **actuar sobre** un tenant concreto (no
  solo verlo), usa impersonación — ver [auth.md](./auth.md).

## El caso especial: empleado de EMPRESA

Un empleado pertenece a tenant EMPRESA, pero solo debe ver **sus
propios datos**, no los de otros empleados de la misma empresa. Capa
adicional:

```ts
// En queries de empleado:
where: {
  tenantEmpresa: tenantId,     // Capa 3: mismo tenant
  employeeId: session.user.employeeId  // Capa 6: solo su propio scope
}
```

La "capa 6" no tiene protección de Postgres — depende del código. Es
menos crítica que la separación entre tenants porque el daño potencial
es menor (un empleado viendo qué pidió un compañero, no secretos
comerciales), pero está en todas las queries del portal empleado.

## Resumen

| Capa | Qué protege | Cuándo actúa |
|---|---|---|
| 1. TenantType | Que usuarios de portal erróneo no entren | Login, layout del portal |
| 2. Subdominio | Derivar el tenant correcto sin confiar en el cliente | Middleware, cada request |
| 3. Filtro en queries | Que los datos devueltos sean del tenant del usuario | Cada query Prisma |
| 4. `getScopedTenantId` | Que el tenant se obtenga de la sesión, no de headers | Cada page, action, API route |
| 5. RLS Postgres | Red de seguridad si una query olvida el filtro | Backend (pendiente de activar) |
| 6. Scope de empleado | Que un empleado solo vea sus datos, no los de compañeros | Queries del portal empleado |
