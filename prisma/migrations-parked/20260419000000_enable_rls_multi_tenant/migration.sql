-- Habilita Row Level Security (RLS) en las tablas multi-tenant.
--
-- Modelo de aislamiento:
--   * Cada tabla tenant-owned tiene una policy que exige que
--     `current_setting('app.tenant_id')::uuid` coincida con el tenantId de la
--     fila (o con tenant_empresa / tenant_catering según el caso).
--   * Los super admins pueden bypassear con `current_setting('app.role') = 'super_admin'`.
--   * El código setea estas variables de sesión con `withTenantContext()`
--     (ver lib/db/prisma.ts). Si un query no llama a ese wrapper, las policies
--     bloquean TODAS las filas.
--
-- 🚨 ATENCIÓN: aplicar esta migración rompe cualquier query que no use
-- `withTenantContext()`. Antes de aplicarla en producción hay que migrar las
-- queries críticas a ese wrapper. El plan es hacerlo progresivamente por
-- módulo (portal empleado → portal empresa → portal catering → admin), con
-- tests E2E de aislamiento verdes en CI antes del merge.
--
-- Para activar en staging / tests sin miedo:
--   ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY ... USING (...);
-- Para revertir:
--   ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
--   DROP POLICY tenant_isolation ON <tabla>;

-- ============================================================================
-- Función helper: devuelve el tenant activo o NULL si no está seteado
-- ============================================================================

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
BEGIN
  BEGIN
    RETURN current_setting('app.tenant_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_role() RETURNS text AS $$
BEGIN
  RETURN COALESCE(current_setting('app.role', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean AS $$
BEGIN
  RETURN current_app_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Tablas con columna directa tenant_id
-- ============================================================================

-- users, employees, companies, company_sites, company_policies,
-- company_policy_history, company_settings, restaurants, restaurant_documents,
-- dishes, dish_schedules, integrations, webhooks, delivery_routes,
-- employee_invitations, restaurant_audits, company_exports

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'employees',
    'companies',
    'company_sites',
    'company_policies',
    'company_policy_history',
    'company_settings',
    'restaurants',
    'restaurant_documents',
    'dishes',
    'dish_schedules',
    'integrations',
    'webhooks',
    'delivery_routes',
    'employee_invitations',
    'restaurant_audits',
    'company_exports'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_tenant_id() OR is_super_admin())',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- Tablas con dos lados (tenant_empresa + tenant_catering)
-- ============================================================================

-- orders, incidents, invoices, daily_snapshots, company_catering_assignments
-- Se permite lectura si CUALQUIERA de las dos columnas coincide con el tenant actual.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'orders',
    'incidents',
    'invoices',
    'daily_snapshots'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ('
      'tenant_empresa = current_tenant_id() '
      'OR tenant_catering = current_tenant_id() '
      'OR is_super_admin())',
      tbl
    );
  END LOOP;
END $$;

-- company_catering_assignments usa tenant_empresa y tenant_catering también
ALTER TABLE "company_catering_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "company_catering_assignments" USING (
  tenant_empresa = current_tenant_id()
  OR tenant_catering = current_tenant_id()
  OR is_super_admin()
);

-- kitchen_sheets y packing_sheets usan tenant_catering
ALTER TABLE "kitchen_sheets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "kitchen_sheets" USING (
  tenant_catering = current_tenant_id() OR is_super_admin()
);

ALTER TABLE "packing_sheets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "packing_sheets" USING (
  tenant_catering = current_tenant_id()
  OR tenant_empresa = current_tenant_id()
  OR is_super_admin()
);

-- fiscal_reports usa tenant_empresa
ALTER TABLE "fiscal_reports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fiscal_reports" USING (
  tenant_empresa = current_tenant_id() OR is_super_admin()
);

-- ============================================================================
-- Tablas dependientes (sin tenant directo, accedidas vía parent)
-- ============================================================================

-- order_history, delivery_events, delivery_proofs → heredan de orders
-- invoice_lines → heredan de invoices
-- order_ratings → heredan de orders
-- delivery_route_sites, delivery_route_events → heredan de delivery_routes
-- webhook_deliveries → heredan de webhooks
-- audit_logs → permisivo (tenantId nullable para acciones root)
-- notifications → tenant_id directo + userId

-- order_history
ALTER TABLE "order_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "order_history" USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_history.order_id
      AND (o.tenant_empresa = current_tenant_id() OR o.tenant_catering = current_tenant_id())
  )
  OR is_super_admin()
);

ALTER TABLE "delivery_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "delivery_events" USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = delivery_events.order_id
      AND (o.tenant_empresa = current_tenant_id() OR o.tenant_catering = current_tenant_id())
  )
  OR is_super_admin()
);

ALTER TABLE "delivery_proofs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "delivery_proofs" USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = delivery_proofs.order_id
      AND (o.tenant_empresa = current_tenant_id() OR o.tenant_catering = current_tenant_id())
  )
  OR is_super_admin()
);

ALTER TABLE "order_ratings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "order_ratings" USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_ratings.order_id
      AND (o.tenant_empresa = current_tenant_id() OR o.tenant_catering = current_tenant_id())
  )
  OR is_super_admin()
);

ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoice_lines" USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_lines.invoice_id
      AND (i.tenant_empresa = current_tenant_id() OR i.tenant_catering = current_tenant_id())
  )
  OR is_super_admin()
);

ALTER TABLE "delivery_route_sites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "delivery_route_sites" USING (
  EXISTS (
    SELECT 1 FROM delivery_routes r
    WHERE r.id = delivery_route_sites.route_id
      AND r.tenant_id = current_tenant_id()
  )
  OR is_super_admin()
);

ALTER TABLE "delivery_route_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "delivery_route_events" USING (
  EXISTS (
    SELECT 1 FROM delivery_routes r
    WHERE r.id = delivery_route_events.route_id
      AND r.tenant_id = current_tenant_id()
  )
  OR is_super_admin()
);

ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "webhook_deliveries" USING (
  EXISTS (
    SELECT 1 FROM webhooks w
    WHERE w.id = webhook_deliveries.webhook_id
      AND w.tenant_id = current_tenant_id()
  )
  OR is_super_admin()
);

-- notifications: tenant_id directo
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notifications" USING (
  tenant_id = current_tenant_id() OR is_super_admin()
);

-- audit_logs: tenantId puede ser NULL (acciones root). Super admin ve todo,
-- resto de roles sólo ven logs de su tenant.
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_logs" USING (
  is_super_admin()
  OR (tenant_id IS NOT NULL AND tenant_id = current_tenant_id())
);
