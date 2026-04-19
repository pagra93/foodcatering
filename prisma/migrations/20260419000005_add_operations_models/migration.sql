-- Sprint 5: Operación — BackupEvent + MaintenanceWindow.

CREATE TABLE "backup_events" (
  "id"          TEXT          NOT NULL,
  "file_name"   TEXT          NOT NULL,
  "file_size"   BIGINT,
  "hash"        TEXT,
  "created_by"  TEXT          NOT NULL,
  "source"      TEXT          NOT NULL DEFAULT 'cron',
  "notes"       TEXT,
  "created_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "backup_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "backup_events_created_at_idx" ON "backup_events"("created_at");

CREATE TABLE "maintenance_windows" (
  "id"             TEXT          NOT NULL,
  "starts_at"      TIMESTAMP(3)  NOT NULL,
  "ends_at"        TIMESTAMP(3)  NOT NULL,
  "reason"         TEXT          NOT NULL,
  "message"        TEXT          NOT NULL,
  "allowed_roles"  JSONB         NOT NULL DEFAULT '["SUPER_ADMIN"]',
  "enabled_by"     TEXT          NOT NULL,
  "disabled_at"    TIMESTAMP(3),
  "disabled_by"    TEXT,
  "created_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "maintenance_windows_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "maintenance_windows_starts_at_ends_at_idx"
  ON "maintenance_windows"("starts_at", "ends_at");
CREATE INDEX "maintenance_windows_disabled_at_idx"
  ON "maintenance_windows"("disabled_at");
