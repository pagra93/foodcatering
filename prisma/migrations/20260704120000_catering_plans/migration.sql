-- Planes SaaS tipados (EMPRESA/CATERING) + cobro de catering + FK en Restaurant.

-- 1. Enums nuevos
CREATE TYPE "plan_type" AS ENUM ('empresa', 'catering');
CREATE TYPE "pricing_model" AS ENUM ('commission', 'fixed');

-- 2. saas_plans: tipo + campos de catering
ALTER TABLE "saas_plans" ADD COLUMN "plan_type" "plan_type" NOT NULL DEFAULT 'empresa';
ALTER TABLE "saas_plans" ADD COLUMN "pricing_model" "pricing_model";
ALTER TABLE "saas_plans" ADD COLUMN "commission_pct" DECIMAL(5,4);
ALTER TABLE "saas_plans" ADD COLUMN "flat_monthly_fee" DECIMAL(10,2);
ALTER TABLE "saas_plans" ADD COLUMN "max_companies" INTEGER;
CREATE INDEX "saas_plans_plan_type_idx" ON "saas_plans"("plan_type");

-- 3. restaurants: FK dinámica al plan de catering
ALTER TABLE "restaurants" ADD COLUMN "saas_plan_id" TEXT;
CREATE INDEX "restaurants_saas_plan_id_idx" ON "restaurants"("saas_plan_id");
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_saas_plan_id_fkey"
  FOREIGN KEY ("saas_plan_id") REFERENCES "saas_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
