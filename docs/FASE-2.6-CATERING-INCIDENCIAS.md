# 🎯 FASE 2.6 - Tab Incidencias

## ✅ COMPLETADO

Esta fase implementa el **Tab de Incidencias** con cola de incidencias, filtros avanzados, tiempos de resolución, compensaciones y reglas de SLA y escalado.

---

## 📁 Archivos Creados/Modificados

### 1. **Componente Principal**

- **`components/admin/caterings/IncidentsTab.tsx`**
  - Tab completo de Incidencias
  - 5 KPIs (abiertas, en progreso, resueltas, tiempo medio, compensaciones)
  - Búsqueda en tiempo real
  - Filtros por tipo, severidad y estado
  - Cards de incidencias individuales
  - Metadata completa (empresa, empleado, tiempos)
  - Reglas de SLA y escalado
  - Datos mock para demostración

### 2. **Integración**

- **`app/(admin)/admin/caterings/[id]/page.tsx`** (actualizado)
  - Importa `IncidentsTab`
  - Reemplaza placeholder con tab funcional

---

## 🎨 Funcionalidades Implementadas

### **1. KPIs de Incidencias** (5 cards)

```
┌──────────────────────────────────────────────────────────────┐
│ [Abiertas] [En Progreso] [Resueltas] [Tiempo] [Compensac.] │
│     2           1            2         78m      28.50€       │
└──────────────────────────────────────────────────────────────┘
```

**Cards:**
- **Abiertas** (rojo): Incidencias sin asignar o gestionar
- **En Progreso** (amarillo): En proceso de resolución
- **Resueltas** (verde): Cerradas satisfactoriamente
- **Tiempo Medio**: Promedio de resolución en minutos
- **Compensaciones**: Total pagado en compensaciones

### **2. Búsqueda y Filtros**

**Barra de Búsqueda:**
- Búsqueda en tiempo real
- Por descripción, empresa o empleado

**3 Filtros:**
1. **Por Tipo**
   - ⏰ Entrega Retrasada
   - 📦 Producto Faltante
   - ❌ Pedido Incorrecto
   - ⚠️ Problema de Calidad
   - 🚨 Alérgeno No Declarado
   - 📦 Empaquetado Dañado
   - ❓ Otro

2. **Por Severidad**
   - 🟢 Baja
   - 🟡 Media
   - 🔴 Alta
   - 🚨 Crítica

3. **Por Estado**
   - Abiertas
   - En Progreso
   - Resueltas
   - Rechazadas

### **3. Cards de Incidencias**

```
┌────────────────────────────────────────────────────────────┐
│ INC-2024-001  [🟡 Media] [Abierta] [⏰ Entrega Retrasada] │
│                                                             │
│ Entrega retrasada 25 minutos. Empleado reporta que la     │
│ comida llegó fría.                                         │
│                                                             │
│ 🏢 Tech Solutions | 💬 Juan Pérez | ⏰ Hace 30 minutos   │
│                                                  [Ver]      │
└────────────────────────────────────────────────────────────┘
```

**Información Mostrada:**
- Número de incidencia (INC-YYYY-NNN)
- Badges de severidad, estado y tipo
- Descripción detallada
- Empresa afectada
- Empleado que reporta
- Tiempo transcurrido
- Compensación (si aplica)
- Tiempo de resolución (si está resuelta)
- Botones de acción (Ver, Resolver)

**Estados con Colores:**
- 🚨 **Crítica**: Rojo intenso
- 🔴 **Alta**: Rojo
- 🟡 **Media**: Amarillo
- 🟢 **Baja**: Gris

### **4. Tipos de Incidencia**

| Código | Icono | Label | Descripción |
|--------|-------|-------|-------------|
| `DELAYED_DELIVERY` | ⏰ | Entrega Retrasada | Pedido llega fuera de ventana |
| `MISSING_ITEM` | 📦 | Producto Faltante | Falta algún plato/componente |
| `WRONG_ORDER` | ❌ | Pedido Incorrecto | Plato equivocado entregado |
| `QUALITY_ISSUE` | ⚠️ | Problema de Calidad | Comida en mal estado |
| `ALLERGEN_ISSUE` | 🚨 | Alérgeno No Declarado | Alérgeno no informado |
| `DAMAGED_PACKAGING` | 📦 | Empaquetado Dañado | Envase roto/derramado |
| `OTHER` | ❓ | Otro | Otros problemas |

### **5. Metadata de Incidencias**

**Información Visible:**
- 🏢 **Empresa**: Cliente afectado
- 💬 **Reportado por**: Empleado que reporta
- ⏰ **Tiempo**: "Hace X minutos/horas"
- 💰 **Compensación**: Si se ha ofrecido (ej: 3.50€)
- ✅ **Resolución**: Tiempo en minutos (ej: Resuelto en 35m)

