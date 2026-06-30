# RBAC — Guía de permisos (leer al crear cualquier funcionalidad nueva)

> **Regla de oro:** toda funcionalidad nueva (una sección, una página, un botón,
> una server action, una API route) que no sea pública **debe** declarar su
> permiso en el catálogo y controlarse con él. No se añade lógica de acceso por
> rol "a pelo" (`if (role === 'X')`); se usa el sistema de permisos.

El RBAC es **dinámico y editable en BD**: el admin crea roles y marca sus
permisos en `/admin/users/roles`. Para que eso controle algo de verdad, cada
funcionalidad tiene que estar "cableada" al permiso.

## Convención de claves

`recurso:accion` en minúsculas con guiones. Ej: `dish:create`, `empresa:view`,
`emp-config-user:delete`.

- La acción **`view`** = acceso a la sección (lo usa el enforcement por sección).
- Acciones de mutación: `create`, `edit`, `delete`, o verbos específicos
  (`publish`, `pay`, `start`, `export`, `process`, `run-test`, …).
- Prefijos por portal cuando hay colisión: `emp-*` (empresa), `cat-*` (catering).

## Las 4 capas (dónde se controla)

| Capa | Qué controla | Dónde |
|---|---|---|
| **Catálogo** | Define que el permiso existe | `lib/auth/permission-catalog.ts` |
| **Sidebar/Nav** | Ocultar lo que no puedes ver | `components/<portal>/*Sidebar.tsx` / `*Navbar.tsx` |
| **Middleware** | Bloquear acceso por URL directa a la sección | `lib/auth/section-permissions.ts` + `middleware.ts` |
| **Acción** | Bloquear la mutación (server action / API route) | guard con `permittedAction(...)` |

La sesión lleva `permissions[]` resuelto en el login (`super_admin` = `['*']`).
Se exponen en `lib/auth/config.ts` y `lib/auth/edge-config.ts`.

## ✅ Checklist al añadir funcionalidad

### 1. Declarar el/los permiso(s) en el catálogo
En `lib/auth/permission-catalog.ts`, dentro del portal correspondiente (`ADMIN` /
`EMPRESA` / `CATERING` / `EMPLEADO`), añade el recurso o la acción:

```ts
{ resource: 'reservas', label: 'reservas', actions: [
  VIEW('reservas'),
  { action: 'create', desc: 'Crear reserva' },
  { action: 'cancel', desc: 'Cancelar reserva' },
] },
```

Si el rol del sistema que debe tenerlo usa `keysForPortal(...)` (admin del
portal, empleado), lo hereda automáticamente. Si es un rol con lista explícita
(RRHH, CHEF, …) y debe tenerlo, añade la clave a su `permissions: [...]`.

### 2. Sembrar el catálogo en BD
```bash
pnpm tsx prisma/seed-rbac.ts     # upsert idempotente: permisos + 12 roles del sistema
```
Esto inserta los permisos nuevos en la tabla `Permission` y reasigna los roles
del sistema. (En prod se ejecuta igual; es additivo.)

### 3. Sección nueva → cablearla en sidebar + middleware
- **Sidebar/Nav** del portal: añade el item con su `permission: 'reservas:view'`.
  Los sidebars ya filtran por permiso (con fallback a rol si la sesión es vieja).
- **Middleware**: añade la regla en `lib/auth/section-permissions.ts` (en
  `EMPRESA_SECTION_RULES` / `CATERING_SECTION_RULES` / etc.), prefijo más
  específico primero:
  ```ts
  { prefix: '/empresa/reservas', permission: 'reservas:view' },
  ```

### 4. Acción nueva (mutación) → guard con permiso
En la **server action** o **API route**, usa `permittedAction` (en
`lib/auth/permissions.ts`):

```ts
import { permittedAction } from '@/lib/auth/permissions'

// API route
const allowedRoles = ['ADMIN_EMPRESA', 'RRHH']   // ← fallback (sesión sin permisos)
if (!permittedAction(session.user.permissions, session.user.role, 'reservas:create', allowedRoles)) {
  return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
}

// Server action
if (!permittedAction(session.user.permissions, session.user.role, 'reservas:cancel', ['ADMIN_EMPRESA'])) {
  return { success: false, error: 'No tienes permiso' }
}
```

**Por qué `legacyRoles` (4º arg):** si la sesión aún no lleva `permissions[]`
(JWT anterior a la migración RBAC), se cae a ese check por rol. Así nadie se
queda fuera durante la transición; al re-loguear manda el permiso.

### 5. Verificar
```bash
pnpm type-check
# y validar que la clave existe en el catálogo (no inventar claves):
# grep -r "permittedAction" en tu fichero → la clave debe estar en permission-catalog.ts
```

## Qué NO se controla con esto (excepciones)

- **Guards por propiedad** (el dueño del recurso): "este empleado solo ve SUS
  pedidos", "este catering solo SU factura". Eso es ownership por `tenantId` /
  `userId`, no un allowlist de rol — se deja como está. No lo conviertas en
  permiso.
- **Reglas de negocio temporales** (cutoff, estados): no son autorización.
- **Rutas públicas** (marketing, login): fuera del RBAC.

## Cómo lo prueba el admin

`/admin/users/roles` → crear/editar rol → marcar permisos → asignar a un usuario
→ ese usuario **re-inicia sesión** (los permisos se resuelven en el login) → ve
solo sus secciones y solo puede ejecutar sus acciones.

## Referencias
- Catálogo: `lib/auth/permission-catalog.ts`
- Helper de acción: `lib/auth/permissions.ts` → `permittedAction`
- Enforcement de sección: `lib/auth/section-permissions.ts` + `middleware.ts`
- Seed: `prisma/seed-rbac.ts`
- Estado del sistema: memoria `rbac-dynamic` (sesiones de Claude)
