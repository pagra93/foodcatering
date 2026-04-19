-- Sprint 3: 5 modelos de Compliance + 7 enums.
-- RetentionPolicy, GdprRequest, DpaAgreement, SecurityCheck, SecurityReport.

-- ─── Enums ────────────────────────────────────────────────────────────

CREATE TYPE "retention_entity" AS ENUM (
  'AuditLog',
  'Order',
  'Invoice',
  'User',
  'Notification',
  'DailySnapshot',
  'Incident',
  'OrderHistory',
  'DeliveryProof'
);

CREATE TYPE "retention_delete_mode" AS ENUM ('SOFT', 'HARD');

CREATE TYPE "gdpr_request_type" AS ENUM (
  'ACCESS',
  'ERASURE',
  'PORTABILITY',
  'RECTIFICATION'
);

CREATE TYPE "gdpr_request_status" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED'
);

CREATE TYPE "security_check_status" AS ENUM ('VERIFIED', 'FAILED', 'PENDING');

CREATE TYPE "security_check_category" AS ENUM (
  'OWASP_A01_ACCESS_CONTROL',
  'OWASP_A02_CRYPTO_FAILURES',
  'OWASP_A03_INJECTION',
  'OWASP_A04_INSECURE_DESIGN',
  'OWASP_A05_SECURITY_MISCONFIG',
  'OWASP_A06_VULNERABLE_COMPONENTS',
  'OWASP_A07_AUTH_FAILURES',
  'OWASP_A08_DATA_INTEGRITY',
  'OWASP_A09_LOGGING_MONITORING',
  'OWASP_A10_SSRF'
);

CREATE TYPE "security_report_severity" AS ENUM (
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- ─── Tables ───────────────────────────────────────────────────────────

CREATE TABLE "retention_policies" (
  "id"              TEXT                     NOT NULL,
  "entity"          "retention_entity"       NOT NULL,
  "retention_days"  INTEGER                  NOT NULL,
  "delete_mode"     "retention_delete_mode"  NOT NULL DEFAULT 'SOFT',
  "last_run"        TIMESTAMP(3),
  "next_run"        TIMESTAMP(3),
  "last_deleted"    INTEGER,
  "updated_by"      TEXT,
  "updated_at"      TIMESTAMP(3)             NOT NULL,
  "created_at"      TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "retention_policies_entity_key" ON "retention_policies"("entity");

CREATE TABLE "gdpr_requests" (
  "id"               TEXT                   NOT NULL,
  "tenant_id"        TEXT                   NOT NULL,
  "user_id"          TEXT                   NOT NULL,
  "requested_by"     TEXT                   NOT NULL,
  "type"             "gdpr_request_type"    NOT NULL,
  "status"           "gdpr_request_status"  NOT NULL DEFAULT 'PENDING',
  "requested_at"     TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "due_by"           TIMESTAMP(3)           NOT NULL,
  "resolved_at"      TIMESTAMP(3),
  "resolved_by"      TEXT,
  "notes"            TEXT,
  "delivery_url"     TEXT,
  "rejection_reason" TEXT,
  CONSTRAINT "gdpr_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gdpr_requests_tenant_id_idx" ON "gdpr_requests"("tenant_id");
CREATE INDEX "gdpr_requests_user_id_idx"   ON "gdpr_requests"("user_id");
CREATE INDEX "gdpr_requests_status_idx"    ON "gdpr_requests"("status");
CREATE INDEX "gdpr_requests_due_by_idx"    ON "gdpr_requests"("due_by");

CREATE TABLE "dpa_agreements" (
  "id"                  TEXT          NOT NULL,
  "tenant_id"           TEXT          NOT NULL,
  "version"             TEXT          NOT NULL,
  "pdf_url"             TEXT          NOT NULL,
  "signed_at"           TIMESTAMP(3)  NOT NULL,
  "signed_by_user_id"   TEXT          NOT NULL,
  "signed_by_name"      TEXT          NOT NULL,
  "effective_from"      TIMESTAMP(3)  NOT NULL,
  "effective_to"        TIMESTAMP(3),
  "uploaded_by_user_id" TEXT          NOT NULL,
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dpa_agreements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dpa_agreements_tenant_id_effective_from_idx"
  ON "dpa_agreements"("tenant_id", "effective_from");
CREATE INDEX "dpa_agreements_effective_to_idx"
  ON "dpa_agreements"("effective_to");

CREATE TABLE "security_checks" (
  "id"              TEXT                       NOT NULL,
  "category"        "security_check_category"  NOT NULL,
  "item"            TEXT                       NOT NULL,
  "status"          "security_check_status"    NOT NULL DEFAULT 'PENDING',
  "evidence"        TEXT,
  "verified_by"     TEXT,
  "verified_at"     TIMESTAMP(3),
  "next_review_at"  TIMESTAMP(3),
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)               NOT NULL,
  CONSTRAINT "security_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "security_checks_category_idx" ON "security_checks"("category");
CREATE INDEX "security_checks_status_idx"   ON "security_checks"("status");

CREATE TABLE "security_reports" (
  "id"          TEXT                        NOT NULL,
  "title"       TEXT                        NOT NULL,
  "scanner"     TEXT                        NOT NULL,
  "scanned_at"  TIMESTAMP(3)                NOT NULL,
  "pdf_url"     TEXT                        NOT NULL,
  "severity"    "security_report_severity"  NOT NULL DEFAULT 'INFO',
  "findings"    JSONB,
  "uploaded_by" TEXT                        NOT NULL,
  "notes"       TEXT,
  "created_at"  TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "security_reports_scanned_at_idx" ON "security_reports"("scanned_at");
CREATE INDEX "security_reports_severity_idx"   ON "security_reports"("severity");