### **6. Reglas de SLA y Escalado**

```
┌──────────────────────────────────────────────────────────┐
│ 📋 SLA y Reglas de Escalado                              │
├──────────────────────────────────────────────────────────┤
│ 🚨 Crítica: < 30 min                                     │
│    Escalado automático + Bloqueo de facturación         │
│                                                           │
│ 🔴 Alta: < 2 horas                                       │
│    Notificación si no hay progreso en 1h                 │
│                                                           │
│ 🟡 Media: < 24 horas                                     │
│    Seguimiento diario hasta resolución                   │
│                                                           │
│ 🟢 Baja: < 48 horas                                      │
│    Gestión estándar, sin escalado automático            │
└──────────────────────────────────────────────────────────┘
```

**Reglas Implementadas:**

1. **🚨 Crítica** (ej: Alérgeno, Intoxicación)
   - Resolución: < 30 minutos
   - Escalado: Automático a supervisor si no se resuelve
   - Impacto: Bloqueo de facturación hasta resolución
   - Notificación: Inmediata

2. **🔴 Alta** (ej: Falta producto importante)
   - Resolución: < 2 horas
   - Escalado: Notificación a responsable si no hay progreso en 1h
   - Impacto: Registro en SLA del catering
   - Notificación: Alta prioridad

3. **🟡 Media** (ej: Retraso 15-30min)
   - Resolución: < 24 horas
   - Escalado: Seguimiento diario
   - Impacto: Afecta métricas de puntualidad
   - Notificación: Normal

4. **🟢 Baja** (ej: Empaquetado dañado menor)
   - Resolución: < 48 horas
   - Escalado: No automático
   - Impacto: Registro para estadísticas
   - Notificación: Baja prioridad

---

## 📊 Datos Mock Implementados

```typescript
const getMockIncidents = (): Incident[] => [
  {
    id: 'INC-2024-001',
    type: 'DELAYED_DELIVERY',
    severity: 'MEDIUM',
    status: 'OPEN',
    company: 'Tech Solutions',
    employee: 'Juan Pérez',
    description: 'Entrega retrasada 25 minutos...',
    compensation: null,
    resolutionTime: null,
    createdAt: new Date(Date.now() - 30 * 60000),
  },
  // ... más incidencias
]
```

**5 Incidencias de Ejemplo:**
1. Entrega retrasada (Media, Abierta)
2. Producto faltante (Alta, En Progreso)
3. Problema de calidad (Crítica, Abierta)
4. Pedido incorrecto (Baja, Resuelta)
5. Alérgeno (Crítica, Resuelta)

---

## 🔧 Props del Componente

```typescript
type Incident = {
  id: string
  type: string                // DELAYED_DELIVERY, MISSING_ITEM, etc.
  severity: string            // LOW, MEDIUM, HIGH, CRITICAL
  status: string              // OPEN, IN_PROGRESS, RESOLVED, REJECTED
  company: string
  employee: string
  description: string
  reportedBy: string
  assignedTo: string | null
  compensation: number | null  // En euros
  resolutionTime: number | null // En minutos
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
}

type IncidentsTabProps = {
  cateringId: string
}
```

---

## 🎯 Lógica de Negocio

### **1. Cálculo de KPIs**

```typescript
// Abiertas
const openIncidents = incidents.filter(i => i.status === 'OPEN').length

// En progreso
const inProgressIncidents = incidents.filter(i => i.status === 'IN_PROGRESS').length

// Resueltas
const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED').length

// Tiempo medio de resolución
const avgResolutionTime = 
  incidents.filter(i => i.resolutionTime !== null)
    .reduce((sum, i) => sum + i.resolutionTime, 0) / 
  incidents.filter(i => i.resolutionTime !== null).length

// Total compensaciones
const totalCompensation = 
  incidents.filter(i => i.compensation !== null)
    .reduce((sum, i) => sum + i.compensation, 0)
```

### **2. Filtrado de Incidencias**

```typescript
const filteredIncidents = incidents.filter((incident) => {
  const matchesSearch = 
    incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.employee.toLowerCase().includes(searchTerm.toLowerCase())
    
  const matchesType = filterType === 'all' || incident.type === filterType
  const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity
  const matchesStatus = filterStatus === 'all' || incident.status === filterStatus
  
  return matchesSearch && matchesType && matchesSeverity && matchesStatus
})
```

### **3. Estados de Incidencia**

```
OPEN → IN_PROGRESS → RESOLVED
  ↓                     ↓
REJECTED          COMPENSATED
```

