-- F2: MFA real (TOTP). Secreto cifrado + códigos de recuperación (hash) en User.
-- Columnas nuevas, no destructivo; mfaEnabled ya existía.

ALTER TABLE "users"
  ADD COLUMN "mfa_secret" TEXT,
  ADD COLUMN "mfa_backup_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
