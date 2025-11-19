# 🎯 FASE 2.4 - Tab Menús & Platos

## ✅ COMPLETADO

Esta fase implementa el **Tab de Menús & Platos** con catálogo completo de platos, gestión de activación/desactivación, etiquetas de alérgenos, información nutricional y programación semanal.

---

## 📁 Archivos Creados/Modificados

### 1. **Componente Principal**

- **`components/admin/caterings/MenusDishesTab.tsx`**
  - Tab completo de Menús & Platos
  - Catálogo con tabla completa de platos
  - Filtros por curso y estado
  - Búsqueda en tiempo real
  - Badges de etiquetas (vegetariano, vegano, sin gluten, etc.)
  - Información nutricional
  - Precios base
  - Estado de programación
  - Acciones (ver, editar, activar/desactivar)
  - Resumen de programación semanal
  - Datos mock para demostración

### 2. **Integración**

- **`app/(admin)/admin/caterings/[id]/page.tsx`** (actualizado)
  - Importa `MenusDishesTab`
  - Reemplaza placeholder con tab funcional
  - Pasa dishes desde query

---

## 🎨 Funcionalidades Implementadas

### **1. Resumen de Platos** (4 cards)

```
┌──────────────────────────────────────────────────┐
│ [Total]  [Activos]  [1º/2º/Postre]  [Precio €] │
│   25        22          6/12/7         6.50€    │
└──────────────────────────────────────────────────┘
```

**Cards:**
- **Total Platos**: Cuenta total del catálogo
- **Activos**: Platos actualmente disponibles (verde)
- **1º / 2º / Postre**: Desglose por categoría
- **Precio Medio**: Promedio de todos los platos

### **2. Filtros y Búsqueda**

**Barra de Búsqueda:**
- Búsqueda en tiempo real por nombre de plato
- Icono de lupa integrado

**Filtros:**
1. **Por Curso**
   - Todos los cursos
   - Primeros (STARTER)
   - Segundos (MAIN)
   - Postres (DESSERT)

2. **Por Estado**
   - Todos los estados
   - Activos
   - Inactivos

### **3. Tabla de Catálogo de Platos**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Plato      │ Curso   │ Características        │ Nutrición │ Precio │ Program │
├────────────────────────────────────────────────────────────────────────────────┤
│ Ensalada   │ Primero │ 🌱 Vegetariano         │ 250 kcal  │ 5.50€  │ 5 días │
│ César      │         │ 🥚 Huevo               │ P:12g C:15│        │         │
├────────────────────────────────────────────────────────────────────────────────┤
│ Pasta      │ Segundo │ 🥚 Huevo               │ 450 kcal  │ 7.50€  │ 3 días │
│ Carbonara  │         │                        │ P:22g C:55│        │         │
├────────────────────────────────────────────────────────────────────────────────┤
│ Salmón     │ Segundo │ 🐟 Pescado             │ 320 kcal  │ 9.50€  │ 2 días │
│ Plancha    │         │ ✓ Sin Gluten           │ P:30g C:5 │        │         │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Columnas:**

1. **Plato**: Nombre del plato
2. **Curso**: Badge con tipo (Primero/Segundo/Postre)
3. **Características**: Badges de etiquetas con iconos
4. **Nutrición**: Calorías, Proteínas, Carbohidratos
5. **Precio Base**: En euros
6. **Programado**: Días/semana programado
7. **Estado**: Activo (verde) / Inactivo (gris)
8. **Acciones**: Ver, Editar, Activar/Desactivar

### **4. Sistema de Etiquetas y Alérgenos**

**Etiquetas Implementadas:**

| Etiqueta | Icono | Color | Descripción |
|----------|-------|-------|-------------|
| 🌱 Vegetariano | Leaf | Verde | Sin carne ni pescado |
| 🌱 Vegano | Leaf | Verde | Sin ingredientes animales |
| 🌾 Sin Gluten | Wheat | Amarillo | Gluten free |
| 🥛 Sin Lactosa | Milk | Azul | Lactose free |
| 🐟 Pescado | Fish | Cyan | Contiene pescado |
| 🥚 Huevo | Egg | Naranja | Contiene huevo |
| 🌶️ Picante | AlertCircle | Rojo | Plato picante |

