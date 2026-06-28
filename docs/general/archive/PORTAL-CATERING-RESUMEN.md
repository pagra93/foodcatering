# Portal del Catering - Resumen Ejecutivo

## 🎯 Objetivo

Desarrollar el portal completo para empresas de catering, permitiéndoles gestionar toda su operación: platos, menús, producción, repartos, facturación e incidencias.

---

## 📊 Estado Actual vs. Necesario

### ✅ Lo que YA tenemos:

| Componente | Estado | Ubicación |
|------------|--------|-----------|
| **Schema de BD** | 100% completo | `prisma/schema.prisma` |
| **Tablas necesarias** | 18/18 ✅ | Restaurant, Dish, DishSchedule, Order, KitchenSheet, PackingSheet, Invoice, Incident, etc. |
| **Queries base** | 30% completas | `/lib/db/queries/caterings.ts` |
| **Componentes UI** | Reutilizables | `/components/ui` (shadcn) |
| **Patrón de desarrollo** | Establecido | Admin + Empresa ya desarrollados |

### ❌ Lo que necesitamos crear:

| Componente | Cantidad | Estimación |
|------------|----------|------------|
| **Páginas** | ~25 | 7 días |
| **Componentes específicos** | ~60 | 12 días |
| **APIs** | ~35 | 8 días |
| **Queries nuevas** | ~40 | 5 días |
| **Testing E2E** | 10 flujos críticos | 2 días |

**Total estimado**: **28-30 días** de desarrollo

---

## 🗺️ Arquitectura del Portal

```
PORTAL CATERING
├─ 📊 Dashboard
│  ├─ KPIs (producción, entregas, incidencias)
│  ├─ Alertas (docs caducados, incidencias críticas)
│  └─ Quick Actions (Ver cocina, Ver reparto, Subir menú)
│
├─ 🍽️ Platos (CRUD completo)
│  ├─ Lista con filtros
│  ├─ Crear/Editar
│  ├─ Clonar
│  ├─ Gestión de alérgenos
│  └─ Subida de imágenes
│
├─ 📅 Menús Semanales
│  ├─ Vista calendario
│  ├─ Editor por día
│  ├─ Publicación con validaciones
│  └─ Bloqueo post-cutoff
│
├─ 👨‍🍳 Producción Diaria
│  ├─ Consolidado automático (post-cutoff 11:05)
│  ├─ Vista por plato
│  ├─ Vista por empresa
│  ├─ Alertas de alergias
│  └─ Vista imprimible (cocina)
│
├─ 🚚 Repartos
│  ├─ Rutas del día
│  ├─ Checklist de entregas
│  ├─ Marcar completadas
│  ├─ Subir evidencias (foto + GPS)
│  └─ Generar etiquetas PDF
│
├─ 🏢 Empresas Asignadas
│  ├─ Lista con KPIs
│  ├─ Detalle por empresa
│  ├─ Historial de pedidos
│  └─ SLAs (puntualidad, incidencias)
│
├─ ⚠️ Incidencias
│  ├─ Board Kanban (open → in_progress → resolved)
│  ├─ Responder
│  ├─ Resolver
│  ├─ Compensar (ajuste factura)
│  └─ Timeline de cambios
│
├─ 💰 Facturación
│  ├─ Lista de facturas
│  ├─ Detalle con líneas
│  ├─ Generación automática mensual
│  ├─ Ajustes por incidencias
│  └─ PDF descargable
│
├─ 📋 Auditoría
│  ├─ Logs con filtros
│  ├─ Trail por recurso
│  └─ Diff before/after
│
└─ ⚙️ Configuración
   ├─ Datos legales
   ├─ Capacidad diaria
   ├─ Días operativos
   ├─ Zonas de reparto
   └─ Documentos
```

---

## 🔗 Dependencias con otros Portales

### Con Portal de Empresa:

```
EMPRESA                    CATERING
   ├─ Company  ←──────────→  CompanyCateringAssignment
   ├─ Order    ────────────→  Producción/Reparto
   └─ Incident ←──────────→  Gestión incidencias
```

