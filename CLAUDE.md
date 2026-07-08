# CLAUDE.md — reglas y contexto para Claude Code

Este archivo es la **fuente de verdad** de cómo trabajar en este proyecto. Las
reglas de estilo y arquitectura técnica viven en [`.cursorrules`](./.cursorrules);
este documento añade el contexto operativo, los entornos y el sistema de
gestión PM x10 (estructura V3).

## Qué es el proyecto

SaaS multi-tenant para gestionar el beneficio de comida corporativa entre
empresas, empleados y caterings, con compliance fiscal IRPF (≤11€/día).
Ver [`docs/producto/prd.md`](./docs/producto/prd.md) para la spec funcional.

Stack (no negociable): Next.js 15 App Router · React 19 · TypeScript estricto ·
PostgreSQL · Prisma 5 · NextAuth v5 · shadcn/ui · Tailwind · Zod · React Query ·
Vitest + Playwright · Docker en Coolify.

## Navigation (estructura V3 — "cerebro digital del proyecto")

### Global (en `~/.claude/`)
Sistema PM x10 instalado con agentes, skills, reglas y comandos globales.

### Proyecto (este repo)

**Conocimiento transversal — `docs/general/`:**
- **[`docs/general/PROJECT_KNOWLEDGE.md`](./docs/general/PROJECT_KNOWLEDGE.md)** — conocimiento vivo. **LEE ESTO PRIMERO** cuando vuelvas tras una pausa.
- **[`docs/general/project-registry.md`](./docs/general/project-registry.md)** — inventario técnico (tablas, APIs, componentes, servicios).
- **[`docs/general/despliegue/ARQUITECTURA-ENTORNOS.md`](./docs/general/despliegue/ARQUITECTURA-ENTORNOS.md)** — diagrama y reglas de dev/prod.
- **[`docs/general/despliegue/RUNBOOK.md`](./docs/general/despliegue/RUNBOOK.md)** — comandos copy-paste por escenario operativo.
- `docs/general/arquitectura/` · `docs/general/desarrollo/` · `docs/general/diagnostico/` · `docs/general/qa/` — referencia técnica.
- `docs/general/exportable/` — documentación exportable (output de `/docs`, Docusaurus, etc.).
- `docs/general/archive/` — histórico (fases completadas, fixes antiguos).
- `docs/general/wiki/` — wiki transversal de empresa (mantenida por `/wiki`).

**Área Producto — `docs/producto/`:**
- **[`docs/producto/sprint.md`](./docs/producto/sprint.md)** — sprint plan y progreso actual.
- **[`docs/producto/lessons.md`](./docs/producto/lessons.md)** — patrones a seguir y errores a evitar.
- **[`docs/producto/qa.md`](./docs/producto/qa.md)** — audit trail de QA y reviews (append-only).
- **[`docs/producto/inbox.md`](./docs/producto/inbox.md)** — buzón de ideas (procesa `/pm inbox`).
- **[`docs/producto/prd.md`](./docs/producto/prd.md)** — spec funcional del producto.
- `docs/producto/features/<feature>/` — artefactos por feature (research, stories, jtbds, prd, architecture).

**Estado del PM y memoria:**
- **[`memory/MEMORY.md`](./memory/MEMORY.md)** — observaciones acumuladas entre sesiones.
- `pm/config.json` · `pm/tasks.json` · `pm/events.jsonl` — estado operativo del PM (**no editar a mano**, lo gestiona `/pm`).
- `dashboard/` — UI visual del PM. Arrancar: `python3 dashboard/bridge.py` → http://localhost:7700
- `raw/` — fuentes brutas de la wiki (artículos, reuniones, notas, transcripciones).

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
[`docs/general/despliegue/ARQUITECTURA-ENTORNOS.md`](./docs/general/despliegue/ARQUITECTURA-ENTORNOS.md).

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
2. Escribir el plan en `docs/producto/sprint.md` antes de ejecutar.
3. Hacer commit tras cada story completada (`/save`).
4. `/review` tras completar features (tests + QA + pregunta sobre docs).
5. Consultar `docs/producto/lessons.md` al arrancar cada sesión.
6. Leer `memory/MEMORY.md` para patrones detectados en sesiones previas.
7. Guardar artefactos en `docs/producto/features/<feature>/` organizados por
   feature.

## Available Commands (slash commands PM x10)

