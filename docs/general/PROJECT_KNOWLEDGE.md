# Project Knowledge — comidas-plataforma

> **Leer esto primero cuando vuelvas al proyecto tras una pausa.** Es el
> documento vivo del estado y decisiones. Lo demás son referencias.

Last updated: 2026-06-29

## What This Project Does

SaaS multi-tenant para gestionar el beneficio de comida corporativa entre
**empresas**, **empleados** y **caterings**, con compliance fiscal IRPF
español (≤11€/día por empleado, trazabilidad nominativa).

Spec funcional completa → [`prd.md`](./prd.md).

## Architecture Overview

### Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript estricto
- **UI**: shadcn/ui + Radix + Tailwind + Framer Motion + Lucide
- **Backend**: Next.js API Routes + Server Actions
- **BD**: PostgreSQL + Prisma 5
- **Auth**: NextAuth v5 (JWT, impersonación 15 min auditada)
- **Estado**: React Query (server), Zustand descartado
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Deploy**: Docker multi-stage en Coolify (Hetzner)

### Portales
- **Super Admin**: dashboard KPIs globales, CRUD tenants/empresas/caterings/usuarios.
- **Empresa**: dashboard, empleados, pedidos, incidencias, facturación, catering asignado, auditoría fiscal, configuración.
- **Catering**: platos, menús semanales, rutas de reparto, producción (KDS), facturación, incidencias, entregas.
- **Empleado**: selector semanal de menús, historial, perfil, incidencias.

### Datos
- **36 modelos Prisma**, multi-tenant con campo `tenantId` (o doble `tenantEmpresa`+`tenantCatering` en tablas que cruzan).
- **Auditoría inmutable**: `audit_logs` con hash SHA-256.
- **Versionado**: `order_history`, `company_policy_history`.
- **Compliance fiscal**: `daily_snapshots`, `fiscal_reports` con firma digital.
- **Soft delete** con `deletedAt` en entidades sensibles.

### Arquitectura de entornos
Dev local apunta a `comidas_dev` (Hetzner); prod a `comidas_prod` (Coolify
en mismo Postgres). Ver
[`despliegue/ARQUITECTURA-ENTORNOS.md`](./despliegue/ARQUITECTURA-ENTORNOS.md)
y [`despliegue/RUNBOOK.md`](./despliegue/RUNBOOK.md).

## Features Implemented

| Feature | Date | Status | Notes |
|---------|------|--------|-------|
| Auth multi-tenant NextAuth v5 | 2025-11 | ✅ | JWT, impersonación 15min auditada, RBAC 14 roles, ~50 permisos |
| Portal Súper Admin | 2025-11 | 🟡 90% | Dashboard con KPIs, CRUD tenants/empresas/caterings/users, wizard catering parcial |
| Portal Empresa | 2025-11 | 🟡 85% | Dashboard, empleados CRUD, pedidos, facturación, incidencias, catering, auditoría fiscal, configuración |
| Portal Catering | 2025-11 | 🟡 80% | Platos CRUD, menús semanales, rutas reparto, producción KDS, facturas mensuales, incidencias |
| Portal Empleado | 2025-11 | 🟡 75% | Selector semanal, historial, perfil, incidencias |
| **Estabilización 2026-04** | 2026-04-18 | ✅ | 8 sprints: TS strict, schema ampliado, 3 zombis reescritos, cross-tenant bypass cerrado, CVEs críticos parcheados, migraciones estándar, seeds idempotentes, CI activo, PII crypto + rate limit + RLS preparados, Server Components en catering, 51 unit tests verdes |
| Arquitectura de entornos | 2026-04-18 | ✅ | Dev remoto en Hetzner (`comidas_dev`), prod en Coolify (`comidas_prod`), usuarios Postgres separados con GRANT estricto, backups automáticos |
| Scaffolding PM x10 | 2026-04-18 | ✅ | `tasks/`, `memory/`, `docs/producto/qa.md`, `working-docs/`, `PROJECT_KNOWLEDGE.md`, `project-registry.md` |

## Key Decisions

| Decision | Date | Why |
|----------|------|-----|
| Next.js quedarse en 15.x (no 16) | 2026-04 | Next 16 requiere migrar Turbopack + renombrar `middleware.ts` → `proxy.ts`. Branch dedicada. |
| Prisma quedarse en 5.22 (no 7) | 2026-04 | Prisma 7 mueve `datasource.url` fuera del schema. Migración grande. |
| `@hookform/resolvers` en v3 (no 5) | 2026-04 | v5 requiere Zod v4 + cambios de tipo en `useForm`. |
| ESLint en v8 (no 10) | 2026-04 | v9+ exige flat config. Refactor dedicado. |
| Zustand desinstalado | 2026-04 | 0 usos productivos confirmados |
| React Query se mantiene | 2026-04 | Aprovechar en tablas con paginación cliente |
| RLS Postgres preparado pero no activado | 2026-04 | Requiere migrar queries a `withTenantContext` primero; activación progresiva |
| Cifrado PII preparado pero no aplicado | 2026-04 | Esperar a tener datos reales y rotación de claves definida |
| Rate limiter in-memory (no Upstash) | 2026-04 | Single replica hoy; interfaz `RateLimiter` estable para swap futuro |
| Dev en `comidas_dev` remoto (no Docker local) | 2026-04-18 | Preferencia del usuario: no instalar Docker Desktop |
| Staging aplazado | 2026-04-18 | `comidas_prod` vacía hoy, no justifica la gestión extra |
| Supabase descartado | 2026-04 | Usuario explícitamente decidió no integrar |