### Con Portal de Empleado:

```
EMPLEADO                   CATERING
   ├─ Order    ────────────→  Producción
   ├─ Alergias ────────────→  Alertas cocina
   └─ Rating   ────────────→  KPIs calidad
```

### Flujo completo:

```
1. EMPLEADO selecciona → Order (DRAFT)
2. EMPLEADO confirma → Order (CONFIRMED)
3. CUTOFF 11:00 → Order (LOCKED_AFTER_CUTOFF)
4. CRON 11:05 → KitchenSheet + PackingSheet
5. CATERING ve producción → Cocina
6. CATERING reparte → DeliveryEvent
7. CATERING marca entregado → Order (DELIVERED) + DeliveryProof
8. FIN DE MES → Invoice (automática)
9. EMPRESA descarga factura
```

---

## 📅 Plan de Implementación (7 Fases)

### FASE 1: Fundamentos (Días 1-3) ⏱️ 3 días
- ✅ Layout + Navegación
- ✅ Dashboard inicial
- ✅ Quick actions
- **Entregable**: Portal navegable con dashboard básico

### FASE 2: Platos (Días 4-7) ⏱️ 4 días
- ✅ CRUD completo
- ✅ Subida de imágenes
- ✅ Gestión de alérgenos
- **Entregable**: Catálogo de platos funcional

### FASE 3: Menús (Días 8-11) ⏱️ 4 días
- ✅ Vista semanal
- ✅ Editor por día
- ✅ Validaciones + publicación
- **Entregable**: Gestión de menús completa

### FASE 4: Producción (Días 12-15) ⏱️ 4 días
- ✅ Consolidado automático
- ✅ Vista cocina
- ✅ Alertas alergias
- ✅ Cron job 11:05
- **Entregable**: Pantalla de cocina operativa

### FASE 5: Repartos (Días 16-19) ⏱️ 4 días
- ✅ Rutas
- ✅ Marcar entregas
- ✅ Evidencias
- ✅ Etiquetas PDF
- **Entregable**: Gestión de repartos completa

### FASE 6: Empresas e Incidencias (Días 20-23) ⏱️ 4 días
- ✅ Vista empresas asignadas
- ✅ Board de incidencias
- ✅ Responder/Resolver
- ✅ Compensaciones
- **Entregable**: Gestión de incidencias funcional

### FASE 7: Facturación + Auditoría + Config (Días 24-28) ⏱️ 5 días
- ✅ Facturación automática
- ✅ Auditoría completa
- ✅ Configuración
- ✅ Cron job mensual
- **Entregable**: Portal completo

### FASE 8: Testing Integral (Días 29-30) ⏱️ 2 días
- ✅ E2E críticos
- ✅ Performance
- ✅ Seguridad multi-tenant
- **Entregable**: Portal en producción

---

## 🎨 Componentes Reutilizables

### Del Portal de Admin:
- `KPICard` ✅
- `AlertsPanel` ✅
- `ChartsSection` ✅
- `RecentActivityTable` ✅

### Del Portal de Empresa:
- `OrdersFilters` (patrón) ✅
- `OrderDetailOverview` (estructura) ✅
- `BillingKPIs` (adaptar) 🔄
- `IncidentsKPIs` (adaptar) 🔄

### Del Portal de Empleado:
- `AllergenSelector` ✅
- `DaySelector` ✅

### Nuevos específicos:
- `ProductionSheet` 📝
- `DeliveryRouteCard` 📝
- `DishForm` 📝
- `WeeklyMenuCalendar` 📝
- `IncidentsBoard` 📝
- `InvoiceGenerator` 📝
- +50 componentes más

---

## ✅ Criterios de Aceptación

### Funcionales:

| Funcionalidad | Criterio |
|---------------|----------|
| **Dashboard** | KPIs actualizados, alertas visibles, quick actions funcionales |
| **Platos** | CRUD completo, subida imágenes, alérgenos, validaciones |
| **Menús** | Vista calendario, editor día, validaciones, bloqueo post-cutoff |
| **Producción** | Consolidado correcto, alergias destacadas, vista print |
| **Repartos** | Rutas organizadas, marcar entregas, evidencias, etiquetas |
| **Incidencias** | Board funcional, responder, resolver, compensar |
| **Facturación** | Lista, detalle, generación auto, PDF, ajustes |
| **Auditoría** | Logs, trail, diff, hash válido |

