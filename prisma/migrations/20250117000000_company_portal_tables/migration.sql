-- ============================================================================
-- Migration: Portal de Empresa - Tablas Completas
-- Descripción: Añade todas las tablas necesarias para el portal de empresas
-- Fecha: 2025-01-17
-- ============================================================================

-- ============================================================================
-- 1. MENÚS Y PLATOS (para que empresas vean menús del día)
-- ============================================================================

-- Tabla de platos del catering
CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_catering TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Información del plato
    name TEXT NOT NULL,
    description TEXT,
    course TEXT NOT NULL, -- 'STARTER', 'MAIN', 'DESSERT', 'DRINK'
    
    -- Pricing
    price DECIMAL(8, 2) NOT NULL,
    
    -- Información nutricional y alérgenos
    allergens JSON DEFAULT '[]', -- ['gluten', 'lactose', 'nuts', ...]
    calories INTEGER,
    proteins DECIMAL(5, 2),
    carbs DECIMAL(5, 2),
    fats DECIMAL(5, 2),
    
    -- Etiquetas y filtros
    labels JSON DEFAULT '[]', -- ['vegetarian', 'vegan', 'gluten-free', ...]
    
    -- Media
    image_url TEXT,
    
    -- Estado
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dishes_tenant ON dishes(tenant_catering);
CREATE INDEX idx_dishes_course ON dishes(course);
CREATE INDEX idx_dishes_active ON dishes(active);

-- Tabla de programación de menús (qué platos están disponibles cada día)
CREATE TABLE IF NOT EXISTS dish_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_catering TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dish_id TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    
    -- Fecha de servicio
    service_date DATE NOT NULL,
    
    -- Disponibilidad
    available BOOLEAN DEFAULT true,
    max_quantity INTEGER, -- NULL = sin límite
    current_quantity INTEGER DEFAULT 0, -- Contador de pedidos
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tenant_catering, dish_id, service_date)
);

CREATE INDEX idx_dish_schedules_date ON dish_schedules(service_date);
CREATE INDEX idx_dish_schedules_tenant_date ON dish_schedules(tenant_catering, service_date);

-- ============================================================================
-- 2. INFORMES FISCALES (para auditorías y justificaciones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fiscal_reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_empresa TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Período del informe
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL, -- 1-12
    
    -- Métricas calculadas
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deductible_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    non_deductible_amount DECIMAL(10, 2) DEFAULT 0,
    deductibility_rate DECIMAL(5, 2) NOT NULL, -- % deducible
    
    -- Empleados
    employees_served INTEGER NOT NULL DEFAULT 0,
    days_with_service INTEGER NOT NULL DEFAULT 0,
    
    -- Cumplimiento fiscal
    orders_above_limit INTEGER DEFAULT 0, -- Pedidos >11€
    orders_without_proof INTEGER DEFAULT 0, -- Sin justificante
    orders_with_issues INTEGER DEFAULT 0, -- Problemas de trazabilidad
    
    -- Archivo generado
    file_url TEXT,
    signature_hash TEXT NOT NULL, -- Hash SHA-256 del contenido
    
    -- Timestamps
    generated_at TIMESTAMP DEFAULT NOW(),
    generated_by TEXT NOT NULL, -- User ID
    
    UNIQUE(tenant_empresa, period_year, period_month)
);

CREATE INDEX idx_fiscal_reports_tenant ON fiscal_reports(tenant_empresa);
CREATE INDEX idx_fiscal_reports_period ON fiscal_reports(period_year, period_month);

-- ============================================================================
-- 3. JUSTIFICANTES DE ENTREGA (para trazabilidad fiscal)
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_proofs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Información de entrega
    delivered_at TIMESTAMP NOT NULL,
    delivered_by TEXT, -- Nombre del repartidor
    delivery_method TEXT, -- 'in_person', 'locker', 'reception'
    
    -- Evidencia
    signature_image_url TEXT, -- Firma digital o foto
    geo_location JSON, -- {lat, lng}
    notes TEXT,
    
    -- Verificación
    verified_by TEXT, -- User ID que verifica
    verified_at TIMESTAMP,
    verification_hash TEXT NOT NULL, -- Hash SHA-256 para integridad
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(order_id)
);

