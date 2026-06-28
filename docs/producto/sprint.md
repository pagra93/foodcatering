# Sprint — comidas-plataforma

Status: **DEV OPERATIVO · REBRAND PLATI EN MAIN · PROD PENDIENTE**
Last updated: 2026-06-28

> El backlog vivo (Fase B + deuda técnica) está indexado por el PM en
> `pm/tasks.json` (procesado desde `inbox.md`). Esta página queda como
> resumen narrativo de fases.

## ✅ Completed

- Sprints 0-7: estabilización completa (TS strict activo, schema ampliado, 3
  zombis reescritos, cross-tenant bypass cerrado, CVEs críticos parcheados,
  migraciones estándar, seeds idempotentes, CI activo, PII crypto + rate
  limit + RLS preparados, 5 páginas catering refactorizadas a Server
  Components, 51 unit tests).
- Sprint 8.1: docs reorganizados (74 archivos → `archive/`, estructura por
  tema).
- Arquitectura de entornos documentada (`docs/general/despliegue/ARQUITECTURA-ENTORNOS.md`).
- Runbook operativo (`docs/general/despliegue/RUNBOOK.md` — 12 escenarios).
- Scripts con guardias (`backup-prod.sh`, `reset-db.sh` y
  `seed-staging.sh` con protección por nombre de BD).
- PM x10 scaffolding instalado; **migración a estructura V3 completada** (docs
  reorganizados en `general`/`producto`, CLAUDE.md V3, dashboard PM activo).
- **Fase A — entorno dev operativo**: BD `comidas_dev` con usuarios separados,
  `.env` apuntando a dev, migraciones aplicadas, `pnpm db:seed` ejecutado
  (235 usuarios, datos demo), `pnpm dev` levanta y los portales cargan.
- **Rebrand Plati** (sintupper → plati.es) y **reescritura completa de la
  landing** (copy, conversión, legal, calculadora) mergeados a `main`.

## ⏭️ Next — Fase B: alinear prod

- [ ] Drop + create `comidas_prod` (vacía actualmente, sin riesgo).
- [ ] Resolver problemas de Coolify (env vars + DNS) según
      `docs/general/diagnostico/INFORME-PROBLEMAS-PRODUCCION-PLATI.md`.
- [ ] Push del código nuevo → Coolify rebuild → `prisma migrate deploy`
      automático aplica schema a `comidas_prod`.
- [ ] Verificar `plati.es` responde.
- [ ] Configurar cron de backups automáticos
      (`scripts/setup-prod-backups.md`).
- [ ] Crear primer super-admin en prod (RUNBOOK sección 7).

## 📋 Backlog (priorizado)

- [ ] Activar RLS Postgres en prod (migrar queries a `withTenantContext`
      progresivamente antes).
- [ ] Ejecutar `scripts/migrate-pii-encryption.ts` una vez haya datos
      reales.
- [ ] Swap rate limiter in-memory → Upstash Redis (solo si se escala a
      >1 replica).
- [ ] Off-site backup de prod (rclone a S3/B2/OVH).
- [ ] Upgrade Next 15 → 16 (branch dedicada, requiere migrar Turbopack +
      renombrar `middleware.ts`).
- [ ] Upgrade Prisma 5 → 7 (branch dedicada, `datasource.url` a
      `prisma.config.ts`).
- [ ] Upgrade `@hookform/resolvers` 3 → 5 (branch, Zod v4 compat).
- [ ] Upgrade ESLint 8 → 10 (flat config).
- [ ] Cerrar CVE de `yaml` (requiere Tailwind 4).
- [ ] Consolidar componentes duplicados de dashboard (KPICard, ActivityTable,
      AlertsPanel) a `components/shared/`.
- [ ] Reducir `any` residuales (ahora `warn`, objetivo <10 en lib+app).

## 🔮 Futuro — Feature pipeline

Cuando se arranque con features nuevas:

1. Si hay diseños Pencil → `/design-to-prd`.
2. `/analyze` → evaluar el problema.
3. `/define` → JTBDs + stories.
4. `/plan` → arquitectura + sprint.
5. `/build` → implementar.
6. `/save` → commit + push.
7. `/review` → QA + docs.

Cada feature deja sus artefactos en `docs/producto/features/<feature>/`.
