-- Migración: Añade feature de rutas de reparto, amplía Invoice + Order + DeliveryProof + Incident,
-- añade campos descriptivos a Dish y blockAllergensEnabled en CompanyPolicy.
--
-- Esta migración está pensada para correr con `prisma migrate deploy` en un entorno donde
-- previamente se aplicaron `20250117000000_company_portal_tables` y `20251117000000_company_enhancements`.
--
-- Cambios:
--   * Nuevos enums: delivery_route_status, delivery_route_event_type
--   * Valores nuevos en enums: audit_action (+9), invoice_status (+2)
--   * Nuevas tablas: delivery_routes, delivery_route_sites, delivery_route_events
--   * Columnas nuevas en: companies, company_sites, company_policies, dishes,
--     orders, delivery_proofs, incidents, invoices
--   * FKs nuevas: orders.route_id, orders.invoice_id, invoices.company_id,
--     delivery_routes.delivery_user_id, delivery_route_sites.*, delivery_route_events.*

-- ============================================================================
-- ENUMS NUEVOS
-- ============================================================================

CREATE TYPE "delivery_route_status" AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE "delivery_route_event_type" AS ENUM (
  'route_started',
  'route_completed',
  'route_cancelled',
  'order_delivered',
  'incident_reported',
  'location_update'
);

-- ============================================================================
-- ENUMS AMPLIADOS
-- ============================================================================

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'invoice_generated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'invoice_updated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'invoice_paid';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'invoice_cancelled';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'order_delivered';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'incident_reported';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'route_started';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'route_completed';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'route_cancelled';

ALTER TYPE "invoice_status" ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE "invoice_status" ADD VALUE IF NOT EXISTS 'cancelled';

-- ============================================================================
-- CompanyPolicy: flag para bloqueo por alérgenos
-- ============================================================================

ALTER TABLE "company_policies"
  ADD COLUMN "block_allergens_enabled" BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- CompanySite: geolocalización
-- ============================================================================

ALTER TABLE "company_sites"
  ADD COLUMN "latitude"  DECIMAL(10, 7),
  ADD COLUMN "longitude" DECIMAL(10, 7);

-- ============================================================================
-- Dish: descripción / ingredientes / imagen
-- ============================================================================

ALTER TABLE "dishes"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "ingredients" TEXT,
  ADD COLUMN "image_url"   TEXT;

-- ============================================================================
-- Incident: descripción + metadata + quién reportó
-- ============================================================================

ALTER TABLE "incidents"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "metadata"    JSONB,
  ADD COLUMN "reported_by" TEXT;

-- ============================================================================
-- DeliveryProof: tipo de prueba, URL, receptor, coords + verification_hash nullable
-- ============================================================================

ALTER TABLE "delivery_proofs"
  ADD COLUMN "proof_type"     TEXT,
  ADD COLUMN "proof_url"      TEXT,
  ADD COLUMN "recipient_name" TEXT,
  ADD COLUMN "latitude"       DECIMAL(10, 7),
  ADD COLUMN "longitude"      DECIMAL(10, 7);

-- verification_hash era NOT NULL; para permitir proofs simples sin hash previo
ALTER TABLE "delivery_proofs"
  ALTER COLUMN "verification_hash" DROP NOT NULL;

-- ============================================================================
-- Invoice: ampliaciones (company FK, periodo completo, pago, snapshot, integridad)
-- ============================================================================

ALTER TABLE "invoices"
  ADD COLUMN "company_id"            TEXT,
  ADD COLUMN "start_date"            DATE,
  ADD COLUMN "end_date"              DATE,
  ADD COLUMN "sent_at"               TIMESTAMP(3),
  ADD COLUMN "paid_at"               TIMESTAMP(3),
  ADD COLUMN "payment_method"        TEXT,
  ADD COLUMN "transaction_reference" TEXT,
  ADD COLUMN "snapshot"              JSONB,
  ADD COLUMN "integrity_hash"        TEXT,
  ADD COLUMN "notes"                 TEXT;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "invoices_company_id_idx" ON "invoices"("company_id");

-- ============================================================================
-- DeliveryRoute (nueva tabla)
-- ============================================================================

CREATE TABLE "delivery_routes" (
  "id"                 TEXT                  NOT NULL,
  "tenant_id"          TEXT                  NOT NULL,
  "name"               TEXT                  NOT NULL,
  "date"               DATE                  NOT NULL,
  "delivery_user_id"   TEXT,
  "estimated_duration" INTEGER,
  "notes"              TEXT,
  "status"             "delivery_route_status" NOT NULL DEFAULT 'pending',
  "started_at"         TIMESTAMP(3),
  "completed_at"       TIMESTAMP(3),
  "created_at"         TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3)          NOT NULL,
  CONSTRAINT "delivery_routes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_routes_tenant_id_date_idx" ON "delivery_routes"("tenant_id", "date");
CREATE INDEX "delivery_routes_delivery_user_id_idx" ON "delivery_routes"("delivery_user_id");
CREATE INDEX "delivery_routes_status_idx" ON "delivery_routes"("status");

ALTER TABLE "delivery_routes"
  ADD CONSTRAINT "delivery_routes_delivery_user_id_fkey"
  FOREIGN KEY ("delivery_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- DeliveryRouteSite (junction ruta → sede con orden secuencial)
-- ============================================================================

CREATE TABLE "delivery_route_sites" (
  "id"              TEXT    NOT NULL,
  "route_id"        TEXT    NOT NULL,
  "company_site_id" TEXT    NOT NULL,
  "sequence"        INTEGER NOT NULL,
  CONSTRAINT "delivery_route_sites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_route_sites_route_id_company_site_id_key"
  ON "delivery_route_sites"("route_id", "company_site_id");

CREATE INDEX "delivery_route_sites_route_id_sequence_idx"
  ON "delivery_route_sites"("route_id", "sequence");

ALTER TABLE "delivery_route_sites"
  ADD CONSTRAINT "delivery_route_sites_route_id_fkey"
  FOREIGN KEY ("route_id") REFERENCES "delivery_routes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_route_sites"
  ADD CONSTRAINT "delivery_route_sites_company_site_id_fkey"
  FOREIGN KEY ("company_site_id") REFERENCES "company_sites"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- DeliveryRouteEvent (eventos de la ruta: start/complete/cancel/delivered/incident/location)
-- ============================================================================

CREATE TABLE "delivery_route_events" (
  "id"        TEXT                          NOT NULL,
  "route_id"  TEXT                          NOT NULL,
  "type"      "delivery_route_event_type"   NOT NULL,
  "timestamp" TIMESTAMP(3)                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata"  JSONB,
  CONSTRAINT "delivery_route_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_route_events_route_id_timestamp_idx"
  ON "delivery_route_events"("route_id", "timestamp");

ALTER TABLE "delivery_route_events"
  ADD CONSTRAINT "delivery_route_events_route_id_fkey"
  FOREIGN KEY ("route_id") REFERENCES "delivery_routes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Order: notes, route_id, invoice_id + FKs + índices
-- ============================================================================

ALTER TABLE "orders"
  ADD COLUMN "notes"      TEXT,
  ADD COLUMN "route_id"   TEXT,
  ADD COLUMN "invoice_id" TEXT;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_route_id_fkey"
  FOREIGN KEY ("route_id") REFERENCES "delivery_routes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_route_id_idx"   ON "orders"("route_id");
CREATE INDEX "orders_invoice_id_idx" ON "orders"("invoice_id");
