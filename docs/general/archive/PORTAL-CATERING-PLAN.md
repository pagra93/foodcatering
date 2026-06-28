# Plan de Implementación - Portal del Catering

## 📋 Análisis del PRD y Estado Actual

### 1. Resumen Ejecutivo

El Portal del Catering es el tercer y último portal de la plataforma multi-tenant. Su objetivo es proveer a las empresas de catering (restaurantes) con un panel completo para:
- Gestionar su oferta de platos y menús semanales
- Coordinar la producción diaria (cocina)
- Gestionar logística y repartos
- Facturación automática
- Gestión de incidencias
- Auditoría completa

**Complejidad**: Alta (similar al Portal de Empresa)  
**Duración estimada**: 5-7 fases de desarrollo  
**Dependencias**: Tablas ya creadas en el schema + queries parciales existentes

---

## 🗄️ Análisis de Base de Datos

### Tablas Existentes en el Schema

#### ✅ Tablas LISTAS para usar:

1. **Tenant** (type: CATERING)
   - Ya existe la estructura completa
   - Incluye branding (primaryColor, logoUrl)
   - Configuración regional (timezone, currency, language)

2. **Restaurant** (relación 1:1 con Tenant CATERING)
   - Información legal (legalName, cif, billingAddress, iban)
   - Capacidad operativa (dailyCapacity, cutoffTime, operationalDays)
   - Zonas de servicio (zones: JSON)
   - KPIs (punctualityRate, incidentRate, averageRating)
   - Estado operativo (operationalStatus, documentsStatus)

3. **RestaurantDocument**
   - Documentos sanitarios
   - RC, manipuladores, otros
   - Tracking de expiración

4. **Dish** (platos del catálogo)
   - name, course (FIRST/SECOND/DESSERT)
   - labels (alérgenos), nutrition
   - basePrice, active
   - Soft delete (deletedAt)

5. **DishSchedule** (menús semanales/diarios)
   - date, dishId
   - stockLimit, priceOverride
   - visibleTo (empresas específicas)
   - status (PUBLISHED/HIDDEN)

6. **Order** (pedidos consolidados)
   - tenantEmpresa + tenantCatering
   - employeeId, serviceDate, siteId
   - selection (JSON con dish_ids)
   - status (FSM completo)
   - version + integrityHash

7. **OrderHistory** (versionado completo)
   - Cada cambio queda registrado
   - changeReason, prevValues, newValues
   - integrityHash

8. **KitchenSheet** (consolidación para cocina)
   - serviceDate
   - content (JSON con cantidades por plato)
   - signatureHash

9. **PackingSheet** (consolidación para reparto)
   - Por empresa y fecha
   - content (JSON con pedidos por empleado)
   - signatureHash

10. **DeliveryEvent** (tracking de entregas)
    - PACKED, OUT_FOR_DELIVERY, DELIVERED, FAILED
    - timestamp, markedBy, notes

11. **DeliveryProof** (justificantes)
    - deliveredAt, deliveredBy
    - signatureImageUrl, geoLocation
    - verificationHash

12. **Invoice** (facturación mensual)
    - tenantCatering → tenantEmpresa
    - period (YYYY-MM)
    - subtotal, taxRate, taxAmount, total
    - status (DRAFT → ISSUED → SENT → PAID)

13. **InvoiceLine** (detalle de factura)
    - date, orderId, employeeId
    - concept, amount
    - facturableFlag (FULL/HALF/NONE)

14. **Incident** (incidencias)
    - tenantEmpresa + tenantCatering
    - type, severity, status
    - resolution (JSON)

15. **RestaurantAudit** (auditorías)
    - SANITARIA, OPERATIVA, SATISFACCION
    - score, reportUrl, auditedAt

16. **CompanyCateringAssignment** (relación empresa ↔ catering)
    - type (PRIMARY/BACKUP)
    - zones, priority
    - slaPunctuality, slaIncidentRate
    - active

17. **User** (usuarios del catering)
    - Roles: ADMIN_CATERING, CHEF, COCINERO, REPARTIDOR, FINANZAS_CATERING

18. **AuditLog** (auditoría general)
    - Todas las acciones quedan registradas
    - hash para tamper-evidence

#### ✅ Queries EXISTENTES que podemos reutilizar:

En `/lib/db/queries/caterings.ts`:
- `getCateringById(tenantId)` - Dashboard completo
- `getCaterings()` - Lista con filtros
- `createCatering()` - Alta completa
- `updateCatering()` - Actualización

#### ❌ Queries FALTANTES que hay que crear:

1. **Platos**:
   - `getDishes(tenantId, filters)` - Lista con filtros
   - `getDishById(id)` - Detalle
   - `createDish()` - Alta
   - `updateDish()` - Edición
   - `deleteDish()` - Soft delete
   - `cloneDish()` - Duplicar plato

2. **Menús Semanales**:
   - `getWeeklyMenu(tenantId, startDate, endDate)` - Semana completa
   - `getDailyMenu(tenantId, date)` - Día específico
   - `updateDailyMenu(tenantId, date, dishes)` - Guardar día
   - `publishWeeklyMenu(tenantId, startDate, endDate)` - Publicar

