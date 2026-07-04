-- Avisos en-app: banner segmentado por audiencia y ventana temporal.

CREATE TYPE "announcement_severity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "announcement_audience" AS ENUM ('all', 'empresa', 'catering', 'empleado');

CREATE TABLE "announcements" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "severity"    "announcement_severity" NOT NULL DEFAULT 'info',
  "audience"    "announcement_audience" NOT NULL DEFAULT 'all',
  "starts_at"   TIMESTAMP(3),
  "ends_at"     TIMESTAMP(3),
  "dismissible" BOOLEAN NOT NULL DEFAULT true,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "created_by"  TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "announcements_active_audience_idx" ON "announcements" ("active", "audience");