## How Things Work

### Flujo dev → prod

1. Usuario edita código/schema en laptop (`.env` apuntando a `comidas_dev`).
2. `pnpm db:migrate:dev` si hay cambios de schema → genera
   `prisma/migrations/YYYYMMDD..._nombre/migration.sql`.
3. `pnpm type-check && pnpm lint && pnpm exec vitest run && pnpm build`.
4. `git add . && git commit && git push origin main`.
5. CI (`.github/workflows/ci.yml`) valida type-check + lint + tests +
   build.
6. Coolify detecta push, rebuild del Docker, arranca nuevo contenedor. El
   `docker-entrypoint.sh` ejecuta `prisma migrate deploy` → aplica solo
   migraciones pendientes a `comidas_prod`.
7. `plati.es` sirve la versión nueva en 2-5 min.

Runbook completo con 12 escenarios (rollback, backup, restore, etc.) →
[`despliegue/RUNBOOK.md`](./despliegue/RUNBOOK.md).

### Flujo de features

1. `/design-to-prd` si hay diseños Pencil.
2. `/analyze` → evaluar problema.
3. `/define` → JTBDs + stories.
4. `/plan` → arquitectura + sprint.
5. `/build` → implementar (seguir patrones en `CLAUDE.md` + `docs/producto/lessons.md`).
6. `/save` → commit + push.
7. `/review` → QA + docs.

Artefactos en `docs/producto/features/<feature>/`.

### Convenciones clave

- **Pages**: Server Components por defecto. Mutaciones → Server Actions en
  `components/<portal>/<feature>/actions.ts`.
- **Queries**: `lib/db/queries/<dominio>.ts`, una función por operación,
  siempre filtro por tenant.
- **Forms**: React Hook Form + Zod.
- **Validaciones**: `lib/validations/<dominio>.ts`.
- **Guards**: `lib/auth/session.ts` para Server Components, `lib/guards/api.ts`
  para API routes.
- **Tests**: unit en `tests/unit/`, E2E en `tests/e2e/`.

## Auditoría de lanzamiento del Panel Súper Admin (en curso · jun 2026)

Revisión sección por sección de `/admin` para verificar que los datos son **reales** (no
mock/stale), los botones llevan a algo que **existe y hace lo que dice**, y las métricas son
**consistentes entre pantallas**. Backlog y trazabilidad: **EPIC-003** en
[`../producto/features/admin-launch-audit/`](../producto/features/admin-launch-audit/_dossier.md).

**Hecho (11/24):** Dashboard general · módulo **Empresas** · módulo **Caterings** (este último
estaba mayormente mock: 4 pestañas reconstruidas con datos reales, formularios que ahora guardan,
métricas en vivo). Pendiente: Usuarios, Catálogos, Calidad, **Facturación**, Integraciones,
**Compliance**, Plantillas, Operación, Tenants + transversales.

### Patrones/utilidades a REUTILIZAR en cada módulo
- **Métricas canónicas por entidad** (misma definición en todas las pantallas):
  `lib/db/queries/company-metrics.ts` (`getCompanyAdoption`) y `catering-metrics.ts`
  (`getCateringQualityMetrics`). Convención: denominador = empleados `ACTIVE`; periodo = **mes natural**.
- **Incidencias**: constantes únicas en `lib/incidents/constants.ts`; listados con
  `getGlobalIncidents({ tenantEmpresa | tenantCatering })`; detalle en `/admin/quality/incidents/[id]`.
- **PII**: `decryptNameSafe` en `lib/crypto/pii.ts` para render de nombres.
- **Formularios admin**: server action + Zod (`lib/validations/*`), patrón `CompanyForm`/`CateringEditForm`.
- **Gráficas**: Recharts (`components/admin/dashboard/ChartsSection.tsx`).

