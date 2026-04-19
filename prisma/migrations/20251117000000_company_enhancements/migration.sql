-- ============================================================================
-- MIGRATION: Mejoras para Gestión Completa de Empresas
-- Fecha: 2025-11-17
-- Descripción: Añade campos faltantes y tabla de asignación empresa-catering
-- ============================================================================

-- 1. Añadir campos adicionales a Company
-- Información de contacto y negocio
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_rrhh_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_rrhh_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_rrhh_phone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_finance_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_finance_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_finance_phone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_url TEXT;

-- 2. Añadir campos de documentación fiscal
ALTER TABLE companies ADD COLUMN IF NOT EXISTS digital_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cif_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_annexes JSON DEFAULT '[]';

-- 3. Añadir campos de estado y métricas (calculadas pero cacheadas)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_order_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_spend DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deductibility_rate DECIMAL(5, 2) DEFAULT 100.00;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS adoption_rate DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status_notes TEXT;

-- 4. Crear ENUM para tipo de asignación de catering
DO $$ BEGIN
    CREATE TYPE assignment_type AS ENUM ('primary', 'backup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Crear tabla de asignación Empresa ↔ Catering
CREATE TABLE IF NOT EXISTS company_catering_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_empresa TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_catering TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type assignment_type NOT NULL DEFAULT 'primary',
    
    -- Configuración específica de la asignación
    zones JSON DEFAULT '[]', -- Zonas específicas para este catering
    priority INTEGER DEFAULT 1, -- 1 = mayor prioridad
    
    -- SLAs acordados específicos (pueden diferir de los globales del catering)
    sla_punctuality DECIMAL(5, 2), -- % mínimo de puntualidad
    sla_incident_rate DECIMAL(5, 2), -- % máximo de incidencias
    
    -- Estado y tracking
    active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by TEXT NOT NULL, -- ID del usuario que asignó
    deactivated_at TIMESTAMP,
    deactivated_by TEXT,
    deactivation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_type CHECK (type IN ('primary', 'backup'))
);

-- 6. Crear índices para company_catering_assignments
CREATE INDEX IF NOT EXISTS idx_cca_tenant_empresa ON company_catering_assignments(tenant_empresa);
CREATE INDEX IF NOT EXISTS idx_cca_tenant_catering ON company_catering_assignments(tenant_catering);
CREATE INDEX IF NOT EXISTS idx_cca_active ON company_catering_assignments(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_cca_type ON company_catering_assignments(type);
CREATE INDEX IF NOT EXISTS idx_cca_empresa_active ON company_catering_assignments(tenant_empresa, active) WHERE active = true;

-- 6.1 Crear unique index parcial para asegurar solo un PRIMARY activo por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_primary_catering 
    ON company_catering_assignments(tenant_empresa) 
    WHERE type = 'primary' AND active = true;

-- 7. Añadir campos adicionales a CompanySite
ALTER TABLE company_sites ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE company_sites ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE company_sites ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE company_sites ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE company_sites ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE company_sites ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- 8. Añadir campos adicionales a Employee (si no existen)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekly_menu_days INTEGER DEFAULT 4; -- Días con menú por semana
ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(8, 2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;

-- 9. Crear índices adicionales para Employee
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_start_date ON employees(start_date);
CREATE INDEX IF NOT EXISTS idx_employees_status_active ON employees(status) WHERE status = 'active';

-- 10. Añadir campos de tracking a CompanyPolicy
ALTER TABLE company_policies ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE company_policies ADD COLUMN IF NOT EXISTS changed_by TEXT;
ALTER TABLE company_policies ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- 11. Crear tabla de historial de cambios de política (para auditoría)
CREATE TABLE IF NOT EXISTS company_policy_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    policy_id TEXT NOT NULL REFERENCES company_policies(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Valores anteriores (snapshot)
    previous_values JSON NOT NULL,
    new_values JSON NOT NULL,
    
    -- Cambio
    version INTEGER NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by TEXT NOT NULL,
    change_reason TEXT,
    
    -- Índices
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cph_policy_id ON company_policy_history(policy_id);
CREATE INDEX IF NOT EXISTS idx_cph_company_id ON company_policy_history(company_id);
CREATE INDEX IF NOT EXISTS idx_cph_changed_at ON company_policy_history(changed_at);

-- 12. Crear índices adicionales para Orders (optimización de queries)
CREATE INDEX IF NOT EXISTS idx_orders_tenant_empresa_date ON orders(tenant_empresa, service_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tenant_empresa_status ON orders(tenant_empresa, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_employee_date ON orders(employee_id, service_date DESC);

-- 13. Crear índices adicionales para Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_empresa_status ON incidents(tenant_empresa, status);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_empresa_created ON incidents(tenant_empresa, created_at DESC);

-- 14. Crear índices adicionales para Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_empresa_period ON invoices(tenant_empresa, period);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date) WHERE status NOT IN ('paid', 'void');

-- 15. Añadir trigger para actualizar updated_at en company_catering_assignments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cca_updated_at BEFORE UPDATE ON company_catering_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. Añadir comentarios a las tablas (documentación)
COMMENT ON TABLE company_catering_assignments IS 'Asignación de caterings a empresas (principal y backups)';
COMMENT ON TABLE company_policy_history IS 'Historial de cambios en políticas de empresa (auditoría)';
COMMENT ON COLUMN companies.deductibility_rate IS 'Porcentaje de gasto deducible (calculado, cacheado)';
COMMENT ON COLUMN companies.adoption_rate IS 'Porcentaje de empleados que usan el servicio (calculado, cacheado)';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

