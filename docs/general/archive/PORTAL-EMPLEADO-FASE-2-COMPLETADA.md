# Portal Empleado - FASE 2 COMPLETADA ✅

**Fecha:** Noviembre 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 Resumen

Se ha completado la **FASE 2** del Portal del Empleado: **Mi Perfil**, que incluye:

- ✅ Vista de información personal (solo lectura)
- ✅ Estadísticas de consumo personal
- ✅ KPIs mensuales y últimos 30 días
- ✅ Historial de 6 meses
- ✅ Cambio de contraseña con validaciones
- ✅ UI simple y sin complicaciones

---

## 📁 Archivos Creados

### Queries
```
lib/db/queries/
└── empleado-perfil.ts          # Queries para perfil y estadísticas
```

### Páginas
```
app/(empleado)/empleado/perfil/
└── page.tsx                    # Página con tabs (Info, Stats, Settings)
```

### Componentes
```
components/empleado/perfil/
├── ProfileInfo.tsx             # Información personal
├── ProfileStats.tsx            # Estadísticas y KPIs
└── ProfileSettings.tsx         # Cambiar contraseña
```

### API Endpoints
```
app/api/empleado/cambiar-password/
└── route.ts                    # POST - Cambiar contraseña
```

---

## 🎨 Características Implementadas

### 1. Tab: Información Personal

**Vista de solo lectura** (RRHH gestiona los datos):

✅ **Card principal**:
- Avatar con inicial
- Nombre completo
- Email
- Badge de estado (Activo/Inactivo)
- Teléfono (si existe)
- Nº de empleado (si existe)
- Departamento (si existe)
- Puesto (si existe)
- Fecha de alta
- Miembro desde

✅ **Card de empresa**:
- Logo empresa
- Nombre de la empresa
- Límite diario
- Límite mensual (si existe)

✅ **Card de sede** (si existe):
- Nombre de la sede
- Dirección
- Ciudad

✅ **Nota informativa**:
- Mensaje claro: "Contacta con RRHH para actualizar datos"

### 2. Tab: Estadísticas

**KPIs visuales** con cards:

✅ **Grid de 3 columnas**:
1. **Pedidos este mes**
   - Número total
   - Icono calendario

2. **Gasto este mes**
   - Total en euros
   - Badge con % del límite mensual (si aplica)
   - Color rojo si >90%

3. **Promedio por pedido**
   - Precio medio
   - Límite diario como referencia

✅ **Alertas**:
- Cancelaciones este mes (si >0)
- Warning amarillo con recomendación

✅ **Último pedido**:
- Fecha legible
- Importe
- Badge de estado

✅ **Historial 6 meses**:
- Lista de meses
- Pedidos por mes
- Gasto total por mes
- Promedio por pedido

✅ **Resumen inteligente**:
- Card azul con bullets
- "Has realizado X pedidos..."
- "Tu gasto promedio es..."
- "Te quedan X€ este mes..." (si hay límite mensual)

### 3. Tab: Configuración

**Cambio de contraseña** (simple y seguro):

✅ **Botón inicial**: "Cambiar"

✅ **Formulario al activar**:
1. **Contraseña actual**
   - Input tipo password
   - Toggle para mostrar/ocultar

2. **Nueva contraseña**
   - Input tipo password
   - Toggle para mostrar/ocultar
   - **Validaciones en tiempo real**:
     - ✅ Mínimo 8 caracteres
     - ✅ Contiene números
     - ✅ Contiene letras
   - Iconos CheckCircle/XCircle según validación

3. **Confirmar contraseña**
   - Input tipo password
   - Validación: "Las contraseñas no coinciden"

✅ **Botones**:
- "Guardar nueva contraseña" (deshabilitado si no válido)
- "Cancelar" (resetea formulario)

✅ **Seguridad**:
- Validación backend con bcrypt
- Verificación de contraseña actual
- Hash seguro de nueva contraseña
- Toast de éxito/error

---

## 🔐 Seguridad

### API Endpoint `/api/empleado/cambiar-password`

✅ **Validaciones**:
- Usuario autenticado
- Tenant tipo `EMPRESA`
- Contraseña actual correcta (bcrypt.compare)
- Nueva contraseña cumple requisitos (Zod)
- Hash seguro con bcryptjs (10 rounds)

✅ **Errores claros**:
- 401: No autenticado
- 403: Tenant no es empresa
- 400: Contraseña actual incorrecta
- 400: Datos inválidos (Zod)
- 500: Error interno

---

## 📊 Queries Implementadas

### `getEmployeeProfile(employeeId)`

Obtiene:
- Datos personales del empleado
- Empresa y límites
- Sede (si existe)
- Estadísticas mes actual
- Estadísticas últimos 30 días
- Último pedido

### `getEmployeeMonthlyHistory(employeeId, months)`

Obtiene:
- Historial de X meses (default: 6)
- Pedidos por mes
- Gasto por mes
- Para gráficas/visualizaciones

### `updateEmployeeProfile(employeeId, data)`

Actualiza:
- Solo teléfono (por ahora)
- Los demás datos los gestiona RRHH
- Preparado para extender