**Características:**
- Máximo 3 badges visibles
- "+N" si hay más etiquetas
- Iconos contextuales
- Colores semánticos por categoría

### **5. Información Nutricional**

```
250 kcal
P: 12g | C: 15g
```

**Datos mostrados:**
- Calorías totales
- Proteínas (P)
- Carbohidratos (C)
- Grasas (opcional, en el objeto pero no mostrado por espacio)

### **6. Estado de Programación**

**Programado:**
```
📅 5 días
```
- Icono de calendario
- Número de días programados en la semana

**Sin Programar:**
```
Sin programar (texto gris)
```

### **7. Acciones por Plato**

**Botones:**
1. **👁️ Ver**: Ver detalles completos del plato
2. **✏️ Editar**: Modificar información del plato
3. **⚡ Activar/Desactivar**: Toggle de estado
   - Verde (activar) si está inactivo
   - Rojo (desactivar) si está activo

### **8. Programación Semanal** (Sección inferior)

```
┌──────────────────────────────────────────────────┐
│ 📅 Programación Semanal     [Editar Programación]│
├──────────────────────────────────────────────────┤
│ [Platos Programados] [Días Cubiertos] [Variedad]│
│        20                  7/7           8 ops   │
├──────────────────────────────────────────────────┤
│ 💡 Nota: La programación semanal define qué      │
│    platos están disponibles cada día...          │
└──────────────────────────────────────────────────┘
```

**3 Cards de Resumen:**

1. **Platos Programados**
   - Icono: TrendingUp (azul)
   - Cuenta de platos con ≥ 1 día programado

2. **Días Cubiertos**
   - Icono: Calendar (verde)
   - Días con menús / Total días (7/7)

3. **Variedad Media**
   - Icono: ChefHat (morado)
   - Promedio de opciones por día

**Nota Informativa:**
- Explicación del propósito de la programación
- Los empleados solo ven platos programados para su día

---

## 📊 Datos Mock Implementados

```typescript
const getMockDishes = (): Dish[] => [
  {
    id: '1',
    name: 'Ensalada César',
    course: 'STARTER',
    labels: ['vegetarian', 'contains_eggs'],
    nutrition: { calories: 250, protein: 12, carbs: 15, fat: 18 },
    basePrice: 5.5,
    active: true,
    scheduledDays: 5,
  },
  // ... más platos
]
```

**Platos de Ejemplo:**
1. Ensalada César (Primero)
2. Pasta Carbonara (Segundo)
3. Pollo al Curry (Segundo)
4. Salmón a la Plancha (Segundo)
5. Tarta de Manzana (Postre)
6. Gazpacho Andaluz (Primero) - Inactivo

---

## 🔧 Props del Componente

```typescript
type Dish = {
  id: string
  name: string
  course: string           // STARTER, MAIN, DESSERT
  labels: string[]         // vegetarian, vegan, gluten_free, etc.
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  basePrice: number        // En euros
  active: boolean          // Estado activo/inactivo
  scheduledDays: number    // Días programados en la semana
}

type MenusDishesTabProps = {
  dishes: Dish[]
  cateringId: string
}
```

---

## 🎯 Lógica de Filtrado

### **Búsqueda**
```typescript
const matchesSearch = dish.name
  .toLowerCase()
  .includes(searchTerm.toLowerCase())
```

### **Filtro por Curso**
```typescript
const matchesCourse = 
  filterCourse === 'all' || dish.course === filterCourse
```

### **Filtro por Estado**
```typescript
const matchesStatus =
  filterStatus === 'all' ||
  (filterStatus === 'active' && dish.active) ||
  (filterStatus === 'inactive' && !dish.active)
```

### **Combinación**
Todos los filtros se aplican con AND:
```typescript
filteredDishes = dishes.filter(dish => 
  matchesSearch && matchesCourse && matchesStatus
)
```

---

## 🧪 Cómo Probar

### 1. **Acceder al Tab**
```
http://localhost:3000/admin/caterings/[tenant-id]
→ Click en tab "Menús & Platos"
```

