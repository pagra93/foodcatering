-- Rename model EmployeeInvitation -> UserInvitation and add `role` column.
-- Antes el modelo asumía rol EMPLEADO implícito; ahora permite invitar a
-- cualquier rol (RRHH, FINANZAS, ADMIN_CATERING, CHEF, …).
-- Genera migración manual (no autogenerada por Prisma) porque:
--   1) El user Postgres de dev no tiene CREATEDB para la shadow DB.
--   2) ALTER TABLE ... RENAME es más seguro que DROP + CREATE (preserva
--      datos y FKs si en futuro alguna referencia entra).

-- Rename the table (keep the data).
ALTER TABLE "employee_invitations" RENAME TO "user_invitations";

-- Rename indexes to new naming convention (*_invitations_*).
ALTER INDEX IF EXISTS "employee_invitations_pkey"
  RENAME TO "user_invitations_pkey";
ALTER INDEX IF EXISTS "employee_invitations_tenant_id_email_key"
  RENAME TO "user_invitations_tenant_id_email_key";
ALTER INDEX IF EXISTS "employee_invitations_token_key"
  RENAME TO "user_invitations_token_key";
ALTER INDEX IF EXISTS "employee_invitations_tenant_id_idx"
  RENAME TO "user_invitations_tenant_id_idx";
ALTER INDEX IF EXISTS "employee_invitations_token_idx"
  RENAME TO "user_invitations_token_idx";
ALTER INDEX IF EXISTS "employee_invitations_status_idx"
  RENAME TO "user_invitations_status_idx";
ALTER INDEX IF EXISTS "employee_invitations_email_idx"
  RENAME TO "user_invitations_email_idx";

-- company_id passes to nullable because ahora invitamos a usuarios que no
-- siempre están vinculados a una Company (tenants CATERING no tienen).
ALTER TABLE "user_invitations" ALTER COLUMN "company_id" DROP NOT NULL;

-- Add role column. Default EMPLEADO para filas preexistentes; después se
-- elimina el default para forzar explícito en inserciones futuras.
ALTER TABLE "user_invitations"
  ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'EMPLEADO';
ALTER TABLE "user_invitations" ALTER COLUMN "role" DROP DEFAULT;

-- New index on role for filtered queries.
CREATE INDEX "user_invitations_role_idx" ON "user_invitations"("role");
