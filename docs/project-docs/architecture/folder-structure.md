# Estructura del repositorio

Este es el mapa del proyecto. Si buscas un archivo y no sabes dónde está,
probablemente está aquí.

```
comidas/
├── app/                          Next.js App Router
│   ├── (admin)/admin/           Portal Súper Admin (16 páginas)
│   ├── (auth)/                  Login/register/reset (5 páginas)
│   ├── (catering)/catering/     Portal Catering (14 páginas)
│   ├── (empleado)/empleado/     Portal Empleado (5 páginas)
│   ├── (empresa)/empresa/       Portal Empresa (11 páginas)
│   ├── (landing)/               Landing pública
│   ├── api/                     67 endpoints REST
│   ├── unauthorized/            Página de acceso denegado
│   ├── layout.tsx               Root layout (providers, toaster)
│   └── globals.css              Tailwind base + variables CSS
│
├── components/                   180+ componentes React
│   ├── ui/                      26 primitivos shadcn
│   ├── admin/                   Componentes del portal admin
│   ├── catering/                Componentes del portal catering
│   ├── empleado/                Componentes del portal empleado
│   ├── empresa/                 Componentes del portal empresa
│   ├── shared/                  Compartidos (EmployeeFormComplete, …)
│   ├── ImpersonationBanner.tsx  Banner naranja de impersonación
│   ├── LogoutButton.tsx         Botón de logout
│   └── providers.tsx            React Query, Toaster, etc.
│
├── hooks/                        Custom hooks
│   ├── use-auth.ts
│   ├── use-tenant.ts
│   ├── use-impersonation.ts
│   └── use-pagination.ts
│
├── lib/                          Lógica de infraestructura y dominio
│   ├── auth/                    Auth + RBAC + impersonación + audit
│   │   ├── config.ts            Configuración NextAuth completa
│   │   ├── index.ts             Instancia y exports principales
│   │   ├── edge-config.ts       Config edge-safe
│   │   ├── edge.ts              Instancia edge-safe (solo middleware)
│   │   ├── session.ts           Helpers (getRequiredSession, requireRole, getScopedTenantId)
│   │   ├── permissions.ts       Matriz roles → permisos (PERMISSIONS, hasPermission)
│   │   ├── audit.ts             logAudit, logLogin, logImpersonation
│   │   ├── impersonation.ts     Sistema de impersonación (start/stop/validar)
│   │   ├── get-tenant.ts        Lee headers del middleware
│   │   └── IMPERSONATION.md     Doc extendida del módulo
│   │
│   ├── crypto/
│   │   └── pii.ts               AES-256-GCM (encryptPII, decryptPII, looksEncrypted)
│   │
│   ├── db/                      Capa de acceso a datos
│   │   ├── prisma.ts            Singleton + middleware dev + withTenantContext
│   │   ├── index.ts             Re-exports + tipos Prisma
│   │   └── queries/             Una función por operación
│   │       ├── admin-dashboard.ts
│   │       ├── catering-dashboard.ts
│   │       ├── catering-delivery.ts
│   │       ├── catering-dishes.ts
│   │       ├── catering-incidencias.ts
│   │       ├── catering-invoices.ts
│   │       ├── catering-menus.ts
│   │       ├── catering-production.ts
│   │       ├── catering-routes.ts
│   │       ├── caterings.ts
│   │       ├── companies.ts
│   │       ├── empleado-historial.ts
│   │       ├── empleado-incidencias.ts
│   │       ├── empleado-menus.ts
│   │       ├── empleado-perfil.ts
│   │       ├── empresa-actividad.ts
│   │       ├── empresa-auditoria.ts
│   │       ├── empresa-catering.ts
│   │       ├── empresa-configuracion.ts
│   │       ├── empresa-dashboard.ts
│   │       ├── empresa-empleados.ts
│   │       ├── empresa-facturacion.ts
│   │       ├── empresa-incidencias.ts
│   │       ├── empresa-pedidos.ts
│   │       └── tenants.ts
│   │
│   ├── guards/                  Guards para SC y API
│   │   ├── api.ts               requireAuth, requireRoles, withAuth, withRoles
│   │   ├── PermissionGuard.tsx  HOC para Server Components
│   │   ├── RoleGuard.tsx
│   │   └── index.ts
│   │
│   ├── middleware/              Helpers del middleware edge
│   │   ├── headers.ts           Lee x-tenant-id, x-tenant-type de headers
│   │   └── tenant.ts            Resolución subdomain → tenant (con cache)
│   │
│   ├── tenant/
│   │   └── get-tenant.ts        getCurrentTenant() cacheado
│   │
│   ├── types/
│   │   └── diet-prefs.ts        Schema Zod + tipos de preferencias dietéticas
│   │
│   ├── validations/             Schemas Zod por dominio
│   │   ├── company.ts
│   │   ├── delivery.ts
│   │   ├── dish.ts
│   │   ├── invoice.ts
│   │   ├── menu.ts
│   │   ├── production.ts
│   │   └── tenant.ts
│   │
│   ├── env.ts                   Validación Zod de variables entorno
│   ├── ratelimit.ts             Rate limiters in-memory
│   └── utils.ts                 Utilidades genéricas (cn, formatters, dates)
│
├── prisma/
│   ├── schema.prisma            ★ Fuente de verdad de datos
│   ├── migrations/              Migraciones SQL versionadas
│   │   ├── 20250117000000_company_portal_tables/
│   │   ├── 20251117000000_company_enhancements/
│   │   ├── 20260418000000_delivery_routes_invoice_expansion_dish_extras/
│   │   └── migration_lock.toml
│   ├── migrations-parked/       Migraciones preparadas pero no aplicadas
│   │   ├── 20260419000000_enable_rls_multi_tenant/
│   │   └── README.md            Explica por qué están aparcadas
│   ├── seed.ts                  Seed principal (idempotente)
│   ├── seed-companies.ts        5 empresas + 100+ empleados
│   └── seed-caterings.ts        5 caterings
│
├── scripts/                      Scripts operativos
│   ├── reset-db.sh              Reset dev (guardia NODE_ENV + nombre BD)
│   ├── seed-staging.sh          Seed staging (con confirmación)
│   ├── backup-prod.sh           Backup nocturno de comidas_prod
│   ├── setup-prod-backups.md    Instrucciones una-vez del cron
│   └── migrate-pii-encryption.ts  Migrar campos PII a cifrado AES-GCM
│
├── tests/
│   ├── setup.ts                 Setup de Vitest (mocks, globals)
│   ├── unit/                    Tests unitarios
│   │   ├── auth/
│   │   │   ├── audit.test.ts
│   │   │   ├── permissions.test.ts
│   │   │   └── scoped-tenant.test.ts
│   │   ├── lib/
│   │   │   ├── diet-prefs.test.ts
│   │   │   ├── pii-crypto.test.ts
│   │   │   └── ratelimit.test.ts
│   │   └── queries/
│   │       └── order-cutoff.test.ts
│   └── e2e/                     Playwright E2E (pendiente de ampliar)
│
├── e2e/                          Tests E2E adicionales
│
├── docs/                         Documentación
│   ├── PROJECT_KNOWLEDGE.md     Conocimiento vivo (breve, siempre cargado por Claude)
│   ├── project-registry.md      Inventario técnico
│   ├── ESTADO.md                Redirect a PROJECT_KNOWLEDGE
│   ├── prd.md                   Product Requirements Document
│   ├── arquitectura/            Modelo de datos, interconexiones (histórico)
│   ├── desarrollo/              Setup, credenciales, UI guidelines (histórico)
│   ├── despliegue/
│   │   ├── ARQUITECTURA-ENTORNOS.md   ★ Diagrama dev/prod
│   │   └── RUNBOOK.md                  ★ 12 escenarios operativos
│   ├── diagnostico/             Informes críticos (producción, diag 2026-04)
│   ├── qa/                      Docs de QA y testing
│   ├── archive/                 Histórico (fases completadas, fixes antiguos)
│   ├── working-docs/            Artefactos por feature (PRDs, JTBDs, …)
│   └── project-docs/            ★ Esta documentación (referencia humana)
│
├── tasks/
│   ├── todo.md                  Sprint plan actual
│   └── lessons.md               Lessons learned
│
├── memory/
│   └── MEMORY.md                Memoria compartida entre sesiones Claude
│
├── qa-reports/                   Audit trail de QA
│
├── public/                       Assets estáticos
│
├── middleware.ts                 ★ Edge middleware (tenant resolution + auth)
├── next.config.ts                Configuración Next.js (CSP, HSTS, typedRoutes)
├── tailwind.config.ts            Tailwind (theme, plugins)
├── tsconfig.json                 TypeScript strict
├── eslint.config.mjs             ESLint 8 config
├── vitest.config.ts              Vitest (jsdom, alias, coverage)
├── playwright.config.ts          Playwright (browsers, baseURL)
├── package.json                  ★ Scripts y dependencias
├── pnpm-lock.yaml
├── Dockerfile                    Multi-stage (deps → builder → runner)
├── docker-entrypoint.sh          Arranque: prisma migrate deploy + next start
├── .env                          ★ Variables local (NO commit)
├── env.example                   ★ Template de variables
├── CLAUDE.md                     ★ Reglas para Claude Code
├── .cursorrules                  Reglas para Cursor IDE
└── README.md
```

