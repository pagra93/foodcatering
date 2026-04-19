-- Sprint 8: Catálogos (5 modelos + 4 enums).

-- ─── Enums ────────────────────────────────────────────────────────────

CREATE TYPE "allergen_category" AS ENUM (
  'CEREALS_WITH_GLUTEN', 'CRUSTACEANS', 'EGGS', 'FISH', 'PEANUTS',
  'SOYBEANS', 'MILK', 'TREE_NUTS', 'CELERY', 'MUSTARD', 'SESAME',
  'SULPHITES', 'LUPIN', 'MOLLUSCS', 'OTHER'
);

CREATE TYPE "holiday_scope" AS ENUM ('NATIONAL', 'REGION', 'TENANT');

CREATE TYPE "incident_reason_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- ─── Allergen ─────────────────────────────────────────────────────────

CREATE TABLE "allergens" (
  "id"          TEXT                NOT NULL,
  "code"        TEXT                NOT NULL,
  "name"        TEXT                NOT NULL,
  "category"    "allergen_category" NOT NULL,
  "description" TEXT,
  "icon"        TEXT,
  "active"      BOOLEAN             NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)        NOT NULL,
  CONSTRAINT "allergens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "allergens_code_key" ON "allergens"("code");
CREATE INDEX "allergens_active_idx" ON "allergens"("active");

-- ─── MenuTemplate ─────────────────────────────────────────────────────

CREATE TABLE "menu_templates" (
  "id"              TEXT         NOT NULL,
  "tenant_catering" TEXT         NOT NULL,
  "name"            TEXT         NOT NULL,
  "description"     TEXT,
  "structure"       JSONB        NOT NULL,
  "active"          BOOLEAN      NOT NULL DEFAULT true,
  "created_by"      TEXT         NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "menu_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "menu_templates_tenant_catering_active_idx"
  ON "menu_templates"("tenant_catering", "active");

-- ─── Holiday ──────────────────────────────────────────────────────────

CREATE TABLE "holidays" (
  "id"          TEXT            NOT NULL,
  "date"        DATE            NOT NULL,
  "name"        TEXT            NOT NULL,
  "scope"       "holiday_scope" NOT NULL,
  "region_code" TEXT,
  "tenant_id"   TEXT,
  "description" TEXT,
  "created_by"  TEXT,
  "created_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "holidays_date_idx"             ON "holidays"("date");
CREATE INDEX "holidays_scope_region_idx"     ON "holidays"("scope", "region_code");
CREATE INDEX "holidays_tenant_id_idx"        ON "holidays"("tenant_id");

CREATE TABLE "holiday_overrides" (
  "id"         TEXT         NOT NULL,
  "tenant_id"  TEXT         NOT NULL,
  "holiday_id" TEXT         NOT NULL,
  "disabled"   BOOLEAN      NOT NULL DEFAULT true,
  "notes"      TEXT,
  "created_by" TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "holiday_overrides_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "holiday_overrides_tenant_id_holiday_id_key"
  ON "holiday_overrides"("tenant_id", "holiday_id");
CREATE INDEX "holiday_overrides_tenant_id_idx" ON "holiday_overrides"("tenant_id");

-- ─── DeliveryZone ─────────────────────────────────────────────────────

CREATE TABLE "delivery_zones" (
  "id"              TEXT         NOT NULL,
  "tenant_catering" TEXT         NOT NULL,
  "name"            TEXT         NOT NULL,
  "postal_codes"    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "max_distance_km" INTEGER,
  "default_driver"  TEXT,
  "notes"           TEXT,
  "active"          BOOLEAN      NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delivery_zones_tenant_catering_active_idx"
  ON "delivery_zones"("tenant_catering", "active");

-- ─── IncidentReason ───────────────────────────────────────────────────

CREATE TABLE "incident_reasons" (
  "id"                    TEXT                       NOT NULL,
  "code"                  TEXT                       NOT NULL,
  "name"                  TEXT                       NOT NULL,
  "description"           TEXT,
  "default_severity"      "incident_reason_severity" NOT NULL DEFAULT 'MEDIUM',
  "category"              TEXT                       NOT NULL,
  "requires_compensation" BOOLEAN                    NOT NULL DEFAULT false,
  "scope"                 TEXT                       NOT NULL DEFAULT 'SYSTEM',
  "tenant_id"             TEXT,
  "active"                BOOLEAN                    NOT NULL DEFAULT true,
  "created_at"            TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3)               NOT NULL,
  CONSTRAINT "incident_reasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "incident_reasons_code_key" ON "incident_reasons"("code");
CREATE INDEX "incident_reasons_scope_active_idx" ON "incident_reasons"("scope", "active");
CREATE INDEX "incident_reasons_tenant_id_idx" ON "incident_reasons"("tenant_id");