### Familias de bugs a cazar (checklist por módulo)
1. Fecha "hoy" con `serviceDate: today` (timestamp exacto) → usar rango `startOfDay/endOfDay`.
2. KPI cableado a la query equivocada (trazar card→variable→query→fuente canónica).
3. Columnas **stored stale** (solo seed, nunca recalculadas) mostradas como dato real.
4. Ramas de enum fantasma (`CRITICAL`, `CLOSED` no existen en sus enums).
5. Enlaces a rutas inexistentes (404) y botones sin handler (muertos).
6. Datos mock/`Math.random` embebidos en componentes.

## Known Issues & Tech Debt

| Issue | Priority | Notes |
|-------|----------|-------|
| RLS Postgres no activo | Media | Migración `20260419000000_enable_rls_multi_tenant/` lista. Aplicar cuando queries críticas usen `withTenantContext`. |
| PII (nameEnc, phoneEnc) en texto plano | Alta (cuando haya datos reales) | Helper `lib/crypto/pii.ts` + script `scripts/migrate-pii-encryption.ts` listos |
| Rate limiter in-memory | Baja | Funciona en single-replica. Swap a Upstash Redis cuando se escale |
| Sin off-site backup de prod | Media | Configurar rclone a S3/B2 tras el cron local |
| CVE `yaml` transitivo de Tailwind 3 | Baja | Solo cerrable subiendo a Tailwind 4 |
| Next 15 → 16 | Baja | Branch dedicada: Turbopack + proxy rename |
| Prisma 5 → 7 | Baja | Branch dedicada: `prisma.config.ts` + adapter |
| `@hookform/resolvers` 3 → 5 | Baja | Branch dedicada: Zod v4 compat |
| ESLint 8 → 10 | Baja | Branch dedicada: flat config |
| Componentes KPI/Activity/Alerts duplicados en los 4 portales | Baja | Consolidar en `components/shared/` cuando se toquen |
| `any` residuales (ahora `warn`) | Baja | Reducir progresivamente a <10 en lib+app |
| Scheduler cron (cutoff 11:00, consolidación 11:05, snapshot 23:59, facturas 01:00 día 1) | Alta (cuando haya tráfico real) | Modelos y queries listos, falta scheduler (Vercel Cron, BullMQ, etc.) |

## Cambios recientes (2026-06-30, EPIC-003)

### RBAC dinámico DB-backed
Roles y permisos pasaron de estáticos en código a **tablas** `Role` / `Permission` / `RolePermission` + `User.roleId`. Catálogo de **211 permisos** (`recurso:accion`) que mapea los 4 portales en `lib/auth/permission-catalog.ts`. La sesión lleva `permissions[]` resuelto en login (`super_admin` = `['*']`). UI editable en `/admin/users/roles` (crear rol + marcar permisos). **Enforcement por sección en los 4 portales** (admin/empresa/catering/empleado): sidebars filtrados por permiso + gate en `middleware.ts` con reglas por portal (`lib/auth/section-permissions.ts`). Sesiones sin `permissions[]` (JWT previo a la migración) hacen *fallback* al límite por rol del layout — no se bloquea a nadie; al re-loguear manda el permiso. **Enforcement por acción (Fase 2, hecho):** los guards de las server actions y API routes usan `permittedAction(permissions, role, 'recurso:accion', legacyRoles)` (en `lib/auth/permissions.ts`) — exige el permiso si la sesión lo lleva, si no cae al check por rol legacy. ~78 guards migrados en server actions + API routes (catering/empresa/empleado/admin). Los guards por *propiedad* (tenant/empleado dueño) se dejaron como están. Detalle: memoria `rbac-dynamic`.

### Alérgenos relacionales
Tabla join **`DishAllergen`** (los alérgenos salen de `Dish.labels`, que ahora solo guarda tags nutricionales). Catálogo `allergens` normalizado a **14 canónicos** (code = slug español). El catering selecciona del catálogo de BD; el empleado (perfil + bloqueo en menú) también — toda la cadena estaba rota y se arregló. Seeds canónicos vía `prisma/seed-allergens.ts`. Detalle: memoria `allergens-system` y `docs/producto/features/admin-launch-audit/catalogos-alergenos.md`.

## Key Pointers (para nuevas sesiones)

- **Reglas de trabajo**: [`CLAUDE.md`](../CLAUDE.md) en la raíz.
- **Inventario técnico**: [`project-registry.md`](./project-registry.md).
- **Sprint actual**: [`../docs/producto/sprint.md`](../docs/producto/sprint.md).
- **Lessons learned**: [`../docs/producto/lessons.md`](../docs/producto/lessons.md).
- **Diagnóstico 2026-04**: [`diagnostico/DIAGNOSTICO-EXHAUSTIVO-2026-04.md`](./diagnostico/DIAGNOSTICO-EXHAUSTIVO-2026-04.md).
- **Problemas producción (activos)**: [`diagnostico/INFORME-PROBLEMAS-PRODUCCION-PLATI.md`](./diagnostico/INFORME-PROBLEMAS-PRODUCCION-PLATI.md).
