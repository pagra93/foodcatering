# CLAUDE.md — reglas y contexto para Claude Code

Este archivo es la **fuente de verdad** de cómo trabajar en este proyecto. Las
reglas de estilo y arquitectura técnica viven en [`.cursorrules`](./.cursorrules);
este documento añade el contexto operativo, los entornos y el sistema de
gestión PM x10.

## Qué es el proyecto

SaaS multi-tenant para gestionar el beneficio de comida corporativa entre
empresas, empleados y caterings, con compliance fiscal IRPF (≤11€/día).
Ver [`docs/prd.md`](./docs/prd.md) para la spec funcional.

Stack (no negociable): Next.js 15 App Router · React 19 · TypeScript estricto ·
PostgreSQL · Prisma 5 · NextAuth v5 · shadcn/ui · Tailwind · Zod · React Query ·
Vitest + Playwright · Docker en Coolify.

## Navigation

### Global (en `~/.claude/`)
Sistema PM x10 instalado con agentes, skills, reglas y comandos globales.

### Proyecto (este repo)
- **[`docs/PROJECT_KNOWLEDGE.md`](./docs/PROJECT_KNOWLEDGE.md)** — conocimiento vivo del proyecto. **LEE ESTO PRIMERO** cuando vuelvas tras una pausa.
- **[`docs/project-registry.md`](./docs/project-registry.md)** — inventario técnico (tablas, APIs, componentes, servicios).
- **[`docs/working-docs/`](./docs/working-docs/)** — artefactos por feature (PRDs, JTBDs, stories, arquitectura).
- **[`docs/despliegue/ARQUITECTURA-ENTORNOS.md`](./docs/despliegue/ARQUITECTURA-ENTORNOS.md)** — diagrama y reglas de dev/prod.
- **[`docs/despliegue/RUNBOOK.md`](./docs/despliegue/RUNBOOK.md)** — comandos copy-paste por escenario operativo.
- **[`tasks/todo.md`](./tasks/todo.md)** — sprint plan y progreso actual.
- **[`tasks/lessons.md`](./tasks/lessons.md)** — patrones a seguir y errores a evitar.
- **[`memory/MEMORY.md`](./memory/MEMORY.md)** — observaciones acumuladas entre sesiones.
- **[`qa-reports/`](./qa-reports/)** — audit trail de QA y reviews.

## Cómo trabajo con este código

1. **El schema Prisma es la fuente de verdad de los datos.** Si el código
   referencia un campo inexistente, el arreglo es alinear el código con el
   schema (o ampliar el schema si falta una feature real) — **nunca** `as any`
   ni stubs silenciosos.
2. **Nada de `@ts-ignore`, `as any`, `eslint-disable` por conveniencia.** El
   build corre con strict TS y ESLint; ambos deben pasar limpios.
3. **Siempre filtrar por tenant.** Todas las queries sobre modelos
   multi-tenant filtran por `tenantId` / `tenantEmpresa` / `tenantCatering`
   salvo que el rol sea `SUPER_ADMIN` (ver `lib/auth/session.ts#getScopedTenantId`).
4. **Mutaciones desde pages → Server Actions**, no `fetch('/api/...')` desde el
   cliente. Las API routes quedan para callers externos (mobile, integraciones).
5. **Lee la rama actual y el estado de git antes de proponer cambios grandes.**
   No amendes commits existentes sin permiso explícito.

## Reglas de entornos (CRÍTICAS)

Arquitectura: dev local apunta a BD `comidas_dev` en Hetzner; prod (Coolify) a
`comidas_prod` en el mismo Postgres. Ver
[`docs/despliegue/ARQUITECTURA-ENTORNOS.md`](./docs/despliegue/ARQUITECTURA-ENTORNOS.md).

Defensas: usuarios Postgres separados con GRANT estricto + guardia por nombre
en scripts destructivos + guardia `NODE_ENV=production`.

**Claude debe**:

- Verificar el valor de `DATABASE_URL` antes de cualquier comando que escriba
  en BD. Si el nombre de BD contiene `prod`, **parar y pedir confirmación
  explícita** al usuario antes de ejecutar nada.
