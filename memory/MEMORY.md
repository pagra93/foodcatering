# Working Memory — comidas-plataforma

Memoria de proyecto compartida entre sesiones Claude. Complementa la memoria
persistente privada en `~/.claude/projects/.../memory/` (esa es per-user;
esta vive en el repo y se comparte).

Last updated: 2026-04-18

## Project Patterns

### Arquitectura
- **Server Components por defecto.** Las pages son `async` y llaman directamente a query functions de `lib/db/queries/*`. Client components solo para interactividad.
- **Mutaciones → Server Actions** en `components/<portal>/<feature>/actions.ts`. No `fetch('/api/...')` desde el cliente salvo que el endpoint sea para terceros.
- **Queries Prisma** siempre con filtro explícito por tenant (`tenantId`, `tenantEmpresa` o `tenantCatering` según el modelo). Una función por operación en `lib/db/queries/<dominio>.ts`.
- **Forms:** React Hook Form + Zod resolver. Validación en `lib/validations/<dominio>.ts`.
- **Auth:** NextAuth v5 JWT. Sessión enriquecida con `role`, `tenantId`, `tenantType`, `impersonationToken`. Ver `lib/auth/config.ts`.
- **RBAC:** 14 roles con permisos wildcards (`tenants:*` incluye `tenants:read`, etc.). Matriz en `lib/auth/permissions.ts`.
- **Audit log:** SHA-256 con el timestamp incorporado. Ver `lib/auth/audit.ts`.

### Convenciones
- TypeScript estricto (todos los flags). El build rompe si hay errores.
- Tailwind + shadcn/ui + Lucide para UI.
- Tests unit con Vitest en `tests/unit/<dominio>/`.
- Lint con ESLint + Prettier + plugin tailwindcss.
- Commits tipo `feat/fix/refactor/docs/test/chore: <descripción>`.

### Esquema multi-tenant
- `Tenant` (tipo: ROOT, EMPRESA, CATERING) + `Company` o `Restaurant` 1:1.
- Tenants con subdominio único para routing.
- Usuarios vinculados a 1 tenant; empleados (Employee) vinculados a User + CompanySite.
- Orders, Incidents, Invoices llevan doble campo `tenantEmpresa + tenantCatering` porque cruzan dos tenants.

## Recurring Issues

(Vacío — se populará con patrones detectados en QA / reviews.)

## Recent Decisions

- **2026-04-18:** 8 sprints de estabilización cerrados. Base limpia: 0
  errores TS, 0 errores lint, 51 tests verdes, build verde, 0 CVEs críticos.
- **2026-04-18:** Dev remoto en `comidas_dev` (Hetzner, misma instancia
  que prod). Elección explícita del user para no instalar Docker en
  laptop.
- **2026-04-18:** Staging aplazado hasta tener clientes reales. Cuando
  llegue el momento → `staging.plati.es` + `comidas_staging` + rama
  `release` para prod.
- **2026-04-18:** Scaffolding PM x10 instalado (tasks/, memory/,
  qa-reports/, working-docs/, PROJECT_KNOWLEDGE.md,
  project-registry.md).
- **2026-04-18:** Rollbacks documentados: Next 15→16, Prisma 5→7,
  `@hookform/resolvers` 3→5, `@vitejs/plugin-react` 4→6 — todos en
  branches dedicadas para el futuro.

## Open Questions

Ninguna abierta. La próxima decisión viene cuando se aplique la Fase A del
plan de entornos (crear `comidas_dev` en servidor) — ver `tasks/todo.md`.

## Pointers

- **Runbook operativo:** `docs/despliegue/RUNBOOK.md`
- **Arquitectura de entornos:** `docs/despliegue/ARQUITECTURA-ENTORNOS.md`
- **Conocimiento vivo:** `docs/PROJECT_KNOWLEDGE.md`
- **Inventario técnico:** `docs/project-registry.md`
- **Lessons learned:** `tasks/lessons.md`
- **Reglas de trabajo (para Claude):** `CLAUDE.md` + `.cursorrules`
