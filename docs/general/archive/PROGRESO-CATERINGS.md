# 🍽️ Sistema de Gestión de Caterings - Progreso

## ✅ COMPLETADO (Fase 1)

### 1. Base de Datos - Modelo Restaurant Extendido

**Campos añadidos a `restaurants`:**

#### Información Legal
- ✅ `legal_name` - Razón social
- ✅ `cif` - CIF único
- ✅ `billing_address` - Dirección fiscal
- ✅ `iban` - Cuenta bancaria
- ✅ `contact_person` - Persona de contacto
- ✅ `contact_email` - Email de contacto
- ✅ `contact_phone` - Teléfono de contacto

#### Capacidad y Operación
- ✅ `daily_capacity` - Capacidad diaria (platos)
- ✅ `preparation_window` - Ventana de preparación (ej: "08:00-11:00")
- ✅ `delivery_window` - Ventana de entrega (ej: "12:00-14:00")
- ✅ `cutoff_time` - Hora de corte (ej: "11:00")
- ✅ `lead_time_minutes` - Tiempo de preparación (minutos)
- ✅ `operational_days` - Días operativos (JSON array)

#### Económico
- ✅ `commission` - Comisión % (DECIMAL 5,4)
- ✅ `minimum_billing` - Facturación mínima
- ✅ `payment_cycle` - Ciclo de pago (SEMANAL/QUINCENAL/MENSUAL)

#### SLAs y Métricas
- ✅ `punctuality_rate` - % puntualidad
- ✅ `incident_rate` - % incidencias
- ✅ `average_rating` - Rating promedio

#### Estado
- ✅ `operational_status` - Estado operativo (ACTIVE/SUSPENDED/UNDER_REVIEW)
- ✅ `suspended_at` - Fecha de suspensión
- ✅ `suspended_reason` - Razón de suspensión

### 2. Queries Completas - `/lib/db/queries/caterings.ts`

**Funciones creadas:**

#### `getCateringById(tenantId)`
Obtiene información completa del catering incluyendo:
- ✅ Información base del tenant
- ✅ Datos del restaurante (legal, operativo, económico)
- ✅ Documentos con estado y fechas de caducidad
- ✅ Platos activos con programación
- ✅ Usuarios del catering
- ✅ KPIs de los últimos 30 días:
  - Total de pedidos
  - Pedidos entregados
  - Tasa de puntualidad
  - Tasa de incidencias
  - Rating promedio
  - Documentos por caducar/caducados
- ✅ Alertas automáticas:
  - Documentos caducados
  - Documentos por caducar (≤30 días)
  - Incidencias críticas abiertas
  - Baja puntualidad (<90%)
  - Alta tasa de incidencias (>5%)
- ✅ Actividad reciente (últimos 10 pedidos)
- ✅ Incidencias recientes

#### `getCaterings({filtros})`
Lista de caterings con:
- ✅ Paginación
- ✅ Búsqueda por nombre/subdominio
- ✅ Filtro por estado
- ✅ Filtro por estado operativo
- ✅ Filtro por estado de documentos

#### `createCatering(data)`
Crea catering completo en transacción:
- ✅ Tenant
- ✅ Restaurant
- ✅ Validación de datos

#### `updateCatering(tenantId, data)`
Actualiza catering:
- ✅ Datos del tenant
- ✅ Datos del restaurant
- ✅ Transacción atómica

---

## 🚧 PENDIENTE (Fase 2-5)

### Fase 2: Páginas de UI

#### Página de Detalle de Catering
**Ruta:** `/admin/caterings/[id]`

**Tabs a implementar:**

1. **Overview** (Prioridad: ALTA)
   - [ ] Header con logo, nombre, estado operativo
   - [ ] KPIs en cards (pedidos, puntualidad, incidencias, rating)
   - [ ] Sistema de semáforos (verde/amarillo/rojo)
   - [ ] Gráfico de capacidad vs demanda
   - [ ] Mapa de zonas activas
   - [ ] Panel de alertas críticas

2. **Calidad & Cumplimiento** (Prioridad: ALTA)
   - [ ] Tabla de documentos con estados
   - [ ] Indicadores visuales de caducidad
   - [ ] Historial de auditorías
   - [ ] SLAs y penalizaciones
   - [ ] Políticas de alérgenos

