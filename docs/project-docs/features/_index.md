# Features — Índice

El producto se organiza en **4 portales** + una landing pública. Cada
portal tiene su propio layout, sus propios permisos y su propia forma de
navegar el mismo modelo de datos compartido.

## Los 4 portales

| Portal | Subdominio | Página inicial | Páginas | Documentación |
|---|---|---|---|---|
| Súper Admin | `admin.plati.es` | `/admin` | 50+ | [portal-admin.md](./portal-admin.md) · [módulos operativos (sprints 1-8)](./portal-admin-modulos.md) |
| Empresa | `<empresa>.plati.es` | `/empresa/dashboard` | 11+ | [portal-empresa.md](./portal-empresa.md) |
| Catering | `<catering>.plati.es` | `/catering/dashboard` | 14+ | [portal-catering.md](./portal-catering.md) |
| Empleado | `<empresa>.plati.es` (mismo subdominio) | `/empleado/menus` | 5 | [portal-empleado.md](./portal-empleado.md) |

Total: **46 páginas de portal** + 5 de auth + 1 de landing + 4 páginas
globales (unauthorized, error) = **56 páginas** en total.

## Cómo se decide el portal

Tras el login, `getDashboardPath(role, tenantType)` en
`lib/auth/permissions.ts` decide a qué portal redirigir:

```ts
SUPER_ADMIN, AUDITOR                           → /admin
ADMIN_EMPRESA, RRHH, FINANZAS, MANAGER_SEDE    → /empresa/dashboard
EMPLEADO (tenant tipo EMPRESA)                 → /empleado/menus
ADMIN_CATERING, CHEF, COCINERO, REPARTIDOR,
  FINANZAS_CATERING                            → /catering/dashboard
```

Si un usuario intenta acceder a un portal que no le corresponde (ej:
EMPLEADO que navega a `/empresa/dashboard`), el layout
`app/(empresa)/layout.tsx` lo detecta y redirige a `/unauthorized`.

## Features principales por portal

### Súper Admin

1. **Dashboard global** — KPIs cross-tenant.
2. **Gestión de tenants** (genérica) — todos los tenants.
3. **Gestión de empresas** (específica) — empresas + wizard onboarding.
4. **Gestión de caterings** (específica) — caterings + wizard + docs.
5. **Gestión de usuarios** — todos los usuarios.
6. **Impersonación** — entrar como otro usuario para soporte.

### Empresa

1. **Dashboard** — KPIs de la empresa (adopción, gasto, incidencias).
2. **Empleados** — CRUD + import CSV + alergias.
3. **Pedidos** — histórico con filtros + export CSV.
4. **Incidencias** — reporte y seguimiento.
5. **Catering asignado** — info + SLA + ratings.
6. **Facturación** — resumen mensual + desglose + conciliación.
7. **Auditoría fiscal** — `FiscalReport` + cumplimiento IRPF.
8. **Configuración** — política, sedes, documentos, plan.
9. **Registro de actividad** — audit log visible a la empresa.

### Catering

1. **Dashboard** — KPIs operacionales (pedidos hoy, entregas, ratings).
2. **Menús semanales** — calendario + editor diario + publicación.
3. **Platos** — catálogo con alérgenos, nutrición, clonación.
4. **Producción** — Kitchen Display + Packing Display (tablet
   fullscreen, auto-refresh 30s).
5. **Rutas de reparto** — gestión admin + vista móvil del repartidor.
6. **Facturación** — generación mensual + pagos.
7. **Incidencias** — gestión + resolución + compensación.

### Empleado

1. **Menús semanales** — selector semanal mobile-first.
2. **Historial** — pedidos pasados + gasto.
3. **Incidencias** — reportar y ver estado.
4. **Perfil** — datos personales, alergias, preferencias.

## Cómo se comunican los portales

Aunque visualmente separados, los portales **operan sobre los mismos
datos**:

- Cuando un empleado confirma un pedido → aparece en el dashboard del
  catering (KPI "pedidos hoy") y en el de la empresa (KPI "adopción").
- Cuando un repartidor marca `DELIVERED` → actualiza el pedido que el
  empleado ve en su historial como "entregado".
- Cuando el cron genera `Invoice` → aparece en facturación del catering
  como "issued" y en facturación de la empresa como "pending".

La coherencia la garantiza el esquema compartido. No hay sincronización
ni replicación entre portales — todos consultan la misma BD con filtros
de tenant distintos.

## Patrones UI compartidos

Los portales siguen convenciones comunes:

### Layout

- **Sidebar** fija izquierda con navegación principal.
- **Navbar** superior con info de usuario, notificaciones, logout.
- **Breadcrumbs** opcional bajo el navbar.
- **ImpersonationBanner** si hay sesión impersonada (banner naranja
  full-width en la parte superior).

### Dashboard

Todo portal tiene dashboard como home. Patrón:

- Fila de **KPIs** (4-6 cards con métrica + delta vs período anterior).
- **Alertas** críticas pendientes.
- **Gráficas** de tendencias (Recharts).
- **Tabla de actividad reciente**.
- **Quick Actions** panel con atajos a acciones frecuentes.

### Listados

- **Filtros** arriba (búsqueda, estado, fecha, etc.) sincronizados con
  query params (`?search=&status=&page=`).
- **Paginación** siempre server-side.
- **Tabla** con columnas relevantes + acciones por fila.
- **Link a detalle** en el ID o botón "Ver".

### Forms

- **React Hook Form + Zod resolver**.
- Botón primario a la derecha, secundario a la izquierda.
- Errores inline bajo cada field.
- Toast (via `sonner`) tras submit exitoso: "Creado", "Actualizado".

### Tabs

Para entidades con muchas facetas (catering, empresa, empleado detalle):
tabs en lugar de páginas separadas. Contenido de cada tab lazy-cargado.

## Estado de completitud

| Portal | Páginas con UI funcional | Páginas con UI stub (pendientes) |
|---|:-:|:-:|
| Súper Admin | 14 / 16 | 2 (crear usuario, editar usuario) |
| Empresa | 11 / 11 | 0 |
| Catering | 12 / 14 | 2 (gestión rutas admin, gestión facturas admin) |
| Empleado | 5 / 5 | 0 |

Los stubs existen como placeholders con nota "Funcionalidad en
desarrollo". No impiden el uso del portal — son features secundarias.

## Próximas lecturas

Cada documento de portal incluye, página por página:

- URL y file path exacto
- Qué queries consume
- Qué componentes renderiza
- Qué mutaciones (Server Actions) dispara
- Permisos requeridos
- Comportamientos especiales (loading states, error boundaries, etc.)
