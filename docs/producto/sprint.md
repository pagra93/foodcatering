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

## 🚧 En curso — Fase C del análisis prototipo→producción (2026-08-04)

Rama `feat/fase-c-produccion` (apilada sobre Fase B / PR #14).

- [x] C1 Contrato `ActionResult`/`withAction` en TODAS las server actions: 70 actions migradas (43 admin + 27 portales) con sus 41 consumidores — los mensajes de negocio por fin se ven en producción (Next redacta los `throw`). Excluidas a propósito: gdpr (tx delicada) y las inline de páginas de alta de catering/empresa (devuelven `{error}`, no lanzan — candidatas a barrido posterior). Bonus: `<Toaster />` montado en catering y empleado (sus toasts no se renderizaban).
- [x] C2 Rate limiting multi-réplica: backend Redis opcional (`REDIS_URL`, ioredis) con fallback in-memory ante fallo de Redis (mejor límite local que bloquear logins) — la interfaz `RateLimiter` no cambia.
- [x] C3 Export de pedidos en STREAMING con cursor (`exportOrdersCSVStream`): sin tope silencioso de 10.000 filas ni CSV entero en RAM; totales por cabeceras X-Total-*.
- [x] C4 Auditoría del ciclo de vida: ORDER_DELIVERED e INCIDENT_REPORTED (intra-tx), ROUTE_STARTED/COMPLETED/CANCELLED, POLICY_CHANGE (intra-tx), BILLING_RUN, logLogin/logLogout (events de NextAuth), cambios/reset de contraseña, alta/edición de empleados y MFA — el enum muerto queda cableado entero, sin PII en los diffs.
- [x] C5 Jobs visibles en `/admin/operations/health`: últimas ejecuciones de `job_runs` con estado/duración/resumen.
- [x] C6 Cachés aplazadas de B7: entitlements con `unstable_cache` (Set→array serializable, tags `entitlements:<tenant>`+global invalidados desde plan-actions, techo 300 s) y ventana de mantenimiento (fechas ISO reconstruidas, tag `maintenance` desde sus actions) + tags de branding cableados en las 3 actions.
- [x] C7 RUNBOOK §18: particionado de AuditLog/OrderHistory/Notification PREPARADO con señal de disparo (~5M filas) — no ejecutado a propósito.

Validación Fase C: type-check ✅ · lint 0 errores ✅ · 224 tests ✅ · build ✅ (sin cambios de schema).

FUERA de esta rama, deliberadamente: squash/baseline de migraciones (operación supervisada con paso en prod — RUNBOOK §16), Next 16 / Prisma 7 / ESLint 10 / resolvers 5 (regla del proyecto: rama dedicada por major; Next 16 es lo que cierra los 15 CVEs high de `next@15.5.15`), búsqueda PII indexada (contradice la decisión del PM de mantener búsqueda por fragmento — re-decidir antes), retención de AuditLog (decisión legal), particionado real y PDF en worker (sin tráfico que lo justifique).

## 🚧 En curso — Fase B del análisis prototipo→producción (2026-08-04)

Rama `feat/fase-b-produccion` (apilada sobre Fase A / PR #13).

- [x] B1 Contrato único de `Order.selection` (canónico + parser tolerante a legacy en `lib/orders/selection.ts`) + facturar `order.price` (no precios actuales) + aviso IRPF en notas/snapshot + migración de datos `20260804110000` + tests de contrato. Además: las 2 rutas de empleado que derivaban tenant de cabecera (pedidos, cambiar-password) ahora usan la sesión — crear pedido volvía a estar roto por eso.
- [x] B2 Scheduler: `JobRun` (lock por índice único parcial + stale >2h) + `/api/cron/[job]` con `CRON_SECRET` + jobs `lock-orders` / `monthly-billing` / `mrr-snapshot` / `retention`; facturación y snapshot extraídos a `lib/billing/generate-month.ts` y `lib/business-plan/snapshot.ts` (compartidos con los botones de admin); producción/rutas aceptan `LOCKED_AFTER_CUTOFF`; crontab en RUNBOOK §17.
- [x] B3 Observabilidad: pino con redact de PII (`lib/log.ts`) + `x-request-id` (middleware) + `instrumentation.ts` con `onRequestError` (Sentry opt-in por `SENTRY_DSN`) + `apiErrorFrom`/`DomainError` en las ~45 rutas API (sin fugas de Prisma/Zod, mensajes de negocio conservados) + auditoría de dinero DENTRO de transacción (settlements, SaaS, pagos).
- [x] B4 Concurrencia: cuotas de plan en tx con `FOR UPDATE` (empleados, sedes), tokens de reset/invitación y códigos MFA de consumo atómico, lock optimista de pedido + `@@unique(orderId, version)`, penalizaciones con transición condicionada, policy+historial en una tx, PRIMARY único (parcial + validación).
- [x] B5 Índices calientes (10, cruzados con queries reales) + `connection_limit` documentado (env.example + SETUP-COOLIFY) + RUNBOOK §16 con el baseline de migraciones (squash SUPERVISADO — deliberadamente NO ejecutado en esta rama).
- [x] B6 `deletedAt` automático en el cliente guardado (opt-out por presencia de la clave; fiscal ya no suma borrados) + N+1 de admin: `/admin/caterings` ~402→5 queries con paginación real, `/admin/empresas` 82→5, empleados 60→2 + todos los `distinct` en memoria → `groupBy`/SQL + fix del KPI "empleados activos" (siempre daba 0/1).
- [x] B7 `unstable_cache`: branding por tenant (tag `branding:<id>`) y avisos activos (tag `announcements` + `revalidateTag` en sus actions). Aplazado conscientemente: caché de `getCurrentTenant`/entitlements (staleness de cuotas) y de la ventana de mantenimiento (serialización de fechas) → Fase C.
- [x] B8 `EmailLog` persistente (todo envío queda registrado; purga a 180 días vía retención) + `BackupEvent` desde `backup-prod.sh` + off-site rclone y dead-man's switch opcionales + RUNBOOK §0/§13-§17 (triaje, migración fallida, restore parcial, incidente RGPD, baseline, cron) + `withAction`/`ActionResult` (patrón en CLAUDE.md) + botones admin sin `.catch(() => {})`.

Validación Fase B: type-check ✅ · lint 0 errores ✅ · 224 tests ✅ · build ✅ · migraciones `20260804110000` y `20260804120000` aplicadas en `comidas_dev` ✅.

## ✅ Hecho — Fase A del análisis prototipo→producción (2026-08-04)

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
