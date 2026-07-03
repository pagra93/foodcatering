-- Planes SaaS dinámicos (como roles): code libre, features en join, FK desde Company.

-- 1. Enum de ámbito del plan
CREATE TYPE "plan_scope" AS ENUM ('system', 'custom');

-- 2. saas_plans: code enum -> texto libre, drop features Json, nuevas columnas
ALTER TABLE "saas_plans" ALTER COLUMN "code" TYPE TEXT USING "code"::text;
ALTER TABLE "saas_plans" DROP COLUMN "features";
ALTER TABLE "saas_plans" ADD COLUMN "scope" "plan_scope" NOT NULL DEFAULT 'system';
ALTER TABLE "saas_plans" ADD COLUMN "tenant_empresa" TEXT;
ALTER TABLE "saas_plans" ADD COLUMN "max_sites" INTEGER;
ALTER TABLE "saas_plans" ADD COLUMN "max_caterings" INTEGER;
CREATE INDEX "saas_plans_scope_idx" ON "saas_plans"("scope");
CREATE INDEX "saas_plans_tenant_empresa_idx" ON "saas_plans"("tenant_empresa");

-- 3. plan_features (join plan -> feature del catálogo)
CREATE TABLE "plan_features" (
    "plan_id"     TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("plan_id", "feature_key")
);
CREATE INDEX "plan_features_feature_key_idx" ON "plan_features"("feature_key");
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "saas_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. companies: FK dinámica saas_plan_id (el enum `plan` se mantiene transitorio)
ALTER TABLE "companies" ADD COLUMN "saas_plan_id" TEXT;
CREATE INDEX "companies_saas_plan_id_idx" ON "companies"("saas_plan_id");
ALTER TABLE "companies" ADD CONSTRAINT "companies_saas_plan_id_fkey"
  FOREIGN KEY ("saas_plan_id") REFERENCES "saas_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. saas_invoices: planCode enum -> texto (snapshot)
ALTER TABLE "saas_invoices" ALTER COLUMN "plan_code" TYPE TEXT USING "plan_code"::text;

-- 6. Backfill: cada empresa apunta al plan cuyo code == su enum actual
UPDATE "companies" c
   SET "saas_plan_id" = p."id"
  FROM "saas_plans" p
 WHERE p."code" = c."plan"::text;
