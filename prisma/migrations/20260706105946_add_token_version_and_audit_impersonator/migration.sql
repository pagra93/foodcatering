-- H7: invalidación de sesiones activas (se incrementa para forzar re-login)
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

-- H8: admin real cuando una acción se hizo bajo impersonación
ALTER TABLE "audit_logs" ADD COLUMN "impersonator_id" TEXT;