3. **Producción Diaria**:
   - `getDailyProduction(tenantId, date)` - Consolidado
   - `generateKitchenSheet(tenantId, date)` - Auto post-cutoff
   - `getProductionByCompany(tenantId, date)` - Por empresa

4. **Repartos**:
   - `getDailyDeliveries(tenantId, date)` - Rutas del día
   - `getDeliveryDetails(tenantId, companyId, date)` - Detalle empresa
   - `markDeliveryComplete(orderId, proof)` - Marcar entregado
   - `uploadDeliveryProof(orderId, data)` - Evidencia

5. **Empresas Asignadas**:
   - `getAssignedCompanies(tenantId)` - Lista
   - `getCompanyDetails(tenantId, companyId)` - Detalle
   - `getCompanyOrderHistory(tenantId, companyId)` - Historial

6. **Incidencias**:
   - `getCateringIncidents(tenantId, filters)` - Lista
   - `respondToIncident(incidentId, response)` - Responder
   - `resolveIncident(incidentId, resolution)` - Resolver
   - `compensateIncident(incidentId, compensation)` - Compensar

7. **Facturación**:
   - `getCateringInvoices(tenantId, filters)` - Lista
   - `getInvoiceDetail(invoiceId)` - Detalle + líneas
   - `generateMonthlyInvoice(tenantId, companyId, period)` - Auto
   - `updateInvoiceStatus(invoiceId, status)` - Cambiar estado

8. **Auditoría**:
   - `getCateringAuditLogs(tenantId, filters)` - Logs
   - `getEntityAuditTrail(entity, entityId)` - Trail específico

9. **Configuración**:
   - `updateCateringConfig(tenantId, config)` - Actualizar
   - `updateCateringCapacity(tenantId, capacity)` - Capacidad
   - `updateCateringZones(tenantId, zones)` - Zonas

---

## 🔗 Análisis de Dependencias

### Dependencias con Portal de Empresa

| Funcionalidad Catering | Requiere de Empresa | Tabla/Relación |
|-------------------------|---------------------|----------------|
| Ver empresas asignadas | Company, CompanySite | `CompanyCateringAssignment` |
| Producción diaria | Orders | `Order.tenantCatering` |
| Repartos | Orders + Employees | `Order` + `Employee` |
| Incidencias | Incident reporting | `Incident` (bidireccional) |
| Facturación | Order history | `Order` → `Invoice` |
| SLAs | Delivery tracking | `DeliveryEvent` + `DeliveryProof` |

### Dependencias con Portal de Empleado

| Funcionalidad Catering | Requiere de Empleado | Tabla/Relación |
|-------------------------|----------------------|----------------|
| Menús disponibles | Selection flow | `DishSchedule` |
| Cutoff respetado | Order timing | `Order.status` FSM |
| Alergias | Diet preferences | `Employee.dietPrefs` |
| Ratings | Order feedback | `OrderRating` |
| Incidencias | Employee reports | `Incident.openedBy` |

### Flujos Multi-Tenant Críticos

```
EMPLEADO (tenantEmpresa)
    ↓
  Order (draft → confirmed)
    ↓
CUTOFF 11:00
    ↓
  Order (locked_after_cutoff)
    ↓
CONSOLIDACIÓN 11:05 → KitchenSheet + PackingSheet
    ↓
CATERING (tenantCatering)
    ↓
  Producción → Reparto → Entrega
    ↓
  DeliveryProof → Order (delivered)
    ↓
FIN DE MES → Invoice
    ↓
EMPRESA (factura mensual)
```

---

## 🎨 Análisis de Componentes Reutilizables

### De `/components/ui` (shadcn/ui) - 100% reutilizables:
- `Button`, `Card`, `Badge`, `Table`, `Tabs`, `Dialog`
- `Select`, `Input`, `Textarea`, `Checkbox`, `Switch`
- `Calendar`, `Popover`, `Dropdown`, `Command`
- `Alert`, `Skeleton`, `Progress`, `Avatar`
- `Form` (react-hook-form integration)

### De `/components/admin` - Reutilizables con adaptación:

#### KPIs:
- ✅ `KPICard.tsx` - Reutilizable 100%
- 🔄 `CateringKPIs.tsx` - Ya existe, posible adaptación
- 🔄 `CateringsGlobalKPIs.tsx` - Para vista global

#### Tablas:
- ✅ `RecentActivityTable.tsx` - Reutilizable estructura
- 🔄 `CateringsTable.tsx` - Existe para admin, necesitamos versión interna

#### Alertas:
- ✅ `AlertsPanel.tsx` - Reutilizable estructura
- 🔄 `CateringAlerts.tsx` - Ya existe, adaptar

#### Gráficas:
- ✅ `ChartsSection.tsx` - Reutilizable con datos propios

### De `/components/empresa` - Parcialmente reutilizables:

#### Patrón de filtros:
- ✅ `OrdersFilters.tsx` - Patrón aplicable
- ✅ `EmployeesFilters.tsx` - Patrón aplicable
- 📝 Crear: `DishesFilters.tsx`, `IncidentsFilters.tsx`

#### Patrón de detalle:
- ✅ `OrderDetailOverview.tsx` - Estructura base
- 📝 Crear: `ProductionDayDetail.tsx`, `DeliveryRouteDetail.tsx`

