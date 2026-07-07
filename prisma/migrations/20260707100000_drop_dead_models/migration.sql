-- L10: eliminación de 8 modelos muertos (sin operaciones reales en el código).
-- Todas las tablas están vacías en dev/prod; el drop es de bajo riesgo.
--
-- Modelos: DeliveryEvent, KitchenSheet, PackingSheet, DailySnapshot,
-- CompanyExport, Integration, Webhook, WebhookDelivery.
-- Enums huérfanos: delivery_event_type, export_type, integration_type,
-- integration_status.
-- Además se retira el valor 'DailySnapshot' del enum retention_entity.

-- 1) Tablas con FK entrantes primero (CASCADE limpia constraints colgantes).
DROP TABLE IF EXISTS "webhook_deliveries" CASCADE;
DROP TABLE IF EXISTS "webhooks" CASCADE;
DROP TABLE IF EXISTS "delivery_events" CASCADE;
DROP TABLE IF EXISTS "kitchen_sheets" CASCADE;
DROP TABLE IF EXISTS "packing_sheets" CASCADE;
DROP TABLE IF EXISTS "daily_snapshots" CASCADE;
DROP TABLE IF EXISTS "company_exports" CASCADE;
DROP TABLE IF EXISTS "integrations" CASCADE;

-- 2) Enums que solo usaban los modelos borrados.
DROP TYPE IF EXISTS "delivery_event_type";
DROP TYPE IF EXISTS "export_type";
DROP TYPE IF EXISTS "integration_type";
DROP TYPE IF EXISTS "integration_status";

-- 3) Retirar 'DailySnapshot' del enum retention_entity (Postgres no permite
--    DROP VALUE: se recrea el tipo). Primero se elimina cualquier política que
--    lo referenciara para que el cast no falle.
DELETE FROM "retention_policies" WHERE "entity" = 'DailySnapshot';

ALTER TYPE "retention_entity" RENAME TO "retention_entity_old";

CREATE TYPE "retention_entity" AS ENUM (
  'AuditLog',
  'Order',
  'Invoice',
  'User',
  'Notification',
  'Incident',
  'OrderHistory',
  'DeliveryProof'
);

ALTER TABLE "retention_policies"
  ALTER COLUMN "entity" TYPE "retention_entity"
  USING ("entity"::text::"retention_entity");

DROP TYPE "retention_entity_old";
