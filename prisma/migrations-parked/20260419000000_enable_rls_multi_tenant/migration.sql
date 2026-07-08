-- Row Level Security (RLS) multi-tenant — schema actual (2026-07).
--
-- Modelo:
--   * current_setting('app.tenant_id') / 'app.role' los fija el código con
--     withTenantContext() (lib/db/prisma.ts) o el mecanismo automático de tenant.
--   * SUPER_ADMIN bypassa con app.role='super_admin'.
--   * Tablas "catálogo" con tenant NULL = filas globales, visibles para todos.
--   * Tablas dependientes (sin columna de tenant) heredan del padre vía EXISTS.
--   * FORCE ROW LEVEL SECURITY: aplica aunque el rol de la app sea owner.
--
-- 🚨 NO aplicar hasta que TODA lectura pase por el contexto de tenant. Sin
-- contexto, las policies devuelven 0 filas (fail-closed: sin fuga, vista vacía).
-- Revertir: ALTER TABLE ... DISABLE ROW LEVEL SECURITY; DROP POLICY ... .

-- ── Helpers de sesión ───────────────────────────────────────────────────────
-- Las columnas de tenant son TEXT (String en Prisma), no uuid → devolvemos text.
-- Si la variable no está fijada, current_setting(...,true) devuelve NULL y las
-- comparaciones `tenant = NULL` no casan ninguna fila (fail-closed).
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
BEGIN
  RETURN NULLIF(current_setting('app.tenant_id', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(current_setting('app.role', true), '') = 'super_admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- Aplica una policy estándar. `expr` es la condición de pertenencia al tenant.
CREATE OR REPLACE FUNCTION _rls_apply(tbl text, expr text) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I USING (%s OR is_super_admin()) WITH CHECK (%s OR is_super_admin())',
    tbl, expr, expr
  );
END;
$$ LANGUAGE plpgsql;

-- ── 1) tenant_id directo (estricto) ─────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','companies','company_policies','company_settings','company_sites',
    'delivery_routes','dish_schedules','dishes','dpa_agreements','employees',
    'gdpr_requests','holiday_overrides','notifications','restaurant_documents',
    'restaurants','user_invitations'
  ] LOOP
    PERFORM _rls_apply(t, 'tenant_id = current_tenant_id()');
  END LOOP;
END $$;

-- ── 2) tenant_id con filas globales (tenant_id NULL = catálogo compartido) ───
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['holidays','incident_reasons'] LOOP
    PERFORM _rls_apply(t, '(tenant_id IS NULL OR tenant_id = current_tenant_id())');
  END LOOP;
END $$;

-- ── 3) tenant_catering (estricto) ───────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['delivery_zones','menu_templates','penalties','restaurant_audits'] LOOP
    PERFORM _rls_apply(t, 'tenant_catering = current_tenant_id()');
  END LOOP;
END $$;

-- ── 4) tenant_empresa ───────────────────────────────────────────────────────
SELECT _rls_apply('fiscal_reports', 'tenant_empresa = current_tenant_id()');
SELECT _rls_apply('saas_invoices', 'tenant_empresa = current_tenant_id()');
-- saas_plans: los de sistema tienen tenant_empresa NULL (globales) + a medida por empresa
SELECT _rls_apply('saas_plans', '(tenant_empresa IS NULL OR tenant_empresa = current_tenant_id())');

-- ── 5) Dos lados (empresa o catering) ───────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['company_catering_assignments','dish_ratings','incidents','invoices','orders'] LOOP
    PERFORM _rls_apply(t, '(tenant_empresa = current_tenant_id() OR tenant_catering = current_tenant_id())');
  END LOOP;
END $$;

-- ── 6) audit_logs: tenant_id nullable (acciones root). ──────────────────────
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "audit_logs";
CREATE POLICY tenant_isolation ON "audit_logs" USING (
  is_super_admin() OR (tenant_id IS NOT NULL AND tenant_id = current_tenant_id())
);

-- ── 7) Dependientes (sin columna de tenant) → heredan del padre ─────────────
CREATE OR REPLACE FUNCTION _rls_apply_via_order(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I USING (is_super_admin() OR EXISTS ('
    'SELECT 1 FROM orders o WHERE o.id = %I.order_id AND '
    '(o.tenant_empresa = current_tenant_id() OR o.tenant_catering = current_tenant_id())))',
    tbl, tbl
  );
END;
$$ LANGUAGE plpgsql;

SELECT _rls_apply_via_order('order_history');
SELECT _rls_apply_via_order('order_ratings');
SELECT _rls_apply_via_order('delivery_proofs');

ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "invoice_lines";
CREATE POLICY tenant_isolation ON "invoice_lines" USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id
      AND (i.tenant_empresa = current_tenant_id() OR i.tenant_catering = current_tenant_id())
  )
);

ALTER TABLE "delivery_route_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_route_sites" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "delivery_route_sites";
CREATE POLICY tenant_isolation ON "delivery_route_sites" USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM delivery_routes r WHERE r.id = delivery_route_sites.route_id
      AND r.tenant_id = current_tenant_id()
  )
);

DROP FUNCTION _rls_apply(text, text);
DROP FUNCTION _rls_apply_via_order(text);