- Nunca ejecutar `pnpm db:seed`, `pnpm prisma migrate reset`, `pnpm prisma db
  push --accept-data-loss` contra una BD de producción bajo ninguna
  circunstancia.
- Prefer siempre `pnpm prisma migrate deploy` (no-destructivo, idempotente)
  sobre `db push` (destructivo).
- Consultar el RUNBOOK antes de improvisar comandos operativos.

## Orchestration Rules (PM x10)

1. Empezar toda tarea no-trivial (>3 pasos) en plan mode.
2. Escribir el plan en `tasks/todo.md` antes de ejecutar.
3. Hacer commit tras cada story completada (`/save`).
4. `/review` tras completar features (tests + QA + pregunta sobre docs).
5. Consultar `tasks/lessons.md` al arrancar cada sesión.
6. Leer `memory/MEMORY.md` para patrones detectados en sesiones previas.
7. Guardar artefactos en `docs/working-docs/<feature>/` organizados por
   feature.

## Available Commands (slash commands PM x10)

| Comando | Qué hace |
|---|---|
| `/analyze` | Evaluar problema/PRD (Quality Guard + Research) |
| `/define` | Crear JTBDs + stories (con quality review) |
| `/plan` | Arquitectura + sprint plan |
| `/story` | Construir story desde una idea (sin PRD, agente autónomo) |
| `/build` | Implementar stories (Claude Code directamente) |
| `/save` | Commit + push a GitHub (valida rama, detecta secrets) |
| `/review` | Pipeline QA + docs de feature (siempre pregunta sobre documentación) |
| `/hotfix` | Bug fix con learning (solo guarda cuando PM confirma resuelto) |
| `/code-review` | Solo code review |
| `/design-to-prd` | Diseños Pencil → PRDs por feature (análisis 6 capas) |
| `/unknown-unknowns` | Detectar riesgos ocultos (8 dimensiones) |
| `/docs` | Generar/actualizar documentación de proyecto |
| `/learned` | Guardar un aprendizaje en cualquier momento (bug resuelto, descubrimiento, error) |
| `/new-project` | Inicializar estructura PM x10 en un repo |

Para tareas pequeñas (<30s) no hace falta comando: pregunta directamente.

Para features completas: `/analyze` → `/define` → `/plan` → `/build` → `/save`
→ `/review`. Si tienes diseños Pencil: empieza con `/design-to-prd`.

## Testing

### Framework
- **Vitest** (unit/integration) con jsdom, setup en `tests/setup.ts`.
- **Playwright** (E2E) configurado en `playwright.config.ts`.

### Ubicación
- Unit/integration: `tests/unit/<dominio>/`.
- E2E: `tests/e2e/` y `e2e/`.

### Comandos
```bash
pnpm exec vitest run      # una pasada (CI)
pnpm test                 # watch mode (desarrollo)
pnpm test:ui              # Vitest UI
pnpm test:e2e             # Playwright
```

### Estado
Hoy: 6 suites, 51 tests, todas verdes. Objetivo de cobertura en
`vitest.config.ts` está al 70% (aspirational, no bloqueante).

## Comandos que uso habitualmente

```bash
pnpm type-check          # TS estricto
pnpm lint                # ESLint
pnpm exec vitest run     # Unit tests (6 suites, 51 tests)
pnpm test:e2e            # Playwright E2E
pnpm build               # build producción
pnpm dev                 # dev server
pnpm db:generate         # regenerar cliente Prisma tras cambios de schema
pnpm db:migrate          # prisma migrate deploy (solo ejecuta pendientes)
pnpm db:migrate:dev      # crear nueva migración en dev
pnpm db:reset            # reset dev completo (con guardia anti-prod)
pnpm db:studio           # Prisma Studio
pnpm db:seed             # seeds idempotentes
pnpm audit --prod        # auditoría de CVEs
```

## Decisiones importantes pendientes (sprint dedicado)

Estos upgrades rompen y necesitan una rama específica:

- **Next 15 → 16**: migrar `experimental.typedRoutes` a raíz, renombrar
  `middleware.ts` → `proxy.ts`, configurar Turbopack (default en 16).