CREATE INDEX idx_delivery_proofs_order ON delivery_proofs(order_id);
CREATE INDEX idx_delivery_proofs_delivered ON delivery_proofs(delivered_at);

-- ============================================================================
-- 4. NOTIFICACIONES (sistema de alertas y comunicación)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE, -- NULL = notificación para todos
    
    -- Tipo y contenido
    type TEXT NOT NULL, -- 'invoice', 'incident', 'alert', 'reminder', 'info'
    priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT, -- Link para "Ver más" o acción
    
    -- Estado
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP -- NULL = no expira
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- 5. CONFIGURACIÓN DE EMPRESA (preferencias operativas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Preferencias operativas
    delivery_location TEXT, -- Punto de entrega: "Recepción planta 3"
    delivery_instructions TEXT, -- Instrucciones especiales
    
    -- Notificaciones por email
    notifications_email TEXT[], -- Emails para recibir alertas
    notify_daily_summary BOOLEAN DEFAULT false,
    notify_incidents BOOLEAN DEFAULT true,
    notify_invoices BOOLEAN DEFAULT true,
    notify_low_adoption BOOLEAN DEFAULT true,
    
    -- Preferencias de visualización
    default_view_employees TEXT DEFAULT 'table', -- 'table', 'grid', 'list'
    default_period_reports TEXT DEFAULT 'month', -- 'week', 'month', 'quarter'
    
    -- Límites y alertas personalizadas
    alert_cancellation_rate DECIMAL(5, 2) DEFAULT 20.00, -- Alertar si >20% cancelaciones
    alert_adoption_rate DECIMAL(5, 2) DEFAULT 50.00, -- Alertar si <50% adopción
    alert_deductibility_rate DECIMAL(5, 2) DEFAULT 85.00, -- Alertar si <85% deducible
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_company_settings_tenant ON company_settings(tenant_id);

-- ============================================================================
-- 6. VALORACIONES DE EMPLEADOS (feedback sobre menús)
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_ratings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Valoración
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    
    -- Feedback detallado (opcional)
    taste_rating INTEGER CHECK (taste_rating >= 1 AND taste_rating <= 5),
    portion_rating INTEGER CHECK (portion_rating >= 1 AND portion_rating <= 5),
    presentation_rating INTEGER CHECK (presentation_rating >= 1 AND presentation_rating <= 5),
    
    -- Comentario
    comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_ratings_order ON order_ratings(order_id);
CREATE INDEX idx_order_ratings_employee ON order_ratings(employee_id);
CREATE INDEX idx_order_ratings_rating ON order_ratings(rating);

-- ============================================================================
-- 7. INVITACIONES DE EMPLEADOS (sistema de onboarding)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_invitations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Datos del invitado
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    position TEXT,
    
    -- Token de invitación
    token TEXT NOT NULL UNIQUE,
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'
    
    -- Datos de aceptación
    accepted_at TIMESTAMP,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Timestamps
    sent_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL, -- Expira en 7 días por defecto
    created_by TEXT NOT NULL, -- User ID que envió la invitación
    
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_employee_invitations_tenant ON employee_invitations(tenant_id);
CREATE INDEX idx_employee_invitations_token ON employee_invitations(token);
CREATE INDEX idx_employee_invitations_status ON employee_invitations(status);
CREATE INDEX idx_employee_invitations_email ON employee_invitations(email);

-- ============================================================================
-- 8. TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Trigger para dishes
CREATE OR REPLACE FUNCTION update_dishes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dishes_updated_at
    BEFORE UPDATE ON dishes
    FOR EACH ROW
    EXECUTE FUNCTION update_dishes_updated_at();

-- Trigger para dish_schedules
CREATE OR REPLACE FUNCTION update_dish_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dish_schedules_updated_at
    BEFORE UPDATE ON dish_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_dish_schedules_updated_at();

-- Trigger para company_settings
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_company_settings_updated_at();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

