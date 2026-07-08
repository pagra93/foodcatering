-- F3: facturación anual de planes SaaS.
-- Nuevo enum de ciclo + ciclo/ancla de aniversario en Company + ciclo snapshot
-- en SaasInvoice. Por defecto MONTHLY → el comportamiento actual no cambia.

CREATE TYPE "saas_billing_cycle" AS ENUM ('MONTHLY', 'YEARLY');

ALTER TABLE "companies"
  ADD COLUMN "billing_cycle" "saas_billing_cycle" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "subscription_started_at" TIMESTAMP(3);

-- Backfill: ancla de aniversario = fecha de alta (empresas actuales son de prueba).
UPDATE "companies"
  SET "subscription_started_at" = "created_at"
  WHERE "subscription_started_at" IS NULL;

ALTER TABLE "saas_invoices"
  ADD COLUMN "cycle" "saas_billing_cycle" NOT NULL DEFAULT 'MONTHLY';