#### Facturación:
- 🔄 `BillingKPIs.tsx` - Adaptar para vista catering
- 🔄 `BillingMonthlyBreakdown.tsx` - Adaptar lógica inversa

#### Incidencias:
- 🔄 `IncidentsKPIs.tsx` - Reutilizable con datos propios
- 🔄 `IncidentsList.tsx` - Adaptar vista catering

### Nuevos componentes específicos del Catering:

#### Dashboard:
- 📝 `CateringDashboard.tsx`
- 📝 `ProductionSummaryCard.tsx`
- 📝 `DailyDeliveriesCard.tsx`
- 📝 `QuickActionsPanel.tsx` (botones: Ver cocina, Ver reparto, Subir menú)

#### Platos:
- 📝 `DishesTable.tsx`
- 📝 `DishForm.tsx` (create/edit)
- 📝 `DishCard.tsx` (vista galería)
- 📝 `AllergenSelector.tsx` (ya existe en empleado, reutilizar)
- 📝 `NutritionInput.tsx`

#### Menús Semanales:
- 📝 `WeeklyMenuCalendar.tsx` (vista calendario)
- 📝 `DayMenuEditor.tsx` (editor por día)
- 📝 `DishSelectionModal.tsx` (modal para elegir platos)
- 📝 `MenuPublishButton.tsx` (con confirmación)

#### Producción:
- 📝 `ProductionSheet.tsx` (vista cocina)
- 📝 `ProductionByDish.tsx` (agrupado por plato)
- 📝 `ProductionByCompany.tsx` (agrupado por empresa)
- 📝 `KitchenPrintView.tsx` (versión imprimible)

#### Repartos:
- 📝 `DeliveryRoutesMap.tsx` (mapa de rutas)
- 📝 `DeliveryRouteCard.tsx` (tarjeta por ruta)
- 📝 `DeliveryChecklistTable.tsx` (checklist de entregas)
- 📝 `DeliveryProofModal.tsx` (subir evidencia)
- 📝 `EmployeeLabelsGenerator.tsx` (etiquetas para cajas)

#### Empresas Asignadas:
- 📝 `AssignedCompaniesTable.tsx`
- 📝 `CompanyDetailTab.tsx`
- 📝 `CompanyDeliveryInfo.tsx`
- 📝 `CompanyIncidentHistory.tsx`

#### Incidencias (vista catering):
- 📝 `IncidentsBoard.tsx` (kanban: open → in_progress → resolved)
- 📝 `IncidentCard.tsx`
- 📝 `IncidentResponseForm.tsx`
- 📝 `CompensationCalculator.tsx`

#### Facturación (vista catering):
- 📝 `InvoicesTable.tsx`
- 📝 `InvoiceDetailView.tsx`
- 📝 `InvoiceGenerator.tsx` (preview + confirm)
- 📝 `InvoiceLineItemsTable.tsx`
- 📝 `PaymentStatusTracker.tsx`

#### Auditoría:
- 📝 `AuditLogTable.tsx`
- 📝 `AuditTimelineView.tsx`
- 📝 `EntityAuditTrail.tsx` (cambios en un recurso)

#### Configuración:
- 📝 `CateringConfigForm.tsx`
- 📝 `CapacityManager.tsx`
- 📝 `OperationalDaysSelector.tsx`
- 📝 `ZonesEditor.tsx` (gestión de zonas de reparto)
- 📝 `DocumentsUploadPanel.tsx` (ya existe, reutilizar)

#### Layout:
- 📝 `CateringNavbar.tsx` (basado en EmpresaNavbar)
- 📝 `CateringSidebar.tsx` (basado en EmpresaSidebar)
- 📝 `CateringBreadcrumbs.tsx` (basado en AdminBreadcrumbs)

---

## 🛣️ Estructura de Rutas

### Arquitectura propuesta:

```
/app
  /(catering)                    # Layout group
    /catering
      /layout.tsx                # Navbar + Sidebar
      
      /page.tsx                  # Dashboard
      
      /platos
        /page.tsx                # Lista de platos
        /nuevo/page.tsx          # Crear plato
        /[id]/page.tsx           # Editar plato
        /[id]/clonar/page.tsx    # Clonar plato
      
      /menus
        /page.tsx                # Vista semanal
        /dia/[date]/page.tsx     # Editor día específico
      
      /produccion
        /page.tsx                # Producción HOY (default)
        /[date]/page.tsx         # Producción fecha específica
        /cocina/page.tsx         # Vista optimizada cocina (print)
      
      /repartos
        /page.tsx                # Repartos HOY (default)
        /[date]/page.tsx         # Repartos fecha específica
        /ruta/[id]/page.tsx      # Detalle de ruta
      
      /empresas
        /page.tsx                # Lista empresas asignadas
        /[id]/page.tsx           # Detalle empresa (tabs)
      
      /incidencias
        /page.tsx                # Lista/board incidencias
        /[id]/page.tsx           # Detalle incidencia
      
      /facturacion
        /page.tsx                # Lista facturas
        /[id]/page.tsx           # Detalle factura
        /generar/page.tsx        # Generar factura mensual
      
      /auditoria
        /page.tsx                # Logs de auditoría
        /[entity]/[id]/page.tsx  # Trail específico
      
      /configuracion
        /page.tsx                # Configuración general (tabs)
```

