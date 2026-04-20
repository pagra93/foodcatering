#!/bin/bash
# Marca las 10 migraciones existentes como aplicadas.
# Uso: DATABASE_URL="<prod>" bash scripts/mark-prod-migrations.sh
#
# Necesario una sola vez cuando se inicializa comidas_prod con `prisma db push`
# (porque db push no escribe en _prisma_migrations). Después el entrypoint
# puede hacer `prisma migrate deploy` normal sin re-aplicar nada.

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está definida. Abortando."
  exit 1
fi

MIGRATIONS=(
  "20250117000000_company_portal_tables"
  "20251117000000_company_enhancements"
  "20260418000000_delivery_routes_invoice_expansion_dish_extras"
  "20260419000001_rename_employee_invitation_to_user_invitation"
  "20260419000002_add_penalty_model"
  "20260419000003_add_compliance_models"
  "20260419000004_add_billing_models"
  "20260419000005_add_operations_models"
  "20260419000006_add_branding_and_system_settings"
  "20260419000007_add_catalogs"
)

for m in "${MIGRATIONS[@]}"; do
  echo "→ $m"
  pnpm prisma migrate resolve --applied "$m"
done

echo ""
echo "✅ ${#MIGRATIONS[@]} migraciones marcadas como aplicadas."
