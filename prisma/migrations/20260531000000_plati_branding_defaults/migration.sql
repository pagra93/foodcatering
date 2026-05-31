-- Rebrand Plati: actualiza los DEFAULT del singleton SystemSettings.
-- No destructivo: cambia el valor por defecto de columnas y realinea el
-- singleton solo si conserva los valores antiguos (no pisa marca personalizada).
-- Nota: la columna del nombre de marca es "brandName" (sin @map en el schema).

ALTER TABLE "system_settings"
  ALTER COLUMN "default_primary_color" SET DEFAULT '#E0492A';

ALTER TABLE "system_settings"
  ALTER COLUMN "brandName" SET DEFAULT 'Plati';

UPDATE "system_settings"
  SET "default_primary_color" = '#E0492A'
  WHERE "id" = 'singleton' AND "default_primary_color" = '#3B82F6';

UPDATE "system_settings"
  SET "brandName" = 'Plati'
  WHERE "id" = 'singleton' AND "brandName" = 'SinTupper';
