-- Sprint 2: modelo Penalty + enums PenaltyType y PenaltyStatus.
-- Sanciones económicas al catering por SLA incumplido, documentación
-- expirada, umbral de incidencias o decisión manual. Flujo con disputa.

CREATE TYPE "penalty_type" AS ENUM (
  'SLA_BREACH',
  'DOC_EXPIRED',
  'INCIDENT_THRESHOLD',
  'MANUAL'
);

CREATE TYPE "penalty_status" AS ENUM (
  'PENDING',
  'APPLIED',
  'DISPUTED',
  'WAIVED'
);

CREATE TABLE "penalties" (
  "id"                 TEXT            NOT NULL,
  "tenant_catering"    TEXT            NOT NULL,
  "company_id"         TEXT,
  "type"               "penalty_type"  NOT NULL,
  "reason"             TEXT            NOT NULL,
  "amount"             DECIMAL(10, 2)  NOT NULL,
  "applied_at"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_by"         TEXT            NOT NULL,
  "linked_incident_id" TEXT,
  "linked_audit_id"    TEXT,
  "status"             "penalty_status" NOT NULL DEFAULT 'PENDING',
  "settled_at"         TIMESTAMP(3),
  "disputed_at"        TIMESTAMP(3),
  "dispute_reason"     TEXT,
  "resolved_at"        TIMESTAMP(3),
  "resolved_by"        TEXT,
  "notes"              TEXT,
  "created_at"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "penalties_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "penalties_tenant_catering_status_idx"     ON "penalties"("tenant_catering", "status");
CREATE INDEX "penalties_tenant_catering_applied_at_idx" ON "penalties"("tenant_catering", "applied_at");
CREATE INDEX "penalties_status_idx"                     ON "penalties"("status");
CREATE INDEX "penalties_linked_incident_id_idx"         ON "penalties"("linked_incident_id");
CREATE INDEX "penalties_linked_audit_id_idx"            ON "penalties"("linked_audit_id");