---

## 📡 APIs Necesarias

### Estructura de APIs:

```
/app/api/catering
  /dashboard/route.ts          # GET - Dashboard data
  
  /platos
    /route.ts                  # GET (list), POST (create)
    /[id]/route.ts             # GET (detail), PATCH (update), DELETE (soft)
    /[id]/clonar/route.ts      # POST (clone)
  
  /menus
    /semanal/route.ts          # GET (week range)
    /dia/[date]/route.ts       # GET, POST (save day)
    /publicar/route.ts         # POST (publish range)
  
  /produccion
    /[date]/route.ts           # GET (production for date)
    /generar/route.ts          # POST (generate kitchen sheet)
    /pdf/[date]/route.ts       # GET (PDF kitchen sheet)
  
  /repartos
    /[date]/route.ts           # GET (deliveries for date)
    /[orderId]/completar/route.ts  # POST (mark complete + proof)
    /etiquetas/[date]/route.ts     # GET (labels PDF)
  
  /empresas
    /route.ts                  # GET (assigned companies)
    /[id]/route.ts             # GET (company detail)
    /[id]/historial/route.ts   # GET (order history)
  
  /incidencias
    /route.ts                  # GET (list), POST (respond)
    /[id]/route.ts             # GET (detail), PATCH (update)
    /[id]/resolver/route.ts    # POST (resolve + resolution)
    /[id]/compensar/route.ts   # POST (compensate)
  
  /facturacion
    /route.ts                  # GET (list invoices)
    /[id]/route.ts             # GET (detail)
    /generar/route.ts          # POST (generate monthly)
    /[id]/estado/route.ts      # PATCH (update status)
  
  /auditoria
    /route.ts                  # GET (logs with filters)
    /[entity]/[id]/route.ts    # GET (entity trail)
  
  /configuracion
    /route.ts                  # GET, PATCH (update config)
    /capacidad/route.ts        # PATCH (update capacity)
    /zonas/route.ts            # PATCH (update zones)
```

---

## ✅ Criterios de Aceptación (QA)

### Funcionales:

1. **Dashboard**:
   - ✅ KPIs actualizados en tiempo real
   - ✅ Alertas visibles (docs caducados, incidencias críticas)
   - ✅ Botones quick actions funcionales
   - ✅ Gráficas con datos reales

2. **Platos**:
   - ✅ CRUD completo funcional
   - ✅ Subida de imágenes
   - ✅ Selector de alérgenos
   - ✅ Validación de campos obligatorios
   - ✅ Clonar plato duplica todo correctamente
   - ✅ Soft delete (no aparece en menús futuros)

3. **Menús Semanales**:
   - ✅ Vista calendario carga correcta
   - ✅ Editor por día permite seleccionar platos activos
   - ✅ No permite publicar día sin primeros y segundos
   - ✅ Cambios post-cutoff solo afectan días futuros
   - ✅ Validación de stock por plato

4. **Producción Diaria**:
   - ✅ Se genera automáticamente post-cutoff
   - ✅ Consolidado correcto (suma cantidades)
   - ✅ Agrupación por plato funcional
   - ✅ Agrupación por empresa funcional
   - ✅ Vista imprimible (cocina) clara
   - ✅ Alergias críticas destacadas

5. **Repartos**:
   - ✅ Rutas del día organizadas
   - ✅ Detalle por empresa correcto
   - ✅ Marcar entrega funcional
   - ✅ Subida de evidencia (foto) correcta
   - ✅ Etiquetas generadas correctamente
   - ✅ Reportar incidencia desde reparto

6. **Empresas Asignadas**:
   - ✅ Lista completa de empresas
   - ✅ Detalle con historial de pedidos
   - ✅ Información de contacto actualizada
   - ✅ SLAs visibles (puntualidad, incidencias)

7. **Incidencias**:
   - ✅ Lista con filtros funcionales
   - ✅ Responder a incidencia
   - ✅ Resolver incidencia
   - ✅ Compensar (ajuste en factura)
   - ✅ Timeline de cambios visible

8. **Facturación**:
   - ✅ Lista de facturas con filtros
   - ✅ Detalle con líneas correctas
   - ✅ Generación mensual automática
   - ✅ PDF descargable
   - ✅ Ajustes por incidencias aplicados
   - ✅ No cierra si hay incidencias pendientes

9. **Auditoría**:
   - ✅ Logs con filtros (fecha, entidad, usuario)
   - ✅ Trail específico por recurso
   - ✅ Diff before/after visible
   - ✅ Hash de integridad validado

10. **Configuración**:
    - ✅ Actualización de datos legales
    - ✅ Modificación de capacidad diaria
    - ✅ Gestión de días operativos
    - ✅ Editor de zonas de reparto
    - ✅ Subida de documentos

### No Funcionales:

1. **Seguridad**:
   - ✅ Filtro por tenantId en TODAS las queries
   - ✅ Validación de permisos por rol
   - ✅ Logs de auditoría completos
   - ✅ Hash de integridad en operaciones críticas