### No Funcionales:

| Aspecto | Criterio |
|---------|----------|
| **Seguridad** | Filtro tenantId en TODAS las queries, roles validados |
| **Performance** | Dashboard < 2s, Producción < 1s, Búsquedas < 500ms |
| **UX** | Mobile responsive, loading states, errores claros |
| **Trazabilidad** | Todos los cambios en AuditLog, hashes válidos |

---

## 🔧 Queries a Desarrollar

### Críticas (Alta prioridad):

```typescript
// Producción
getDailyProduction(tenantId, date)
generateKitchenSheet(tenantId, date)

// Repartos
getDailyDeliveries(tenantId, date)
markDeliveryComplete(orderId, proof)

// Facturación
generateMonthlyInvoice(tenantId, companyId, period)
calculateInvoiceAdjustments(tenantId, companyId, period)

// Menús
updateDailyMenu(tenantId, date, dishes)
publishWeeklyMenu(tenantId, startDate, endDate)
```

### Importantes (Media prioridad):

```typescript
// Platos
getDishes(tenantId, filters)
createDish(tenantId, data)
cloneDish(dishId)

// Empresas
getAssignedCompanies(tenantId)
getCompanyOrderHistory(tenantId, companyId)

// Incidencias
getCateringIncidents(tenantId, filters)
resolveIncident(incidentId, resolution)
```

### Secundarias (Baja prioridad):

```typescript
// Auditoría
getCateringAuditLogs(tenantId, filters)
getEntityAuditTrail(entity, entityId)

// Configuración
updateCateringConfig(tenantId, config)
updateCateringZones(tenantId, zones)
```

---

## 🚨 Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| **Complejidad FSM pedidos** | Alto | Media | Testing exhaustivo, diagramas de estado |
| **PDFs lentos** | Medio | Alta | Generación async, cola de trabajos |
| **Cron jobs fallan** | Alto | Baja | Logs, alertas, retry automático |
| **Data leak multi-tenant** | Crítico | Baja | Validar tenantId en TODAS las queries |
| **Alergias no detectadas** | Crítico | Baja | Validación doble, alertas visuales |

---

## 📈 Métricas de Éxito

Al completar el Portal del Catering:

✅ **100% de la plataforma funcional**  
✅ **4 portales completos**: Admin, Empresa, Empleado, Catering  
✅ **Flujo end-to-end**: Pedido → Producción → Entrega → Factura  
✅ **Compliance fiscal**: Trazabilidad 4 años  
✅ **Multi-tenant**: Aislamiento total  

### KPIs operativos:

- **Tiempo de consolidación**: < 1 minuto (post-cutoff)
- **Generación facturas**: automática (día 1 de mes)
- **Tiempo de respuesta incidencias**: < 1 hora
- **Tasa de error**: < 0.1%

---

## 🎯 Próximos Pasos

1. **Revisar y aprobar** este plan
2. **Iniciar FASE 1**: Layout + Dashboard (días 1-3)
3. **Iteración semanal**: Review + ajustes
4. **Testing continuo**: Cada fase
5. **Deploy a staging**: Cada 2 fases
6. **Deploy a producción**: Tras FASE 8

---

## 📚 Recursos

- **Plan Detallado**: `/docs/PORTAL-CATERING-PLAN.md`
- **PRD Original**: Ver mensaje del usuario
- **Schema BD**: `/prisma/schema.prisma`
- **Queries existentes**: `/lib/db/queries/caterings.ts`
- **Componentes reutilizables**: `/components/admin`, `/components/empresa`, `/components/ui`

---

**Estado**: ✅ Plan completo y listo para desarrollo  
**Próximo milestone**: FASE 1 - Layout + Dashboard  
**Fecha estimada de finalización**: 30 días desde inicio


