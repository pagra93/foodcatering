-- Sprint 4: Facturación — 4 modelos + 2 enums.
-- SaasPlan (catálogo), Settlement (catering→SinTupper),
-- SaasInvoice (SinTupper→empresa), TaxRule (IVAs editables).

-- ─── Enums ────────────────────────────────────────────────────────────

CREATE TYPE "settlement_status" AS ENUM (
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE "saas_invoice_status" AS ENUM (
  'DRAFT',
  'ISSUED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

-- ─── SaasPlan ─────────────────────────────────────────────────────────

CREATE TABLE "saas_plans" (
  "id"               TEXT            NOT NULL,
  "code"             "company_plan"  NOT NULL,
  "name"             TEXT            NOT NULL,
  "description"      TEXT,
  "monthly_price"    DECIMAL(10, 2)  NOT NULL,
  "yearly_price"     DECIMAL(10, 2),
  "features"         JSONB           NOT NULL DEFAULT '[]',
  "max_employees"    INTEGER,
  "max_orders_month" INTEGER,
  "support_level"    TEXT            NOT NULL DEFAULT 'BASIC',
  "active"           BOOLEAN         NOT NULL DEFAULT true,
  "created_at"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "saas_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "saas_plans_code_key" ON "saas_plans"("code");

-- Seed defaults (49 / 149 / 399 € como acordado)
INSERT INTO "saas_plans" ("id", "code", "name", "description", "monthly_price", "yearly_price", "features", "max_employees", "support_level", "updated_at")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'STARTER',    'Starter',    'Ideal para empresas hasta 50 empleados',     49.00,  490.00,  '[]'::jsonb, 50,   'BASIC',     CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-222222222222', 'GROWTH',     'Growth',     'Crecimiento continuado hasta 200 empleados', 149.00, 1490.00, '[]'::jsonb, 200,  'PRIORITY',  CURRENT_TIMESTAMP),
  ('33333333-3333-3333-3333-333333333333', 'ENTERPRISE', 'Enterprise', 'Sin límite + soporte dedicado',              399.00, 3990.00, '[]'::jsonb, NULL, 'DEDICATED', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ─── Settlement ───────────────────────────────────────────────────────

CREATE TABLE "settlements" (
  "id"                 TEXT                  NOT NULL,
  "tenant_catering"    TEXT                  NOT NULL,
  "period"             TEXT                  NOT NULL,
  "gross_amount"       DECIMAL(10, 2)        NOT NULL,
  "commission_rate"    DECIMAL(5, 4)         NOT NULL,
  "commission_amount"  DECIMAL(10, 2)        NOT NULL,
  "penalties"          DECIMAL(10, 2)        NOT NULL DEFAULT 0,
  "net_owed"           DECIMAL(10, 2)        NOT NULL,
  "status"             "settlement_status"   NOT NULL DEFAULT 'DRAFT',
  "issued_at"          TIMESTAMP(3),
  "due_by"             TIMESTAMP(3),
  "paid_at"            TIMESTAMP(3),
  "payment_ref"        TEXT,
  "notes"              TEXT,
  "integrity_hash"     TEXT,
  "created_at"         TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3)          NOT NULL,
  CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "settlements_tenant_catering_period_key"
  ON "settlements"("tenant_catering", "period");
CREATE INDEX "settlements_status_idx" ON "settlements"("status");
CREATE INDEX "settlements_due_by_idx" ON "settlements"("due_by");

-- ─── SaasInvoice ──────────────────────────────────────────────────────

CREATE TABLE "saas_invoices" (
  "id"              TEXT                   NOT NULL,
  "tenant_empresa"  TEXT                   NOT NULL,
  "period"          TEXT                   NOT NULL,
  "plan_code"       "company_plan"         NOT NULL,
  "plan_name"       TEXT                   NOT NULL,
  "number"          TEXT                   NOT NULL,
  "subtotal"        DECIMAL(10, 2)         NOT NULL,
  "tax_rate"        DECIMAL(5, 2)          NOT NULL,
  "tax_amount"      DECIMAL(10, 2)         NOT NULL,
  "total"           DECIMAL(10, 2)         NOT NULL,
  "status"          "saas_invoice_status"  NOT NULL DEFAULT 'DRAFT',
  "issued_at"       TIMESTAMP(3),
  "due_by"          TIMESTAMP(3),
  "paid_at"         TIMESTAMP(3),
  "payment_method"  TEXT,
  "payment_ref"     TEXT,
  "notes"           TEXT,
  "integrity_hash"  TEXT,
  "created_at"      TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)           NOT NULL,
  CONSTRAINT "saas_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "saas_invoices_tenant_empresa_period_key"
  ON "saas_invoices"("tenant_empresa", "period");
CREATE UNIQUE INDEX "saas_invoices_number_key" ON "saas_invoices"("number");
CREATE INDEX "saas_invoices_status_idx" ON "saas_invoices"("status");
CREATE INDEX "saas_invoices_due_by_idx" ON "saas_invoices"("due_by");

-- ─── TaxRule ──────────────────────────────────────────────────────────

CREATE TABLE "tax_rules" (
  "id"         TEXT           NOT NULL,
  "code"       TEXT           NOT NULL,
  "name"       TEXT           NOT NULL,
  "rate"       DECIMAL(5, 2)  NOT NULL,
  "category"   TEXT           NOT NULL,
  "region"     TEXT,
  "valid_from" TIMESTAMP(3)   NOT NULL,
  "valid_to"   TIMESTAMP(3),
  "active"     BOOLEAN        NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)   NOT NULL,
  CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tax_rules_code_key" ON "tax_rules"("code");
CREATE INDEX "tax_rules_category_idx" ON "tax_rules"("category");
CREATE INDEX "tax_rules_active_idx" ON "tax_rules"("active");

-- Seed reglas fiscales iniciales
INSERT INTO "tax_rules" ("id", "code", "name", "rate", "category", "region", "valid_from", "updated_at")
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'IVA_COMIDA',     'IVA reducido comida',  10.00, 'food',    NULL,    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'IVA_GENERAL',    'IVA general servicios', 21.00, 'service', NULL,    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'IGIC_CANARIAS',  'IGIC Canarias',         7.00,  'food',    'ES-CN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'EXENTO',         'Exento',                 0.00, 'service', NULL,    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