3. **Operación Diaria** (Prioridad: MEDIA)
   - [ ] Calendario de menús
   - [ ] Hojas de cocina (preview)
   - [ ] Hojas de empaquetado por empresa
   - [ ] Logística y rutas
   - [ ] Incidencias del día

4. **Menús & Platos** (Prioridad: MEDIA)
   - [ ] Catálogo de platos
   - [ ] Programación semanal
   - [ ] Control de precios
   - [ ] Stock y sustituciones

5. **Facturación & Pagos** (Prioridad: MEDIA)
   - [ ] Facturas emitidas
   - [ ] Liquidaciones
   - [ ] Historial de comisiones
   - [ ] Descargas (PDF, CSV)

6. **Incidencias** (Prioridad: BAJA)
   - [ ] Cola de incidencias
   - [ ] Filtros y búsqueda
   - [ ] Resoluciones estándar
   - [ ] SLA tracking

7. **Usuarios & Permisos** (Prioridad: BAJA)
   - [ ] Lista de usuarios
   - [ ] Roles del catering
   - [ ] MFA y seguridad

8. **Registro de Actividad** (Prioridad: BAJA)
   - [ ] Audit log
   - [ ] Export de trazabilidad

#### Página de Lista de Caterings
**Ruta:** `/admin/caterings`

- [ ] Tabla master con todas las columnas importantes
- [ ] Filtros avanzados
- [ ] Búsqueda
- [ ] Acciones bulk
- [ ] KPIs globales en header

### Fase 3: Formularios

#### Formulario de Creación (Wizard)
**Ruta:** `/admin/caterings/new`

**Steps:**
1. [ ] Datos Legales
2. [ ] Documentación Sanitaria (subida de archivos)
3. [ ] Zonas de Servicio
4. [ ] Capacidad y Horarios
5. [ ] Comisiones y Condiciones Económicas
6. [ ] Usuarios y Roles Iniciales
7. [ ] Checklist Final y Publicar

#### Formulario de Edición
**Ruta:** `/admin/caterings/[id]/edit`

- [ ] Mismos campos que creación
- [ ] Pre-poblado con datos existentes
- [ ] Validación de cambios

### Fase 4: Componentes Reutilizables

#### Sistema de Alertas/Semáforos
**Ubicación:** `/components/admin/caterings/alerts/`

- [ ] `DocumentStatusBadge` - Verde/Amarillo/Rojo según caducidad
- [ ] `SLAIndicator` - Indicador de cumplimiento de SLA
- [ ] `CapacityGauge` - Medidor de capacidad utilizada
- [ ] `RatingDisplay` - Visualización de rating con estrellas
- [ ] `AlertPanel` - Panel de alertas críticas

#### Componentes de Dashboard
**Ubicación:** `/components/admin/caterings/dashboard/`

- [ ] `CateringKPICard` - KPI card específico para caterings
- [ ] `DocumentsTable` - Tabla de documentos con estados
- [ ] `ZonesMap` - Mapa de zonas de servicio
- [ ] `MenuCalendar` - Calendario de menús programados
- [ ] `CapacityChart` - Gráfico de capacidad vs demanda
- [ ] `PunctualityChart` - Gráfico de puntualidad

### Fase 5: Validaciones y Utilidades

#### Validaciones Zod
**Ubicación:** `/lib/validations/catering.ts`

- [ ] `cateringSchema` - Validación completa
- [ ] `cateringLegalSchema` - Solo datos legales
- [ ] `cateringOperationalSchema` - Solo datos operativos
- [ ] `cateringZonesSchema` - Validación de zonas
- [ ] `cateringDocumentSchema` - Validación de documentos

#### Utilidades
**Ubicación:** `/lib/utils/caterings.ts`

- [ ] `calculateSemaphoreStatus()` - Calcula estado de semáforo
- [ ] `isDocumentExpiring()` - Verifica si doc está por caducar
- [ ] `isDocumentExpired()` - Verifica si doc caducó
- [ ] `calculatePunctualityStatus()` - Calcula estado de puntualidad
- [ ] `calculateCapacityStatus()` - Calcula uso de capacidad
- [ ] `formatZoneDisplay()` - Formatea zonas para display