2. **Performance**:
   - ✅ Dashboard carga < 2s
   - ✅ Producción diaria < 1s
   - ✅ Generación PDF < 3s
   - ✅ Búsquedas < 500ms

3. **UX**:
   - ✅ Mobile responsive
   - ✅ Loading states claros
   - ✅ Mensajes de error en español
   - ✅ Confirmaciones para acciones destructivas
   - ✅ Toast notifications apropiadas

4. **Integración**:
   - ✅ Sincronización con Portal Empresa (incidencias)
   - ✅ Actualización de KPIs en Restaurant
   - ✅ Webhooks (opcional) funcionan
   - ✅ Exports CSV/PDF correctos

---

## 📅 Plan de Implementación (7 Fases)

### **FASE 1: Fundamentos y Layout (Días 1-3)**

#### Objetivo:
Crear la estructura base del portal, layout, navegación y dashboard inicial.

#### Tareas:

1. **Estructura de rutas**:
   - Crear `/app/(catering)` layout group
   - Crear layout.tsx con estructura base
   - Configurar middleware para roles catering

2. **Layout components**:
   - `CateringNavbar.tsx` (basado en EmpresaNavbar)
   - `CateringSidebar.tsx` (basado en EmpresaSidebar)
   - `CateringBreadcrumbs.tsx`
   - Añadir ImpersonationBanner support

3. **Dashboard inicial**:
   - `/catering/page.tsx` - Página principal
   - `CateringDashboard.tsx` - Componente principal
   - `ProductionSummaryCard.tsx` - Resumen producción
   - `DailyDeliveriesCard.tsx` - Resumen repartos
   - `QuickActionsPanel.tsx` - Botones de acceso rápido

4. **API Dashboard**:
   - `/api/catering/dashboard/route.ts`
   - Reutilizar y extender query existente `getCateringById()`
   - Añadir datos específicos dashboard

5. **Queries base**:
   - Extender `/lib/db/queries/caterings.ts` con:
     - `getCateringDashboard(tenantId)` (refinado)
     - `getCateringKPIs(tenantId, period)`

**Entregables**:
- ✅ Layout funcional con navegación
- ✅ Dashboard con KPIs básicos
- ✅ Quick actions que navegan a secciones

**Testing**:
- Login como ADMIN_CATERING
- Visualizar dashboard completo
- Navegación entre secciones

---

### **FASE 2: Gestión de Platos (Días 4-7)**

#### Objetivo:
CRUD completo de platos + subida de imágenes + gestión de alérgenos.

#### Tareas:

1. **Rutas de platos**:
   - `/catering/platos/page.tsx` - Lista
   - `/catering/platos/nuevo/page.tsx` - Crear
   - `/catering/platos/[id]/page.tsx` - Editar

2. **Componentes**:
   - `DishesTable.tsx` - Tabla con filtros
   - `DishesFilters.tsx` - Filtros (tipo, activo, búsqueda)
   - `DishForm.tsx` - Formulario create/edit
   - `DishCard.tsx` - Vista galería opcional
   - `NutritionInput.tsx` - Campos nutricionales
   - Reutilizar `AllergenSelector.tsx` de empleado

3. **APIs**:
   - `/api/catering/platos/route.ts` (GET list, POST create)
   - `/api/catering/platos/[id]/route.ts` (GET detail, PATCH update, DELETE soft)
   - `/api/catering/platos/[id]/clonar/route.ts` (POST clone)
   - `/api/catering/platos/upload/route.ts` (POST image upload)

4. **Queries**:
   - `getDishes(tenantId, filters)`
   - `getDishById(dishId)`
   - `createDish(tenantId, data)`
   - `updateDish(dishId, data)`
   - `deleteDish(dishId)` - soft delete
   - `cloneDish(dishId)`

5. **Validaciones (Zod)**:
   - Schema para plato: `dishSchema`
   - Validar alérgenos, nutrition, basePrice
   - Validar que name + course no duplicado

**Entregables**:
- ✅ CRUD platos completo
- ✅ Subida de imágenes funcional
- ✅ Filtros y búsqueda
- ✅ Clonar plato

**Testing**:
- Crear plato con todos los campos
- Editar plato existente
- Desactivar plato (soft delete)
- Clonar plato
- Subir imagen

---

### **FASE 3: Menús Semanales (Días 8-11)**

#### Objetivo:
Editor de menús semanales/diarios + publicación + validaciones.

#### Tareas:

1. **Rutas de menús**:
   - `/catering/menus/page.tsx` - Vista semanal
   - `/catering/menus/dia/[date]/page.tsx` - Editor día

2. **Componentes**:
   - `WeeklyMenuCalendar.tsx` - Vista calendario
   - `DayMenuEditor.tsx` - Editor por día
   - `DishSelectionModal.tsx` - Modal para elegir platos
   - `MenuPublishButton.tsx` - Publicar con confirmación
   - `MenuPreviewCard.tsx` - Preview del menú

3. **APIs**:
   - `/api/catering/menus/semanal/route.ts` (GET week range)
   - `/api/catering/menus/dia/[date]/route.ts` (GET, POST save day)
   - `/api/catering/menus/publicar/route.ts` (POST publish range)