| Comando | Qué hace |
|---|---|
| `/pm` | PM de Producto: índice + buzón + dossiers. Modos: `sync`, `inbox`, `next`, `status`, `prioritize`, `block`, `unblock`, `done`, `cancel`, `dossier` |
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
| `/docs` | Generar/actualizar documentación de proyecto (output en `docs/general/exportable/`) |
| `/wiki` | Wiki transversal de empresa (ingestar, anotar, reunión, nota, vincular, revisar) |
| `/learned` | Guardar un aprendizaje en cualquier momento |
| `/new-project` | Inicializar/actualizar estructura PM x10 en un repo |

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
18 ficheros de test, ~160 tests, todas verdes. Objetivo de cobertura en
`vitest.config.ts` al 70% (aspirational, no bloqueante).

## Comandos que uso habitualmente

```bash
pnpm type-check          # TS estricto
pnpm lint                # ESLint
pnpm exec vitest run     # Unit tests
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
  (admin)/ (auth)/ (catering)/ (empleado)/ (empresa)/ (landing)/
  api/                 API routes (REST)
components/            ui/ (shadcn) + admin/ empresa/ catering/ empleado/ marketing/ shared/
hooks/                 use-auth, use-tenant, use-impersonation, etc.
lib/
  auth/ db/ crypto/ guards/ middleware/ tenant/ types/ validations/
prisma/
  schema.prisma        Modelo de datos (fuente de verdad)
  migrations/          Migraciones Prisma estándar
  seed*.ts             Seeds idempotentes
scripts/               reset-db.sh, seed-staging.sh, backup-prod.sh, ... (con guardias)
tests/                 unit/ (Vitest) · e2e/ (Playwright)

docs/                  ── ESTRUCTURA V3 ──
  general/             Conocimiento transversal
    PROJECT_KNOWLEDGE.md   Conocimiento vivo (leer primero)
    project-registry.md    Inventario técnico
    arquitectura/ desarrollo/ despliegue/ diagnostico/ qa/
    exportable/            Docs exportables (/docs)
    archive/               Histórico
    wiki/                  Wiki de empresa (/wiki)
  producto/            Área Producto (PM)
    prd.md  sprint.md  lessons.md  qa.md  inbox.md
    features/<feature>/    Artefactos por feature
  marketing/ rrhh/ operaciones/   Áreas preparadas (inactivas)
pm/                    Estado del PM (config.json, tasks.json, events.jsonl) — no editar a mano
dashboard/             Dashboard PM x10 (python3 dashboard/bridge.py → :7700)
raw/                   Fuentes brutas de la wiki
memory/MEMORY.md       Observaciones entre sesiones
```

## Quiero que me avises si…

- Encuentras un `tenantId` no validado en una ruta `/api/*`.
- Una query usa `prisma.X.findUnique({ where: { id }})` sin tenant filter
  en un modelo multi-tenant.
- Un campo PII aparece en logs o en respuestas JSON sin cifrar.
- Una mutación que debería ser Server Action está como API route + fetch del
  cliente.
- Una **sección o acción nueva no pública** se controla con `if (role === 'X')`
  en vez de con un permiso del catálogo RBAC (`permittedAction` / `recurso:view`).
  Ver [`docs/general/desarrollo/RBAC-PERMISOS.md`](./docs/general/desarrollo/RBAC-PERMISOS.md).
- La `DATABASE_URL` apunta a una BD con `prod` en el nombre y voy a ejecutar
  algo destructivo.

## Flujo para features nuevas

1. Cambios de schema → `pnpm db:migrate:dev --name <descriptivo>` → genera
   migración en formato estándar.
2. Queries nuevas → `lib/db/queries/<dominio>.ts`, una función por operación,
   filtro tenant siempre.
3. Page → Server Component por defecto; interactividad → sub-componente client.
4. Mutación → Server Action en `components/<portal>/<feature>/actions.ts`.
5. **Permisos (obligatorio):** toda sección/acción no pública se controla con el
   RBAC, no con `if (role === 'X')`. Declara el permiso `recurso:accion` en
   [`lib/auth/permission-catalog.ts`](./lib/auth/permission-catalog.ts), siémbralo
   (`pnpm tsx prisma/seed-rbac.ts`), cablea la sección (sidebar + regla en
   [`lib/auth/section-permissions.ts`](./lib/auth/section-permissions.ts)) y
   protege la acción con `permittedAction(...)`. **Checklist completo:**
   [`docs/general/desarrollo/RBAC-PERMISOS.md`](./docs/general/desarrollo/RBAC-PERMISOS.md).
6. Tests → unit en `tests/unit/...`, E2E solo si el flujo cruza procesos.
7. Artefactos de la feature → `docs/producto/features/<feature>/`.

## Core Principle

**Analysis Informs, Never Blocks.** Los agentes identifican riesgos. El PM
siempre decide.