---

## 📊 Estructura de Datos

### Esquema de Restaurant (Completo)

```typescript
{
  // Identificación
  id: string
  tenantId: string
  displayName: string
  
  // Legal
  legalName: string
  cif: string (unique)
  billingAddress: string
  iban: string?
  contactPerson: string
  contactEmail: string
  contactPhone: string
  
  // Operación
  dailyCapacity: number (default: 100)
  preparationWindow: string? ("08:00-11:00")
  deliveryWindow: string? ("12:00-14:00")
  cutoffTime: string (default: "11:00")
  leadTimeMinutes: number (default: 180)
  operationalDays: Json (["monday", "tuesday", ...])
  
  // Zonas
  zones: Json ([{
    name: string
    postalCodes: string[]
    maxDistance: number
    operator: string
  }])
  
  // Económico
  commission: Decimal (5,4) (default: 0.05)
  minimumBilling: Decimal (8,2)
  paymentCycle: string (default: "MENSUAL")
  
  // SLAs
  punctualityRate: Decimal? (5,2)
  incidentRate: Decimal? (5,2)
  averageRating: Decimal? (3,2)
  
  // Estado
  documentsStatus: DocumentStatus
  operationalStatus: string (ACTIVE/SUSPENDED/UNDER_REVIEW)
  suspendedAt: DateTime?
  suspendedReason: string?
  
  // Relaciones
  documents: RestaurantDocument[]
  dishes: Dish[]
}
```

### Response de `getCateringById()`

```typescript
{
  // Tenant base
  id, name, subdomain, status, ...
  
  // Restaurant completo
  restaurant: {
    id, displayName, legalName, cif,
    billingAddress, iban, contactPerson,
    dailyCapacity, cutoffTime, operationalDays,
    zones, commission, operationalStatus, ...
  }
  
  // Documentos con estado
  documents: [{
    id, type, fileUrl, issuedAt, expiresAt,
    status, verifiedBy, verifiedAt
  }]
  
  // Platos activos
  dishes: [{
    id, name, course, labels, nutrition,
    basePrice, active, scheduledDays
  }]
  
  // Usuarios
  users: [...]
  
  // KPIs calculados
  kpis: {
    totalOrders, deliveredOrders,
    punctualityRate, incidentRate,
    incidentsCount, avgRating,
    expiringDocsCount, expiredDocsCount
  }
  
  // Alertas automáticas
  alerts: {
    expiredDocs: [...],
    expiringDocs: [...],
    criticalIncidents: [...],
    lowPunctuality: boolean,
    highIncidentRate: boolean
  }
  
  // Actividad
  recentOrders: [...]
  incidents: [...]
}
```

---

## 🎯 Próximos Pasos Recomendados

### Inmediatos (Hoy)
1. Crear página de detalle básica `/admin/caterings/[id]`
2. Implementar Tab Overview con KPIs
3. Crear componentes de alertas/semáforos
4. Implementar Tab Calidad & Cumplimiento

### Corto Plazo (Esta Semana)
5. Crear página de lista `/admin/caterings`
6. Implementar formulario de creación (wizard)
7. Completar Tabs restantes
8. Sistema de documentos con validación

### Medio Plazo (Próxima Semana)
9. Integración de mapas para zonas
10. Sistema de facturación
11. Hojas de cocina/empaquetado
12. Sistema completo de incidencias

---

## 📝 Notas Importantes

- **Todos los Decimal** deben ser convertidos a `number` antes de pasar a Client Components
- **Sistema de semáforos** debe ser visual y claro
- **Alertas** deben ser proactivas y prioritarias
- **Documentos** son críticos - bloquear operación si caducados
- **Multi-tenant** siempre validar `tenantId`
- **SLAs** deben calcularse en tiempo real
- **Capacidad** debe monitorizarse constantemente

---

**Estado**: Base de datos y queries completadas ✅  
**Siguiente**: Implementar UI con tabs  
**Prioridad**: Alta - Sistema crítico para operación  
**Fecha**: Noviembre 2025

