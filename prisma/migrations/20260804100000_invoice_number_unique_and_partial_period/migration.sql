-- Fase A (A2) — Facturas catering→empresa:
--  1. Número de factura ÚNICO por catering (RD 1619/2012: numeración
--     correlativa y única por serie). Hasta ahora dos facturas del mismo
--     catering a empresas distintas podían salir con el mismo número.
--  2. El unique de período pasa a ser PARCIAL: las facturas CANCELLED/VOID
--     dejan de bloquear la re-facturación del período (antes, cancelar una
--     factura hacía imposible regenerarla: el check de código excluía
--     canceladas pero el constraint de BD no).
--
-- Todo idempotente (IF EXISTS / IF NOT EXISTS): prod se inicializó con
-- `db push`, así que el estado previo puede variar entre entornos.

-- 0. Saneo defensivo: si existieran números duplicados previos (solo posibles
--    por el bug que este unique corrige, o por seeds antiguos), se renumeran
--    con sufijo -Rn para que la creación del índice no falle. En prod real
--    (sin facturas todavía) es un no-op.
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_catering, number
           ORDER BY created_at
         ) - 1 AS n
  FROM invoices
)
UPDATE invoices i
SET number = i.number || '-R' || d.n
FROM dups d
WHERE d.id = i.id AND d.n > 0;

-- 1. Número único por catering.
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_catering_number_key"
  ON "invoices" ("tenant_catering", "number");

-- 2. Unique de período → parcial (excluye cancelled/void).
DROP INDEX IF EXISTS "invoices_tenant_catering_tenant_empresa_period_key";
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_active_period_key"
  ON "invoices" ("tenant_catering", "tenant_empresa", "period")
  WHERE status NOT IN ('cancelled', 'void');

-- 3. Índice de consulta no-único para el mismo prefijo (listados por período).
CREATE INDEX IF NOT EXISTS "invoices_tenant_catering_tenant_empresa_period_idx"
  ON "invoices" ("tenant_catering", "tenant_empresa", "period");
