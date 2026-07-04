-- El cobro del catering (comisión % o precio fijo) pasa a vivir en su plan
-- (saas_plans vía restaurants.saas_plan_id). Se retira restaurants.commission.

-- Backfill defensivo: cualquier catering sin plan queda en el plan estándar
-- (5% comisión), preservando el comportamiento de facturación previo.
UPDATE "restaurants"
SET "saas_plan_id" = (SELECT "id" FROM "saas_plans" WHERE "code" = 'cat-estandar' LIMIT 1)
WHERE "saas_plan_id" IS NULL
  AND EXISTS (SELECT 1 FROM "saas_plans" WHERE "code" = 'cat-estandar');

-- Drop de la columna transitoria.
ALTER TABLE "restaurants" DROP COLUMN IF EXISTS "commission";