## Archivos que leo primero cuando vuelvo

En este orden:

1. **`docs/PROJECT_KNOWLEDGE.md`** — estado actual, decisiones, tech debt.
2. **`CLAUDE.md`** — reglas y contexto de trabajo.
3. **`tasks/todo.md`** — qué hay en vuelo.
4. **`tasks/lessons.md`** — errores del pasado a no repetir.
5. Este documento (`docs/project-docs/`) si necesito más profundidad.

## Archivos que son fuente de verdad

- **Datos**: `prisma/schema.prisma`. Si el schema y el código discrepan,
  el schema gana.
- **Reglas de negocio**: `lib/auth/permissions.ts` (quién puede qué) y
  `lib/validations/*` (qué es un input válido).
- **Entornos**: `docs/despliegue/ARQUITECTURA-ENTORNOS.md` (qué apunta a
  qué) y `docs/despliegue/RUNBOOK.md` (cómo operar).
- **Operación**: `scripts/*.sh` con sus guardias anti-prod.

## Convenciones de naming

- **Archivos TS/TSX**: kebab-case (`order-cutoff.test.ts`, `reset-db.sh`)
  o PascalCase si son componentes (`DishForm.tsx`, `KitchenDisplay.tsx`).
- **Componentes**: PascalCase, nombre descriptivo (`EmployeesTable`,
  `DeliveryRouteView`).
- **Queries**: `getXxx()`, `createXxx()`, `updateXxx()`, `deleteXxx()`.
- **Server Actions**: `<verb><Thing>Action()` (`createDishAction`,
  `confirmDeliveryAction`).
- **Validaciones Zod**: `<thing>Schema`, inferred type con `z.infer<typeof xxx>`.
- **Modelos Prisma**: PascalCase singular (`Order`, no `Orders`).
- **Tablas en BD**: snake_case plural (Prisma lo hace automático:
  `Order` → `orders`).

## Qué NO está en el repo

- **Node modules**: `node_modules/` gitignored.
- **Builds**: `.next/` gitignored.
- **Env files reales**: `.env`, `.env.local`, etc. gitignored.
- **Backups**: viven en el servidor, no en git.
- **Secrets de prod**: en Coolify Secret Manager.
- **Databases**: obviamente no.