### 2. **Verificar que se Muestra**
- ✅ 4 cards de resumen
- ✅ Barra de búsqueda
- ✅ Filtros de curso y estado
- ✅ Tabla con platos
- ✅ Badges de etiquetas con iconos
- ✅ Información nutricional
- ✅ Precios y programación
- ✅ Botones de acciones
- ✅ Sección de programación semanal

### 3. **Interacciones**
1. **Buscar platos**: Escribe en la barra de búsqueda
2. **Filtrar por curso**: Selecciona Primeros/Segundos/Postres
3. **Filtrar por estado**: Selecciona Activos/Inactivos
4. **Combinar filtros**: Búsqueda + filtros
5. **Ver badges**: Observa etiquetas de alérgenos
6. **Ver "+N"**: Si hay más de 3 etiquetas

### 4. **Verificar Datos Mock**
Si no hay datos reales, se muestran 6 platos de ejemplo.

---

## 📝 Próximos Pasos (Integración Real)

### **Catálogo de Platos**
- [ ] Conectar con tabla `dishes` real
- [ ] Implementar creación de platos (modal/página)
- [ ] Implementar edición de platos
- [ ] Implementar activación/desactivación real
- [ ] Upload de imágenes de platos
- [ ] Gestión de alérgenos completa

### **Programación Semanal**
- [ ] Calendario visual de programación
- [ ] Drag & drop de platos a días
- [ ] Validación de mínimos (X primeros, Y segundos, Z postres)
- [ ] Previsualización del menú del día
- [ ] Duplicar programación de semana anterior
- [ ] Plantillas de programación

### **Precios**
- [ ] Precio base editable
- [ ] Overrides por empresa
- [ ] Overrides por zona
- [ ] Histórico de cambios de precio
- [ ] Promociones y descuentos

### **Stock** (opcional)
- [ ] Control de ingredientes
- [ ] Alertas de stock bajo
- [ ] Sustituciones automáticas
- [ ] Proveedores de ingredientes

### **Mejoras UX**
- [ ] Vista de tarjetas (grid) además de tabla
- [ ] Previsualización de imágenes
- [ ] Filtro por etiquetas específicas
- [ ] Ordenación por columnas
- [ ] Paginación para catálogos grandes
- [ ] Exportación a CSV/PDF

---

## ✅ Checklist de Completado

- [x] Componente `MenusDishesTab` creado
- [x] Resumen con 4 cards (total, activos, categorías, precio)
- [x] Barra de búsqueda en tiempo real
- [x] Filtros por curso y estado
- [x] Tabla completa de platos
- [x] Sistema de etiquetas con iconos y colores
- [x] Información nutricional
- [x] Precios base
- [x] Estado de programación
- [x] Botones de acciones
- [x] Sección de programación semanal
- [x] 3 cards de resumen de programación
- [x] Nota informativa
- [x] Datos mock para demostración
- [x] Integración en página principal
- [x] Estado vacío (sin platos)
- [x] Responsive design
- [x] Documentación completa

---

## 🎉 Resultado

El Super Admin ahora puede:

1. ✅ **Ver catálogo completo** de platos del catering
2. ✅ **Buscar platos** por nombre
3. ✅ **Filtrar por curso** (primeros, segundos, postres)
4. ✅ **Filtrar por estado** (activos, inactivos)
5. ✅ **Ver etiquetas de alérgenos** con iconos claros
6. ✅ **Consultar información nutricional** básica
7. ✅ **Ver precios base** de cada plato
8. ✅ **Conocer programación** (días/semana)
9. ✅ **Identificar platos activos** vs inactivos
10. ✅ **Evaluar cobertura semanal** de menús

---

## 📦 Componentes Utilizados

- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Contenedores
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - Tabla de platos
- `Badge` - Etiquetas y estados
- `Button` - Acciones
- `Input` - Búsqueda
- `Select` - Filtros
- Iconos de `lucide-react`: UtensilsCrossed, Leaf, Wheat, Fish, Milk, Egg, Power, Calendar, etc.

---

## 🚀 Próxima Fase

**FASE 2.5** - Tab Facturación & Pagos 💰

¡4 fases completadas de 9! 🎯 (56% del sistema de caterings)

