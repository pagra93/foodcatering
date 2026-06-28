# Portal Empleado - FASE 1 COMPLETADA ✅

**Fecha:** Noviembre 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 Resumen

Se ha completado la **FASE 1** del Portal del Empleado, que incluye:

- ✅ Layout minimalista mobile-first
- ✅ Vista semanal de menús (Dashboard principal)
- ✅ Selector de platos por día (primero, segundo, postre)
- ✅ Sistema de cutoff automático
- ✅ Validación de límites diarios
- ✅ Detección de alérgenos

---

## 📁 Archivos Creados

### Queries y Lógica de Negocio
```
lib/db/queries/
└── empleado-menus.ts           # Queries para menús, pedidos y validaciones
```

### Layouts
```
app/(empleado)/
├── layout.tsx                  # Root layout empleado
└── empleado/
    └── layout.tsx              # Layout con navbar
```

### Páginas
```
app/(empleado)/empleado/menus/
├── page.tsx                    # Vista semanal (dashboard)
└── [date]/
    └── page.tsx                # Selector de menú por día
```

### Componentes UI
```
components/empleado/
├── EmpleadoNavbar.tsx          # Navbar mobile-first con bottom nav
└── menus/
    ├── WeekView.tsx            # Vista semanal en columnas
    └── DaySelector.tsx         # Selector de platos interactivo
```

### API Endpoints
```
app/api/empleado/pedidos/
└── route.ts                    # POST - Crear/actualizar pedidos
```

### Middleware
```
middleware.ts                   # Actualizado para permitir /empleado/*
```

---

## 🎨 Características Implementadas

### 1. Layout Mobile-First

- **Navbar superior** (desktop):
  - Logo empresa
  - Navegación: Menús, Perfil, Historial, Incidencias
  - Avatar + Dropdown del usuario
  - Botón "Vista Admin" (si es admin)

- **Bottom Navigation** (móvil):
  - Grid de 4 columnas
  - Iconos grandes + label
  - Activa automáticamente según ruta

### 2. Vista Semanal de Menús

**Pantalla principal** que muestra:

- Lunes a Viernes en columnas (grid responsive)
- Estado de cada día:
  - 🟡 **Pendiente**: Sin pedido
  - 🟢 **Confirmado**: Pedido realizado (editable)
  - 🔒 **Bloqueado**: Pasó el cutoff
  - ❌ **Cancelado**: Fue cancelado
  - ✅ **Entregado**: Ya fue servido

- **Información visual**:
  - Nombre del día + número
  - Badge de estado
  - Precio total (si hay pedido)
  - Botón "Elegir menú" o "Editar"

- **Validaciones**:
  - Cutoff automático (bloquea edición)
  - Detección de días sin menú disponible

### 3. Selector de Platos por Día

**Pantalla de selección** con:

- **Header**:
  - Fecha legible: "Lunes, 18 de noviembre"
  - Badge de estado (cutoff / editable)
  - Botón "Volver a la semana"

- **Secciones de platos**:
  - **Primero** (opcional)
  - **Segundo** (obligatorio)
  - **Postre** (opcional)

- **Cada plato muestra**:
  - Checkbox visual (seleccionado/no seleccionado)
  - Nombre + descripción
  - Precio
  - Badges: Vegetariano, Vegano, Alérgeno
  - Calorías (si disponible)

- **Footer sticky**:
  - Total calculado en tiempo real
  - Validación de límite diario
  - Botón "Confirmar" / "Actualizar"

### 4. Sistema de Cutoff

**Reglas implementadas**:

- El empleado puede seleccionar/modificar **hasta las 11:00 del mismo día** (configurable por empresa)
- **Después del cutoff**:
  - El pedido se bloquea automáticamente
  - Solo permite visualización (modo lectura)
  - Muestra badge "Cutoff pasado"

- **Validaciones**:
  - Backend valida cutoff en cada operación
  - Frontend deshabilita botones si pasó el cutoff
  - Error claro si intenta modificar después del cutoff

### 5. Validaciones de Límite Diario

- **Límite fiscal**: 11€/día (o el configurado por empresa)
- **Validación en tiempo real**:
  - Suma de platos seleccionados
  - Alerta roja si supera el límite
  - Botón "Confirmar" deshabilitado

- **Backend valida** antes de guardar:
  - Si excede límite → Error 400
  - Mensaje claro al empleado

### 6. Detección de Alérgenos

- **Frontend**:
  - Badge rojo "Contiene alérgeno" si el plato tiene algún alérgeno del empleado
  - Advertencia visual destacada

- **Backend**:
  - Cruza `employee.allergens` con `dish.allergens`
  - No bloquea la selección (permite casos especiales)
  - Deja que el empleado decida (UX)

---

## 🔐 Seguridad y Permisos

### Middleware
- Ruta: `/empleado/*`
- Requiere:
  - Autenticación (`session`)
  - Subdomain (tenant empresa)
  - Rol: `EMPLEADO`, `ADMIN_EMPRESA`, `RRHH`, `FINANZAS`, `SUPER_ADMIN`

### API Endpoint
- `POST /api/empleado/pedidos`
- Validaciones:
  - Usuario autenticado
  - Tenant tipo `EMPRESA`
  - Employee pertenece al usuario
  - Cutoff no pasado
  - Precio dentro del límite

---

