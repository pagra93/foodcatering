# Sprint — comidas-plataforma

Status: **DEV OPERATIVO · REBRAND PLATI EN MAIN · PROD PENDIENTE**
Last updated: 2026-08-04

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

## 🚧 En curso — Fase A del análisis prototipo→producción (2026-08-04)

Rama `fix/fase-a-produccion`. Informe completo:
`docs/general/diagnostico/ANALISIS-PROTOTIPO-VS-PRODUCCION-2026-08.md`.

- [x] A1 Guard de tenant: fix crear pedido / forgot-password / facturación empresa + tests contra el guard real
- [x] A2 Facturas catering: unique de número + retry P2002, unique parcial de período (regenerar tras cancelar), filtro `invoiceId: null` (migración `20260804100000`, aplicada en dev)
- [x] A3 GDPR: cierre de solicitud dentro de la transacción + guarda de idempotencia
- [x] A4 Rate limit sin confiar en XFF del cliente + bucket por email; TTL efectivo de impersonación
- [x] A5 `/api/health` + HEALTHCHECK + SHA de build + entrypoint estricto + `pnpm audit` (bloquea criticals) y deploy-gate opcional en CI
- [x] A6 next-auth → beta.32 exacto + @auth/prisma-adapter 2.11.3 → **0 criticals**. Los 15 high restantes son de `next@15.5.15` (última 15.x estable): solo se cierran con Next 16 (rama dedicada, Fase C)
- [x] A7 `TZ=Europe/Madrid` en Docker + `lib/orders/cutoff.ts` zonificado (Intl) con tests de borde verano/invierno
- [x] A8 Error boundaries (5 grupos + global + not-found) + saneo de searchParams en 19 páginas + `readApiError` en 10 componentes + fix `/acceso-denegado`
- [x] A9 CSV escaping + BOM en exports + PII fuera de logs (demo, middleware, email)

Validación: type-check ✅ · lint 0 errores ✅ · 216 tests ✅ · build ✅ · migración aplicada en `comidas_dev` ✅.
Pasos manuales pendientes (Coolify/monitor): ver PR.

## 🚧 En curso — EPIC-003

- [ ] **HU-044 — Asignar catering ↔ empresa (desde admin)**. Hoy la relación
      `CompanyCateringAssignment` solo se crea por seeds; no hay flujo en la app.
      Se construye desde el admin (ficha de empresa): asignar/quitar caterings,
      con **enforcement del límite `maxCompanies`** del plan del catering (cierra
      la deuda consciente de HU-043). Acción cableada al RBAC
      (`empresa:assign-catering`).

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