4. **Queries**:
   - `getWeeklyMenu(tenantId, startDate, endDate)`
   - `getDailyMenu(tenantId, date)`
   - `updateDailyMenu(tenantId, date, dishes)`
   - `publishWeeklyMenu(tenantId, startDate, endDate)`
   - `validateMenuBeforePublish(tenantId, date)`

5. **Lógica de negocio**:
   - Validar día tiene primeros + segundos
   - Validar platos activos
   - No permitir cambios post-cutoff (solo días futuros)
   - Crear/actualizar `DishSchedule` por cada plato

**Entregables**:
- ✅ Vista calendario semanal
- ✅ Editor por día funcional
- ✅ Publicación con validaciones
- ✅ No editar post-cutoff

**Testing**:
- Cargar menú semana actual
- Editar día futuro
- Intentar editar día pasado (bloqueado)
- Publicar sin primeros (error)
- Publicar correcto

---

### **FASE 4: Producción Diaria (Días 12-15)**

#### Objetivo:
Pantalla de cocina + consolidación automática + vista imprimible.

#### Tareas:

1. **Rutas de producción**:
   - `/catering/produccion/page.tsx` - HOY (default)
   - `/catering/produccion/[date]/page.tsx` - Fecha específica
   - `/catering/produccion/cocina/page.tsx` - Vista print

2. **Componentes**:
   - `ProductionSheet.tsx` - Vista principal
   - `ProductionByDish.tsx` - Agrupado por plato
   - `ProductionByCompany.tsx` - Agrupado por empresa
   - `KitchenPrintView.tsx` - Vista imprimible
   - `AllergyWarnings.tsx` - Alertas de alergias

3. **APIs**:
   - `/api/catering/produccion/[date]/route.ts` (GET production)
   - `/api/catering/produccion/generar/route.ts` (POST generate kitchen sheet)
   - `/api/catering/produccion/pdf/[date]/route.ts` (GET PDF)

4. **Queries**:
   - `getDailyProduction(tenantId, date)`
   - `generateKitchenSheet(tenantId, date)` - Auto post-cutoff
   - `getProductionByCompany(tenantId, date)`
   - `getCriticalAllergies(tenantId, date)`

5. **Lógica de negocio**:
   - Consolidar pedidos confirmados
   - Agrupar por plato (suma cantidades)
   - Detectar alergias críticas
   - Generar KitchenSheet con signatureHash
   - Considerar stock limits

6. **Cron Job** (Vercel Cron):
   - Crear `/api/cron/generate-production/route.ts`
   - Ejecutar a las 11:05 daily
   - Generar KitchenSheet + PackingSheet para todos los caterings

**Entregables**:
- ✅ Consolidado correcto
- ✅ Vista por plato y por empresa
- ✅ Vista imprimible clara
- ✅ Generación automática post-cutoff
- ✅ Alergias destacadas

**Testing**:
- Ver producción del día
- Verificar cantidades correctas
- Imprimir vista cocina
- Cron job genera correctamente

---

### **FASE 5: Repartos y Entregas (Días 16-19)**

#### Objetivo:
Gestión de rutas + marcar entregas + evidencias + etiquetas.

#### Tareas:

1. **Rutas de repartos**:
   - `/catering/repartos/page.tsx` - HOY (default)
   - `/catering/repartos/[date]/page.tsx` - Fecha específica
   - `/catering/repartos/ruta/[id]/page.tsx` - Detalle ruta

2. **Componentes**:
   - `DeliveryRoutesMap.tsx` - Mapa de rutas (opcional)
   - `DeliveryRouteCard.tsx` - Tarjeta por ruta
   - `DeliveryChecklistTable.tsx` - Checklist entregas
   - `DeliveryProofModal.tsx` - Subir evidencia
   - `EmployeeLabelsGenerator.tsx` - Generar etiquetas

3. **APIs**:
   - `/api/catering/repartos/[date]/route.ts` (GET deliveries)
   - `/api/catering/repartos/[orderId]/completar/route.ts` (POST mark complete)
   - `/api/catering/repartos/etiquetas/[date]/route.ts` (GET labels PDF)
   - `/api/catering/repartos/evidencia/route.ts` (POST upload proof)

4. **Queries**:
   - `getDailyDeliveries(tenantId, date)`
   - `getDeliveryDetails(tenantId, companyId, date)`
   - `markDeliveryComplete(orderId, proof)`
   - `uploadDeliveryProof(orderId, data)`
   - `generateDeliveryLabels(tenantId, date)`

5. **Lógica de negocio**:
   - Organizar por rutas (zones del Restaurant)
   - Marcar entrega → Order.status = DELIVERED
   - Crear DeliveryEvent
   - Crear DeliveryProof con verificationHash
   - Subir imagen a storage
   - Capturar geolocalización (opcional)

6. **Generación de etiquetas**:
   - PDF con etiquetas por empleado
   - QR code opcional (order ID)
   - Información de empresa + empleado + menú

**Entregables**:
- ✅ Vista de rutas organizada
- ✅ Marcar entrega funcional
- ✅ Subida de evidencia
- ✅ Etiquetas PDF correctas
- ✅ Reportar incidencia desde reparto

**Testing**:
- Ver repartos del día
- Marcar entrega completa
- Subir foto evidencia
- Generar etiquetas PDF
- Reportar incidencia

