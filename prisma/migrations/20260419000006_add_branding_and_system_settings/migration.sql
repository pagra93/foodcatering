-- Sprint 7: Branding end-to-end.
-- Añade 2 campos a tenants + modelo SystemSettings singleton.

ALTER TABLE "tenants" ADD COLUMN "secondary_color" TEXT;
ALTER TABLE "tenants" ADD COLUMN "favicon_url"     TEXT;

CREATE TABLE "system_settings" (
  "id"                      TEXT           NOT NULL DEFAULT 'singleton',
  "default_primary_color"   TEXT           NOT NULL DEFAULT '#3B82F6',
  "default_secondary_color" TEXT,
  "default_logo_url"        TEXT,
  "default_favicon_url"     TEXT,
  "brand_name"              TEXT           NOT NULL DEFAULT 'SinTupper',
  "updated_by"              TEXT,
  "updated_at"              TIMESTAMP(3)   NOT NULL,
  "created_at"              TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Seed la fila singleton
INSERT INTO "system_settings" ("id", "default_primary_color", "brand_name", "updated_at")
VALUES ('singleton', '#3B82F6', 'SinTupper', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
