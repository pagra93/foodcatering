-- Retirar el enum legacy Company.plan (ya migrado a saas_plan_id FK).

-- 1. Quitar el índice y la columna plan de companies
DROP INDEX IF EXISTS "companies_plan_idx";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "plan";

-- 2. Eliminar el tipo enum (ya sin uso: saas_plans.code y saas_invoices.plan_code son TEXT)
DROP TYPE IF EXISTS "company_plan";