- **Prisma 5 → 7**: `datasource.url` sale del schema, va a `prisma.config.ts`
  con `adapter` en el `PrismaClient`.
- **@hookform/resolvers 3 → 5**: compat con Zod v4, breaking en tipos de
  `useForm` con schemas que llevan `.default()` o `.transform()`.
- **ESLint 8 → 10**: migración a flat config.

## Dónde vive cada cosa

```
app/                   Next.js App Router — pages + API routes
  (admin)/             Portal super admin
  (auth)/              Login / register / reset password
  (catering)/          Portal catering
  (empleado)/          Portal empleado
  (empresa)/           Portal empresa
  (landing)/           Landing pública
  api/                 API routes (REST)
components/
  ui/                  shadcn primitives
  admin/ empresa/ catering/ empleado/ shared/
hooks/                 use-auth, use-tenant, use-impersonation, use-pagination, etc.
lib/
  auth/                NextAuth config, session helpers, impersonation, audit, RBAC
  db/                  Prisma client + query functions por dominio
  crypto/              PII cipher (AES-256-GCM)
  guards/              Auth guards (API + Server Component)
  middleware/          Helpers middleware (tenant resolution, headers)
  tenant/              get-tenant desde headers
  types/               Tipos compartidos (DietPrefs, etc.)
  validations/         Esquemas Zod
prisma/
  schema.prisma        Modelo de datos (fuente de verdad)
  migrations/          Migraciones Prisma en formato estándar
  seed.ts              Seed principal (idempotente)
  seed-companies.ts    Seed con 5 empresas + 100+ empleados
  seed-caterings.ts    Seed con 5 caterings
scripts/
  reset-db.sh          Reset dev (guardia NODE_ENV + nombre BD)
  seed-staging.sh      Seed staging (confirmación + guardia)
  backup-prod.sh       Backup nocturno de comidas_prod (cron en servidor)
  migrate-pii-encryption.ts   Migración PII → cifrado AES-256-GCM
tests/
  unit/                Vitest
  e2e/                 Playwright
docs/
  PROJECT_KNOWLEDGE.md Conocimiento vivo (leer primero)
  project-registry.md  Inventario técnico
  prd.md               Spec funcional
  despliegue/          Arquitectura + runbook operativo
  arquitectura/        Modelo de datos, interconexiones
  desarrollo/          Setup, credenciales, UI guidelines
  qa/                  QA testing docs
  diagnostico/         Informes críticos (producción, diagnóstico exhaustivo)
  working-docs/        Artefactos por feature (creados por /analyze, /define, /plan)
  archive/             Histórico (fases completadas, fixes antiguos)
tasks/
  todo.md              Sprint plan actual
  lessons.md           Lessons learned
memory/
  MEMORY.md            Observaciones acumuladas entre sesiones
qa-reports/            Audit trail de QA
```

## Quiero que me avises si…

- Encuentras un `tenantId` no validado en una ruta `/api/*`.
- Una query usa `prisma.X.findUnique({ where: { id }})` sin tenant filter
  en un modelo multi-tenant (el middleware dev lo avisa en consola, pero hay
  que revisar los hallazgos).
- Un campo PII aparece en logs o en respuestas JSON sin cifrar.
- Una mutación que debería ser Server Action está como API route + fetch del
  cliente.
- La `DATABASE_URL` apunta a una BD con `prod` en el nombre y voy a ejecutar
  algo destructivo.

## Flujo para features nuevas

1. Cambios de schema → `pnpm db:migrate:dev --name <descriptivo>` → genera
   migración en formato estándar.
2. Queries nuevas → `lib/db/queries/<dominio>.ts`, una función por operación,
   filtro tenant siempre.
3. Page → Server Component por defecto; interactividad → sub-componente client.
4. Mutación → Server Action en `components/<portal>/<feature>/actions.ts`.
5. Tests → unit en `tests/unit/...`, E2E solo si el flujo cruza procesos.

## Core Principle

**Analysis Informs, Never Blocks.** Los agentes identifican riesgos. El PM
siempre decide.