## 🎯 Flujo de Usuario (Happy Path)

1. **Empleado entra al portal**:
   - URL: `https://{empresa}.comida.localhost:3000/empleado/menus`
   - Ve la vista semanal

2. **Selecciona un día**:
   - Clic en "Elegir menú"
   - Redirige a `/empleado/menus/2025-11-18`

3. **Elige sus platos**:
   - Marca un **segundo plato** (obligatorio)
   - Opcionalmente marca **primero** y **postre**
   - Ve el total calculado en tiempo real

4. **Confirma el pedido**:
   - Clic en "Confirmar"
   - Toast de éxito
   - Redirige a la vista semanal
   - El día ahora muestra estado "Confirmado" con precio

5. **Puede editar hasta el cutoff**:
   - Vuelve a entrar al mismo día
   - Cambia platos
   - Clic en "Actualizar"

6. **Después del cutoff**:
   - El botón cambia a "Ver menú"
   - Solo puede ver, no editar

---

## 📊 Datos en BD

### Tablas Utilizadas
- `employees`: Datos del empleado (allergens, dietPrefs)
- `orders`: Pedidos (selection, price, status)
- `dish_schedules`: Menús programados por día
- `dishes`: Platos disponibles (course, price, allergens)
- `companies`: Límites y políticas
- `company_policies`: Cutoff time, límite diario
- `company_catering_assignments`: Catering asignado

### Estados de Pedido
- `CONFIRMED`: Pedido activo (editable antes del cutoff)
- `LOCKED_AFTER_CUTOFF`: Bloqueado tras cutoff
- `CANCELLED_BEFORE_CUTOFF`: Cancelado por empleado
- `DELIVERED`: Ya fue entregado
- `NO_SHOW`: No recogió el menú

---

## 🎨 UX Highlights

### Mobile-First
- Bottom navigation en móvil
- Touch-friendly: botones grandes, spacing generoso
- Cards con padding adecuado
- Scroll infinito

### Visual Feedback
- Loading states (Skeleton)
- Toast notifications (Sonner)
- Estados de color (verde/rojo/amarillo)
- Iconos intuitivos (Lucide React)
- Badges para estado

### Accesibilidad
- Roles semánticos
- Navegación por teclado
- Contraste adecuado
- Labels descriptivos

---

## 🧪 Cómo Probar

### 1. Crear un empleado en Prisma Studio

```sql
-- Asegúrate de que existe un usuario con rol EMPLEADO
-- y un employee vinculado a ese usuario
```

### 2. Configurar /etc/hosts

```
127.0.0.1 mediacreative.comida.localhost
```

### 3. Iniciar el servidor

```bash
npm run dev
```

### 4. Acceder al portal

```
http://mediacreative.comida.localhost:3000/empleado/menus
```

### 5. Flujo de testing

- [ ] Vista semanal carga correctamente
- [ ] Muestra 5 días (L-V)
- [ ] Cutoff se calcula correctamente
- [ ] Selector de platos funciona
- [ ] Validación de límite diario
- [ ] Detección de alérgenos
- [ ] Confirmar pedido guarda en BD
- [ ] Actualizar pedido funciona
- [ ] Después del cutoff: solo lectura

---

## 🚀 Próximas Fases

### FASE 2: Mi Perfil
- Ver/editar alérgenos
- Preferencias dietéticas
- Datos personales
- Cambiar contraseña

### FASE 3: Historial
- Listado de pedidos anteriores
- Filtros (mes, estado)
- Detalles de cada pedido
- Ratings enviados

### FASE 4: Incidencias
- Reportar problemas
- Ver estado de incidencias
- Chat con soporte
- Historial de resoluciones

### FASE 5: Valoraciones
- Valorar platos después de consumir
- Rating (1-5 estrellas)
- Comentarios opcionales
- Ver ratings anteriores

---

## 📝 Notas Técnicas

### Performance
- Server Components por defecto
- Client Components solo donde se necesita interactividad
- Suspense para loading states
- Optimistic UI en selección de platos

### Reusabilidad
- Queries en `lib/db/queries/empleado-menus.ts`
- Componentes UI reutilizables (shadcn/ui)
- Validaciones con Zod (reutilizables)
- Middleware compartido

### Escalabilidad
- Queries optimizadas con select específico
- Índices en BD (serviceDate, employeeId)
- Cache de tenant en headers
- Paginación lista para historial

---

## ✅ Checklist de Funcionalidad

- [x] Middleware permite acceso a `/empleado/*`
- [x] Layout minimalista mobile-first
- [x] Vista semanal muestra L-V
- [x] Estados de pedido correctos
- [x] Selector de platos funcional
- [x] Cutoff automático
- [x] Validación de límite diario
- [x] Detección de alérgenos
- [x] API POST /api/empleado/pedidos
- [x] Crear pedido nuevo
- [x] Actualizar pedido existente
- [x] Validaciones backend
- [x] Loading states
- [x] Error handling
- [x] Toast notifications
- [x] Responsive design
- [x] Bottom navigation móvil

---

**🎉 FASE 1 COMPLETADA**

El portal empleado está listo para usar. Los empleados ya pueden:
- Ver menús de la semana
- Seleccionar sus comidas
- Validar límites y alérgenos
- Confirmar y actualizar pedidos

---

**Siguiente paso:** FASE 2 - Mi Perfil