---

## 🎯 Flujo de Usuario

### Ver Perfil
1. Clic en "Mi Perfil" (navbar)
2. Ve sus datos personales
3. Ve empresa y límites
4. Todo en modo lectura (no editable)

### Ver Estadísticas
1. Clic en tab "Estadísticas"
2. Ve KPIs del mes
3. Ve último pedido
4. Ve historial 6 meses
5. Lee el resumen inteligente

### Cambiar Contraseña
1. Clic en tab "Configuración"
2. Clic en "Cambiar"
3. Introduce contraseña actual
4. Introduce nueva contraseña
5. Ve validaciones en tiempo real
6. Confirma nueva contraseña
7. Clic en "Guardar"
8. Toast de éxito
9. Formulario se resetea

---

## 🎨 UI/UX Highlights

### Simple y Claro
- **NO** hay formularios complejos de alergias
- **NO** hay selectores múltiples
- **NO** hay sistemas de bloqueo por alérgenos
- **SOLO** visualización y cambio de contraseña

### Mobile-First
- Cards responsivas
- Grid adaptativo (1 col móvil, 2-3 col desktop)
- Botones touch-friendly
- Espaciado generoso

### Visual Feedback
- KPIs con iconos y colores
- Badges de estado
- Validaciones en tiempo real (CheckCircle/XCircle)
- Toast notifications
- Loading states

### Accesibilidad
- Labels claros
- Contraste adecuado
- Toggle para mostrar/ocultar contraseñas
- Mensajes de error específicos

---

## 🧪 Cómo Probar

### 1. Acceder al perfil

```
http://mediacreative.comida.localhost:3000/empleado/perfil
```

### 2. Verificar datos

- [ ] Tab "Información" muestra datos correctos
- [ ] Empresa y límites correctos
- [ ] Sede aparece (si existe)

### 3. Verificar estadísticas

- [ ] KPIs muestran números correctos
- [ ] Historial 6 meses correcto
- [ ] Último pedido aparece (si existe)
- [ ] Resumen se genera correctamente

### 4. Cambiar contraseña

- [ ] Botón "Cambiar" activa formulario
- [ ] Validaciones en tiempo real funcionan
- [ ] Error si contraseña actual incorrecta
- [ ] Error si contraseñas no coinciden
- [ ] Toast de éxito al guardar
- [ ] Puede iniciar sesión con nueva contraseña

---

## ✅ Checklist de Funcionalidad

- [x] Query `getEmployeeProfile` funcional
- [x] Query `getEmployeeMonthlyHistory` funcional
- [x] Página de perfil con 3 tabs
- [x] Tab "Información" con datos completos
- [x] Tab "Estadísticas" con KPIs
- [x] Tab "Configuración" con cambio de contraseña
- [x] Validaciones de contraseña en tiempo real
- [x] API POST /api/empleado/cambiar-password
- [x] Verificación de contraseña actual
- [x] Hash seguro con bcrypt
- [x] Toast notifications
- [x] Loading states
- [x] Responsive design
- [x] Modo solo lectura para datos (RRHH los gestiona)

---

## 📝 Decisiones de Diseño

### ¿Por qué solo lectura en datos personales?

✅ **Razones**:
- Los datos críticos (nombre, departamento, puesto) los gestiona RRHH
- Evita inconsistencias
- Sigue las reglas del proyecto
- Nota informativa clara para el usuario

### ¿Por qué solo cambio de contraseña?

✅ **Razones**:
- Configuración simple y segura
- No se pidieron sistemas complejos de alergias
- Usuario puede gestionar su acceso
- Preparado para extender en el futuro

### ¿Por qué 6 meses de historial?

✅ **Razones**:
- Balance entre utilidad y performance
- Suficiente para ver tendencias
- No sobrecarga la UI
- Fácil de extender si se necesita

---

## 🚀 Próximas Fases

### FASE 3: Historial
- Listado completo de pedidos anteriores
- Filtros (mes, estado, catering)
- Detalles de cada pedido
- Descargar facturas

### FASE 4: Incidencias
- Reportar problemas con pedidos
- Ver estado de incidencias
- Historial de resoluciones
- Seguimiento en tiempo real

### FASE 5: Valoraciones
- Valorar platos después de consumir
- Rating 1-5 estrellas
- Comentarios opcionales
- Ver ratings anteriores

---

## 📚 Archivos Relacionados

### FASE 1 (completada)
- `docs/PORTAL-EMPLEADO-FASE-1-COMPLETADA.md`
- Vista semanal de menús
- Selector de platos
- Sistema de cutoff

### Próximas fases
- FASE 3: Historial
- FASE 4: Incidencias  
- FASE 5: Valoraciones

---

**🎉 FASE 2 COMPLETADA**

El perfil del empleado está listo. Los empleados ahora pueden:
- Ver su información personal y de empresa
- Ver estadísticas de consumo mensuales
- Ver historial de 6 meses
- Cambiar su contraseña de forma segura

**Sin sistemas complejos, solo lo esencial** ✨

---

**Siguiente paso:** FASE 3 - Historial de Pedidos