---

### **FASE 6: Empresas e Incidencias (Días 20-23)**

#### Objetivo:
Vista de empresas asignadas + gestión completa de incidencias.

#### Tareas:

1. **Rutas empresas**:
   - `/catering/empresas/page.tsx` - Lista
   - `/catering/empresas/[id]/page.tsx` - Detalle (tabs)

2. **Componentes empresas**:
   - `AssignedCompaniesTable.tsx` - Lista con KPIs
   - `CompanyDetailTab.tsx` - Info general
   - `CompanyDeliveryInfo.tsx` - Punto de entrega
   - `CompanyIncidentHistory.tsx` - Historial incidencias
   - `CompanySLAMetrics.tsx` - Puntualidad, incidencias

3. **Rutas incidencias**:
   - `/catering/incidencias/page.tsx` - Lista/board
   - `/catering/incidencias/[id]/page.tsx` - Detalle

4. **Componentes incidencias**:
   - `IncidentsBoard.tsx` - Kanban (open → in_progress → resolved)
   - `IncidentCard.tsx` - Tarjeta incidencia
   - `IncidentResponseForm.tsx` - Responder
   - `CompensationCalculator.tsx` - Calcular ajuste
   - `IncidentTimeline.tsx` - Timeline de cambios

5. **APIs**:
   - `/api/catering/empresas/route.ts` (GET list)
   - `/api/catering/empresas/[id]/route.ts` (GET detail)
   - `/api/catering/empresas/[id]/historial/route.ts` (GET order history)
   - `/api/catering/incidencias/route.ts` (GET list, POST respond)
   - `/api/catering/incidencias/[id]/route.ts` (GET detail, PATCH update)
   - `/api/catering/incidencias/[id]/resolver/route.ts` (POST resolve)
   - `/api/catering/incidencias/[id]/compensar/route.ts` (POST compensate)

6. **Queries**:
   - `getAssignedCompanies(tenantId)`
   - `getCompanyDetails(tenantId, companyId)`
   - `getCompanyOrderHistory(tenantId, companyId, filters)`
   - `getCateringIncidents(tenantId, filters)`
   - `getIncidentDetail(incidentId)`
   - `respondToIncident(incidentId, response)`
   - `resolveIncident(incidentId, resolution)`
   - `compensateIncident(incidentId, compensation)`

7. **Lógica de negocio**:
   - Filtro por estado, severidad, empresa
   - Responder actualiza status → IN_PROGRESS
   - Resolver actualiza status → RESOLVED + resolvedAt
   - Compensar crea ajuste en factura
   - Notificaciones a empresa (opcional)

**Entregables**:
- ✅ Lista empresas con métricas
- ✅ Detalle empresa completo
- ✅ Board de incidencias funcional
- ✅ Responder y resolver
- ✅ Compensaciones aplicadas

**Testing**:
- Ver empresas asignadas
- Ver detalle empresa
- Ver incidencias abiertas
- Responder a incidencia
- Resolver incidencia
- Compensar (verificar ajuste en factura)

---

### **FASE 7: Facturación, Auditoría y Configuración (Días 24-28)**

#### Objetivo:
Completar facturación automática + auditoría + configuración.

#### Tareas:

1. **Rutas facturación**:
   - `/catering/facturacion/page.tsx` - Lista
   - `/catering/facturacion/[id]/page.tsx` - Detalle
   - `/catering/facturacion/generar/page.tsx` - Generar

2. **Componentes facturación**:
   - `InvoicesTable.tsx` - Lista con filtros
   - `InvoiceDetailView.tsx` - Detalle completo
   - `InvoiceGenerator.tsx` - Preview + confirm
   - `InvoiceLineItemsTable.tsx` - Líneas detalladas
   - `PaymentStatusTracker.tsx` - Estado de pago

3. **Rutas auditoría**:
   - `/catering/auditoria/page.tsx` - Logs
   - `/catering/auditoria/[entity]/[id]/page.tsx` - Trail

4. **Componentes auditoría**:
   - `AuditLogTable.tsx` - Tabla con filtros
   - `AuditTimelineView.tsx` - Timeline
   - `EntityAuditTrail.tsx` - Trail de un recurso
   - `AuditDiffViewer.tsx` - Before/after

5. **Rutas configuración**:
   - `/catering/configuracion/page.tsx` - Tabs

6. **Componentes configuración**:
   - `CateringConfigForm.tsx` - Formulario general
   - `CapacityManager.tsx` - Gestión capacidad
   - `OperationalDaysSelector.tsx` - Días activos
   - `ZonesEditor.tsx` - Zonas de reparto
   - Reutilizar `DocumentsUploadPanel.tsx` de admin

7. **APIs facturación**:
   - `/api/catering/facturacion/route.ts` (GET list)
   - `/api/catering/facturacion/[id]/route.ts` (GET detail)
   - `/api/catering/facturacion/generar/route.ts` (POST generate)
   - `/api/catering/facturacion/[id]/estado/route.ts` (PATCH status)
   - `/api/catering/facturacion/[id]/pdf/route.ts` (GET PDF)

8. **APIs auditoría**:
   - `/api/catering/auditoria/route.ts` (GET logs)
   - `/api/catering/auditoria/[entity]/[id]/route.ts` (GET trail)

