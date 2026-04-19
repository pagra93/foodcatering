# Changelog

Historial de cambios relevantes del proyecto. No se documentan commits
menores; solo lo que marca diferencia (features, decisiones
arquitectónicas, fixes críticos, upgrades).

Formato inspirado en [Keep a Changelog](https://keepachangelog.com/).
Fechas en ISO (YYYY-MM-DD).

---

## 2026-04-19 — Portal admin completo (sprints 1-8) + integración fiscal festivos

### Añadido

Se construyen los **8 módulos operativos del portal Súper Admin** que
quedaron como scaffolding tras el cero-404. Detalle completo en
[`features/portal-admin-modulos.md`](./features/portal-admin-modulos.md).

- **Sprint 1 — Usuarios/Roles/Permisos**: CRUD de usuarios, matriz
  visual 14 roles × permisos, descripciones legibles.
- **Sprint 2 — Calidad y SLAs**: vistas cross-tenant de incidencias,
  auditorías y ratings; sistema completo de penalizaciones con flujo
  dispute/waive (ventana 7 días para ADMIN_CATERING).
- **Sprint 3 — Compliance**: auditoría fiscal cross-tenant con
  verificación hash, políticas de retención, gestión RGPD, DPA por
  tenant, checklist OWASP.
- **Sprint 4 — Plantillas y Branding**: `SystemSettings` singleton,
  branding por tenant con preview en vivo, CSS vars +
  estilos inline para aplicar marca en tiempo real. Email templates y
  announcements in-app.
- **Sprint 5 — Operación**: historial impersonación, ventanas de
  mantenimiento (middleware 503 si procede), healthchecks dashboard,
  estado Prisma migraciones, stats de rate-limiters.
- **Sprint 6 — Integraciones**: marketplace visual con 27 proveedores,
  CRUD webhooks + retries, API keys con hash seguro, UI de SSO/Pagos/ERP
  (conectores reales fuera de scope).
- **Sprint 7 — Facturación**: planes SaaS, liquidaciones
  catering→SinTupper, comisiones SinTupper→empresa, métricas MRR/ARR/churn,
  reglas fiscales regionales.
- **Sprint 8 — Catálogos globales**: `Allergen`, `Holiday`,
  `HolidayOverride`, `MenuTemplate`, `DeliveryZone`, `IncidentReason`.
  Seeds: 14 alérgenos EU, 20 festivos ES, 10 motivos de incidencia.
  Catering gestiona sus plantillas de menú y zonas; empresa y catering
  pueden desactivar festivos oficiales que no les apliquen (24/7).

### Integración fiscal crítica (Sprint 8)

- Helper nuevo `isBusinessDay(tenantId, date)` y
  `getEffectiveHolidays(tenantId, year)` en `lib/db/queries/catalogs.ts`.
- `generateFiscalReport()` ahora calcula `daysWithService` como días
  hábiles únicos con pedidos entregados (antes era placeholder=1).
- `ordersWithIssues` cuenta pedidos servidos en no-hábiles (fiscal red
  flag).
- `signatureHash` (SHA-256) incluye las nuevas métricas → cambios en
  festivos del tenant invalidan el hash previo.

### Cambiado

- `lib/auth/permissions.ts`: ~30 nuevos permisos añadidos bajo SUPER_ADMIN
  y `*:read` bajo AUDITOR. ADMIN_EMPRESA y ADMIN_CATERING ganan
  `branding:*`, `holidays:read/update`. ADMIN_CATERING añade
  `menu_templates:*`, `delivery_zones:*`.
- Layouts de los 3 portales (empresa/catering/empleado) aplican CSS
  vars de branding vía `BrandProvider` y leen `getEffectiveBranding()`
  (cae al default del sistema si el tenant no personaliza).

### Tests

- **+70 tests** respecto al baseline (121 total, 14 suites).
- Nuevos: `catalogs-validation` (18), `catalogs` queries (9),
  `billing-validation` (10), `compliance-validation` (10),
  `penalty-validation` (6), `maintenance-validation` (5),
  `ratelimit` (7), `branding` (6), `permissions-metadata` (6).
- Type-check limpio. 0 lint errors.

### Modelos Prisma añadidos

~25 modelos nuevos entre los 8 sprints: `Penalty`, `RetentionPolicy`,
`GdprRequest`, `DpaAgreement`, `SecurityCheck`, `SecurityReport`,
`SystemSettings`, `CommunicationTemplate`, `Announcement`, `ApiKey`,
`SsoConfig`, `PaymentProvider`, `ErpConfig`, `MaintenanceWindow`,
`BackupEvent`, `HealthCheckResult`, `SaasPlan`, `SaasInvoice`,
`Settlement`, `TaxRule`, `Allergen`, `Holiday`, `HolidayOverride`,
`MenuTemplate`, `DeliveryZone`, `IncidentReason`.

Migraciones gestionadas con el patrón `db push + migrate resolve` (el
user `comidas_dev_user` no tiene permisos de shadow DB).

### Limitaciones conscientes

- Conectores reales SSO/Stripe/ERP fuera de scope (solo UI).
- `FiscalReport.generatedBy = 'system'` pre-existente, sigue pendiente.
- `MenuTemplate.structure` usa strings de platos, no UUIDs (hasta que
  haya catálogo de `Dish` normalizado).

---

## 2026-04-18 — Estabilización + arquitectura de entornos

### Añadido
- **Arquitectura dev/prod formalizada**: BD `comidas_dev` y
  `comidas_prod` en la misma instancia Hetzner, con usuarios Postgres
  separados (`comidas_dev_user`, `comidas_prod_user`) y GRANT estricto
  como defensa anti-accidente.
- `docs/despliegue/ARQUITECTURA-ENTORNOS.md` con diagrama y reglas.
- `docs/despliegue/RUNBOOK.md` con 12 escenarios operativos copy-paste.
- `scripts/backup-prod.sh` para pg_dump nocturno con retención 30 días.
- `scripts/setup-prod-backups.md` con instrucciones cron one-time.
- Guardia por nombre de BD en `scripts/reset-db.sh` y
  `scripts/seed-staging.sh` (además de la existente por `NODE_ENV`).
- Scaffolding PM x10 completo:
  - `docs/PROJECT_KNOWLEDGE.md` (conocimiento vivo).
  - `docs/project-registry.md` (inventario técnico).
  - `docs/working-docs/` (artefactos por feature).
  - `tasks/todo.md`, `tasks/lessons.md`.
  - `memory/MEMORY.md` (memoria compartida entre sesiones Claude).
  - `qa-reports/`.
- Documentación humana completa en `docs/project-docs/` (este árbol).

### Cambiado
- `CLAUDE.md` extendido con secciones Navigation, Orchestration Rules,
  Commands PM x10 y reglas estrictas de entornos.
- `docs/ESTADO.md` convertido a redirect stub → `PROJECT_KNOWLEDGE.md`.
- Split de NextAuth config edge/node (`lib/auth/edge-config.ts` +
  `lib/auth/edge.ts`) para que `middleware.ts` no rompa por importar
  Prisma en edge runtime.

### Arreglado
- `middleware.ts` ya no rompe con `PrismaClient is not configured to run
  in Edge Runtime` — ahora usa solo el config edge-safe.
- `.env` apuntaba a BD `postgres` (del proyecto Impulse) por error.
  Corregido a `comidas_dev` con el usuario adecuado.

### Base de datos
- Migración `20260418000000_delivery_routes_invoice_expansion_dish_extras`
  aplicada en `comidas_dev`.
- Migración RLS (`20260419000000_enable_rls_multi_tenant`) aparcada en
  `prisma/migrations-parked/` hasta que las queries críticas usen
  `withTenantContext`.

---

## 2026-04 — 8 sprints de estabilización

Arreglos masivos de deuda técnica acumulada. Resumen:

### Añadido
- TypeScript strict en todo el proyecto (antes `ignoreBuildErrors: true`
  tapaba 600+ errores).
- Schema Prisma ampliado: nuevos modelos `DeliveryRoute`,
  `DeliveryRouteSite`, `DeliveryRouteEvent`; campos nuevos en
  `Invoice`, `Dish`; 2 nuevos enums, 11 nuevos valores.
- Helper `getScopedTenantId()` en `lib/auth/session.ts` — cierra los
  bypass cross-tenant de 5 rutas.
- Middleware dev de Prisma avisa queries multi-tenant sin filtro.
- `withTenantContext` para activación futura de RLS.
- `lib/crypto/pii.ts` con AES-256-GCM + tests.
- `lib/ratelimit.ts` con interfaz para swap a Upstash Redis.
- 51 unit tests Vitest (audit hash, permissions, scoped-tenant,
  pii-crypto, rate limit, diet-prefs, order-cutoff).
- CI green (`type-check` + `lint` + `vitest` + `build` + `audit`).

### Cambiado
- 3 archivos "zombis" (escritos contra schema imaginario) reescritos
  completamente: `catering-delivery.ts`, `catering-routes.ts`,
  `catering-invoices.ts`.
- `lib/tenant/get-tenant.ts` actualizado para Next 15 (`headers()` async).
- Zustand desinstalado (0 usos productivos).

### Arreglado
- 600+ errores TS ocultos por `ignoreBuildErrors`.
- 16 CVEs en dependencias (1 critical Next.js RCE, varias high en
  `@auth/core` y otras). Upgrade a Next 15.5.15.
- Cross-tenant bypass en 5 rutas de API.
- `logAudit` con timestamp en el hash (antes dos llamadas iguales
  generaban el mismo hash, ahora distintos).

### Rechazado / aparcado
- **Next 15 → 16**: requiere migrar Turbopack + rename
  `middleware.ts → proxy.ts`. Aparcado en branch dedicada.
- **Prisma 5 → 7**: `datasource.url` sale del schema + adapter. Aparcado.
- **@hookform/resolvers 3 → 5 (+ Zod 4)**: breaking changes en tipos de
  useForm. Aparcado.
- **ESLint 8 → 10**: flat config. Aparcado.
- **Tailwind 3 → 4**: cierra CVE `yaml` transitivo. Aparcado.

---

## 2025-11 — Primeras versiones de los 4 portales

Sprint inicial de desarrollo. Cuatro portales con funcionalidad base:

### Añadido
- **Auth multi-tenant con NextAuth v5**: JWT + impersonación 15 min
  auditada + RBAC 14 roles + ~50 permisos.
- **Portal Súper Admin** (90%): dashboard KPIs, CRUD
  tenants/empresas/caterings/users, wizard catering parcial.
- **Portal Empresa** (85%): dashboard, empleados CRUD, pedidos,
  facturación, incidencias, catering asignado, auditoría fiscal,
  configuración.
- **Portal Catering** (80%): platos CRUD, menús semanales, rutas de
  reparto, producción KDS, facturas mensuales, incidencias.
- **Portal Empleado** (75%): selector semanal, historial, perfil,
  incidencias.

### Stack definido
- Next.js 15 App Router + React 19 + TypeScript estricto.
- PostgreSQL + Prisma 5.
- NextAuth v5 con JWT.
- shadcn/ui + Radix + Tailwind + Framer Motion + Lucide.
- React Query (server) / Zustand descartado.
- Vitest + Playwright.
- Docker + Coolify en Hetzner.

---

## Convenciones para entradas futuras

Al cerrar una feature, hotfix o sprint, añadir aquí:

- **Fecha** (YYYY-MM-DD) o rango mensual.
- Sección **Añadido** con features nuevas.
- Sección **Cambiado** con modificaciones de comportamiento existente.
- Sección **Arreglado** con bugs resueltos.
- Sección **Eliminado** con features retiradas.
- Sección **Seguridad** si hubo parches de seguridad.

Enlaces a commits/PRs opcionales pero recomendados para auditoría.