---

## 🧪 Cómo Probar

### 1. **Acceder al Tab**
```
http://localhost:3000/admin/caterings/[tenant-id]
→ Click en tab "Incidencias"
```

### 2. **Verificar que se Muestra**
- ✅ 5 KPIs (abiertas, en progreso, resueltas, tiempo, compensaciones)
- ✅ Barra de búsqueda
- ✅ 3 filtros (tipo, severidad, estado)
- ✅ Cards de incidencias con toda la info
- ✅ Badges de estado con colores
- ✅ Reglas de SLA destacadas

### 3. **Interacciones**
1. **Buscar**: Escribe en la barra de búsqueda
2. **Filtrar por tipo**: Selecciona un tipo de incidencia
3. **Filtrar por severidad**: Crítica, Alta, Media, Baja
4. **Filtrar por estado**: Abiertas, En Progreso, Resueltas
5. **Combinar filtros**: Búsqueda + múltiples filtros

### 4. **Verificar Datos Mock**
Se muestran 5 incidencias de ejemplo con diferentes estados.

---

## 📝 Próximos Pasos (Integración Real)

### **Gestión de Incidencias**
- [ ] Conectar con tabla `incidents` real
- [ ] Modal de detalle completo de incidencia
- [ ] Formulario de resolución
- [ ] Asignación a usuario específico
- [ ] Comentarios y seguimiento
- [ ] Adjuntar evidencias (fotos)
- [ ] Notificaciones push al empleado

### **Compensaciones**
- [ ] Cálculo automático de compensación
- [ ] Aprobación de compensaciones
- [ ] Integración con facturación
- [ ] Descuentos en próxima factura
- [ ] Historial de compensaciones por cliente

### **SLA y Escalado**
- [ ] Timer automático por severidad
- [ ] Alertas cuando se acerca el deadline
- [ ] Escalado automático configurado
- [ ] Dashboard de cumplimiento de SLA
- [ ] Reportes de incidencias por catering

### **Macros y Resoluciones Estándar**
- [ ] Plantillas de respuesta
- [ ] Respuestas rápidas predefinidas
- [ ] Flujos de resolución guiados
- [ ] Base de conocimiento
- [ ] FAQ automáticas

### **Análisis**
- [ ] Gráficos de tendencias
- [ ] Incidencias por tipo/severidad
- [ ] Tiempos de resolución por tipo
- [ ] Identificación de patrones
- [ ] Predicción de incidencias

---

## ✅ Checklist de Completado

- [x] Componente `IncidentsTab` creado
- [x] 5 KPIs de incidencias
- [x] Barra de búsqueda en tiempo real
- [x] 3 filtros (tipo, severidad, estado)
- [x] Cards de incidencias individuales
- [x] Badges con colores semánticos
- [x] Metadata completa (empresa, empleado, tiempos)
- [x] Indicador de compensación
- [x] Indicador de tiempo de resolución
- [x] Reglas de SLA y escalado
- [x] 4 niveles de severidad visualizados
- [x] Botones de acción (Ver, Resolver)
- [x] Estado vacío personalizado
- [x] Datos mock (5 incidencias)
- [x] Integración en página principal
- [x] Responsive design
- [x] Documentación completa

---

## 🎉 Resultado

El Super Admin ahora puede:

1. ✅ **Ver KPIs de incidencias** (abiertas, en progreso, tiempo medio)
2. ✅ **Buscar incidencias** por descripción, empresa o empleado
3. ✅ **Filtrar por tipo** (retraso, falta producto, calidad, etc.)
4. ✅ **Filtrar por severidad** (crítica, alta, media, baja)
5. ✅ **Filtrar por estado** (abiertas, en progreso, resueltas)
6. ✅ **Ver detalles completos** de cada incidencia
7. ✅ **Identificar compensaciones** otorgadas
8. ✅ **Monitorear tiempos de resolución**
9. ✅ **Conocer reglas de SLA** por severidad
10. ✅ **Identificar incidencias críticas** para acción inmediata

---

## 📦 Componentes Utilizados

- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Contenedores
- `Badge` - Estados y severidades
- `Button` - Acciones
- `Input` - Búsqueda
- `Select` - Filtros
- Iconos de `lucide-react`: AlertTriangle, Clock, CheckCircle2, Euro, MessageSquare, etc.
- `date-fns` - Formateo de fechas y tiempos relativos

---

## 🚀 Próxima Fase

**FASE 2.7** - Tab Usuarios & Permisos 👥 (ÚLTIMA FASE DE TABS)

¡6 fases de tabs completadas de 7! 🎯 (86% de los tabs)