9. **APIs configuración**:
   - `/api/catering/configuracion/route.ts` (GET, PATCH)
   - `/api/catering/configuracion/capacidad/route.ts` (PATCH)
   - `/api/catering/configuracion/zonas/route.ts` (PATCH)

10. **Queries facturación**:
    - `getCateringInvoices(tenantId, filters)`
    - `getInvoiceDetail(invoiceId)`
    - `generateMonthlyInvoice(tenantId, companyId, period)`
    - `updateInvoiceStatus(invoiceId, status)`
    - `calculateInvoiceAdjustments(tenantId, companyId, period)`

11. **Queries auditoría**:
    - `getCateringAuditLogs(tenantId, filters)`
    - `getEntityAuditTrail(entity, entityId)`

12. **Queries configuración**:
    - `updateCateringConfig(tenantId, config)`
    - `updateCateringCapacity(tenantId, capacity)`
    - `updateCateringZones(tenantId, zones)`

13. **Lógica de negocio facturación**:
    - Generar factura mensual automática
    - Consolidar pedidos DELIVERED del periodo
    - Aplicar ajustes por incidencias compensadas
    - Calcular subtotal, IVA (10%), total
    - Crear InvoiceLine por cada pedido
    - Generar PDF con logo + datos fiscales
    - No cerrar si hay incidencias pendientes

14. **Cron Job** (Vercel Cron):
    - Crear `/api/cron/generate-invoices/route.ts`
    - Ejecutar día 1 de cada mes a las 01:00
    - Generar facturas para todos los caterings + empresas

**Entregables**:
- ✅ Facturación completa
- ✅ Generación automática mensual
- ✅ PDF descargable
- ✅ Auditoría completa
- ✅ Configuración funcional

**Testing**:
- Ver lista de facturas
- Ver detalle con líneas
- Generar factura mensual
- Descargar PDF
- Ver logs de auditoría
- Ver trail de un plato
- Actualizar configuración

---

## 🧪 Testing Integral (Días 29-30)

### Test E2E Críticos:

1. **Flujo completo catering**:
   - Login como ADMIN_CATERING
   - Ver dashboard con datos reales
   - Crear plato nuevo
   - Asignar plato a menú semanal
   - Esperar cutoff (o simular)
   - Ver producción consolidada
   - Marcar entregas
   - Subir evidencias
   - Ver factura generada

2. **Flujo incidencias**:
   - Empleado reporta incidencia
   - Empresa valida
   - Catering responde
   - Catering resuelve con compensación
   - Verificar ajuste en factura

3. **Aislamiento multi-tenant**:
   - Catering A no ve datos de Catering B
   - Catering no ve empresas no asignadas
   - Queries filtran correctamente por tenantId

4. **Auditoría**:
   - Cambios en platos quedan registrados
   - Cambios en menús quedan registrados
   - Cambios en producción quedan registrados
   - Hash de integridad válido

### Test de Performance:

- Dashboard < 2s
- Producción diaria < 1s
- Lista de platos < 500ms
- Generación PDF < 3s

### Test de Seguridad:

- Roles validados correctamente
- TenantId siempre filtrado
- Logs de auditoría completos
- Hash de integridad válido

---

## 📊 Resumen de Entregables

### Páginas: **25+**
### Componentes nuevos: **~60**
### APIs: **~35**
### Queries: **~40**

### Duración Estimada: **28-30 días** (1 sprint completo)

---

## 🚀 Próximos Pasos

Una vez completado el Portal del Catering, tendremos:

✅ **Portal de Admin** (SuperAdmin)  
✅ **Portal de Empresa** (RRHH, Finanzas, Manager)  
✅ **Portal de Empleado** (Selección de menús)  
✅ **Portal de Catering** (Operación completa)

### Siguientes mejoras:

1. **Webhooks**:
   - Notificaciones en tiempo real
   - Integración con sistemas externos

2. **Reportes avanzados**:
   - Analytics de demanda
   - Predicción de consumo
   - Optimización de stock

3. **Mobile App** (opcional):
   - App nativa para repartidores
   - Escaneo QR de entregas
   - Geolocalización en tiempo real

4. **Integraciones**:
   - ERP empresas
   - Sistemas de pago
   - Plataformas de mensajería

---

## 📝 Notas Finales

### Prioridades:

1. **Seguridad**: Siempre filtrar por `tenantId`
2. **Trazabilidad**: Todo queda registrado
3. **Compliance**: Hashes de integridad en operaciones críticas
4. **UX**: Mobile responsive, loading states, errores claros

### Riesgos:

- **Complejidad del FSM de pedidos**: Requiere testing exhaustivo
- **Generación de PDFs**: Puede ser lenta, optimizar
- **Cron jobs**: Asegurar ejecución correcta
- **Multi-tenant**: Validar aislamiento en TODAS las queries

### Oportunidades:

- Muchos componentes reutilizables de Admin y Empresa
- Queries base ya creadas
- Schema completo y bien diseñado
- Patrón claro de desarrollo establecido

---

**Fecha de creación**: Noviembre 2025  
**Versión**: 1.0.0  
**Estado**: Pendiente de aprobación


