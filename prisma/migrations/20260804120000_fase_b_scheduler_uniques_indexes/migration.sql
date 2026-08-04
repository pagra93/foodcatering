-- Fase B — scheduler (JobRun), trazabilidad de emails (EmailLog), uniques de
-- concurrencia e índices calientes. Todo idempotente (IF NOT EXISTS / guardas):
-- prod se inicializó con `db push` y el estado previo puede variar.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. JobRun: registro de cada ejecución de /api/cron/* (observabilidad).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "job_runs" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "ok" BOOLEAN,
    "summary" JSONB,
    "error" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "job_runs_job_started_at_idx"
  ON "job_runs"("job", "started_at" DESC);
-- Lock de exclusión mutua del scheduler: una sola ejecución "viva" (sin
-- finished_at) por job. Prisma no puede expresar índices parciales.
CREATE UNIQUE INDEX IF NOT EXISTS "job_runs_running_key"
  ON "job_runs"("job") WHERE "finished_at" IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. EmailLog: rastro persistente de cada intento de envío.
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "email_send_status" AS ENUM ('sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT,
    "subject" TEXT NOT NULL,
    "status" "email_send_status" NOT NULL,
    "provider_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "email_logs_status_created_at_idx"
  ON "email_logs"("status", "created_at");
CREATE INDEX IF NOT EXISTS "email_logs_created_at_idx"
  ON "email_logs"("created_at");

-- ────────────────────────────────────────────────────────────────────────────
-- 3. OrderHistory: versión única por pedido (sostiene el lock optimista).
--    Saneo defensivo previo: si hubiera versiones duplicadas históricas, se
--    renumera TODO el historial de esos pedidos por orden cronológico.
-- ────────────────────────────────────────────────────────────────────────────
WITH affected AS (
  SELECT DISTINCT order_id
  FROM (
    SELECT order_id, version
    FROM order_history
    GROUP BY order_id, version
    HAVING COUNT(*) > 1
  ) dup
),
renum AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY changed_at, id) AS rn
  FROM order_history
  WHERE order_id IN (SELECT order_id FROM affected)
)
UPDATE order_history oh
SET version = renum.rn
FROM renum
WHERE renum.id = oh.id;

DROP INDEX IF EXISTS "order_history_order_id_version_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "order_history_order_id_version_key"
  ON "order_history"("order_id", "version");

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Un solo catering PRIMARY activo por empresa (índice único parcial;
--    Prisma no puede expresarlo en el schema).
-- ────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "company_catering_assignments_primary_active_key"
  ON "company_catering_assignments"("company_id")
  WHERE "active" AND "type" = 'primary';

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Índices calientes (cruzados contra las queries reales de dashboards,
--    campana de notificaciones, producción y visor de auditoría).
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "orders_tenant_empresa_status_service_date_idx"
  ON "orders"("tenant_empresa", "status", "service_date");
CREATE INDEX IF NOT EXISTS "orders_tenant_catering_service_date_status_idx"
  ON "orders"("tenant_catering", "service_date", "status");
CREATE INDEX IF NOT EXISTS "orders_tenant_empresa_created_at_idx"
  ON "orders"("tenant_empresa", "created_at");
CREATE INDEX IF NOT EXISTS "orders_tenant_catering_created_at_idx"
  ON "orders"("tenant_catering", "created_at");
CREATE INDEX IF NOT EXISTS "incidents_tenant_empresa_created_at_idx"
  ON "incidents"("tenant_empresa", "created_at");
CREATE INDEX IF NOT EXISTS "incidents_tenant_catering_created_at_idx"
  ON "incidents"("tenant_catering", "created_at");
CREATE INDEX IF NOT EXISTS "employees_tenant_id_created_at_idx"
  ON "employees"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_read_created_at_idx"
  ON "notifications"("tenant_id", "read", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_timestamp_idx"
  ON "audit_logs"("tenant_id", "timestamp");
CREATE INDEX IF NOT EXISTS "invoices_tenant_catering_period_idx"
  ON "invoices"("tenant_catering", "period");
