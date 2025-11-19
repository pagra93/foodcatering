# Sistema de Alérgenos - COMPLETADO ✅

**Fecha:** Noviembre 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 Resumen

Sistema completo de gestión de alérgenos para proteger a los empleados con alergias alimentarias. Incluye:

- ✅ Selector de alérgenos en el perfil (14 alérgenos EU)
- ✅ Sistema de bloqueo opcional (on/off)
- ✅ Advertencias visuales en platos (badges rojos)
- ✅ Detección automática de alérgenos coincidentes
- ✅ Bloqueo de selección si está activado
- ✅ Alertas contextuales en el selector

---

## 📁 Archivos Creados/Modificados

### Nuevos Archivos
```
components/empleado/perfil/
└── AllergenSelector.tsx        # Selector de alérgenos (14 tipos EU)

app/api/empleado/alergenos/
└── route.ts                    # POST - Guardar alérgenos

docs/
└── SISTEMA-ALERGENOS.md       # Esta documentación
```

### Archivos Modificados
```
components/empleado/perfil/
└── ProfileInfo.tsx             # Integración del AllergenSelector

components/empleado/menus/
└── DaySelector.tsx             # Advertencias + bloqueo en platos

lib/db/queries/
├── empleado-perfil.ts          # Include allergens + blockAllergensEnabled
└── empleado-menus.ts           # Include blockAllergensEnabled
```

---

## 🥜 Lista de Alérgenos (Normativa EU)

El sistema incluye los **14 alérgenos principales** según normativa europea:

1. **Gluten** - Trigo, centeno, cebada, avena
2. **Crustáceos** - Gambas, cangrejos, langostas
3. **Huevos** - Huevos y productos derivados
4. **Pescado** - Pescados y derivados
5. **Cacahuetes** - Cacahuetes y productos derivados
6. **Soja** - Soja y productos derivados
7. **Lácteos** - Leche y derivados (lactosa)
8. **Frutos secos** - Almendras, avellanas, nueces, etc.
9. **Apio** - Apio y derivados
10. **Mostaza** - Mostaza y derivados
11. **Sésamo** - Semillas de sésamo y derivados
12. **Sulfitos** - Conservantes SO2 >10mg/kg
13. **Altramuces** - Altramuces y derivados
14. **Moluscos** - Mejillones, almejas, calamares

---

## 🎨 Características Implementadas

### 1. Selector de Alérgenos (Perfil)

**Ubicación:** `/empleado/perfil` → Tab "Información"

✅ **Modo Vista**:
- Lista de alérgenos seleccionados (badges rojos)
- Estado del bloqueo
- Botón "Editar"

✅ **Modo Edición**:
- Grid 2 columnas (responsive)
- Checkbox + nombre + descripción
- Cards interactivas (clic para seleccionar)
- Border rojo si está seleccionado
- **Switch de bloqueo**:
  - ON: Bloquea platos con alérgenos
  - OFF: Solo muestra advertencias
- Botones "Guardar" / "Cancelar"

✅ **Info importante**:
- Alert azul con recordatorio de seguridad
- Mensaje claro sobre verificación

### 2. Sistema de Bloqueo

**Dos modos de operación:**

🔓 **Modo Advertencia (bloqueo OFF)**:
- Muestra badge rojo: "⚠️ Contiene: gluten, lacteos"
- Border rojo en el card del plato
- Background rojo suave
- **Permite seleccionar el plato** (usuario decide)

🔒 **Modo Bloqueo (bloqueo ON)**:
- Badge gris: "🔒 Bloqueado por alérgenos"
- Card deshabilitado (cursor not-allowed)
- Background gris
- Opacidad reducida
- **NO permite seleccionar el plato**

### 3. Advertencias en Selector de Platos

**Ubicación:** `/empleado/menus/[date]`

✅ **Alert global** (parte superior):
- **Amarillo** (bloqueo OFF):
  - "Advertencia: Tienes alérgenos configurados (gluten, lacteos)"
  - "Los platos que los contengan mostrarán advertencia"
  - "Activa el bloqueo en tu perfil para mayor seguridad"

- **Rojo** (bloqueo ON):
  - "Protección activa: Los platos que contengan tus alérgenos están bloqueados"
  - Lista de alérgenos configurados

✅ **Badges en cada plato**:
- Detección automática de coincidencias
- Muestra **qué alérgenos específicos** contiene
- Ejemplo: "⚠️ Contiene: gluten, lacteos"
- Color rojo intenso
- Font semibold para destacar

✅ **Estilo visual del card**:
- Border rojo (modo advertencia)
- Border gris (modo bloqueo)
- Background acorde al estado
- Cursor refleja si es clickeable

### 4. Detección Automática

**Lógica implementada:**

```typescript
// 1. Obtener alérgenos del plato
const dishAllergens = dish.allergens || []

// 2. Encontrar coincidencias con empleado
const matchingAllergens = data.employee.allergens.filter((a) =>
  dishAllergens.includes(a)
)

// 3. Determinar si tiene alérgenos
const hasAllergen = matchingAllergens.length > 0

// 4. Determinar si está bloqueado
const isBlocked = hasAllergen && data.employee.blockAllergensEnabled

// 5. Aplicar estilos y comportamiento
```

---

## 🔐 Seguridad y Validaciones

### API Endpoint `/api/empleado/alergenos`

✅ **Validaciones**:
- Usuario autenticado
- Tenant tipo `EMPRESA`
- Empleado pertenece al usuario
- Array de strings (alérgenos)
- Boolean (bloqueo)

✅ **Datos guardados en BD**:
```typescript
{
  allergens: ['gluten', 'lacteos', 'frutos_secos'],
  blockAllergensEnabled: true
}
```

✅ **Seguridad**:
- Solo el empleado puede modificar sus propios alérgenos
- Super Admin puede modificar cualquiera (casos especiales)
- Toast de confirmación
- Validación Zod

---

## 📊 Base de Datos

### Campos en `Employee`

```prisma
model Employee {
  // ... otros campos ...
  
  allergens              Json?    @default("[]")
  blockAllergensEnabled  Boolean  @default(false)
  
  // ... otros campos ...
}
```

### Datos de ejemplo

```json
{
  "id": "emp-123",
  "allergens": ["gluten", "lacteos"],
  "blockAllergensEnabled": true
}
```

---

## 🎯 Flujos de Usuario

### Flujo 1: Configurar Alérgenos

1. Empleado va a `/empleado/perfil`
2. Ve tab "Información"
3. Scroll hasta "Mis Alergias"
4. Clic en "Editar"
5. Selecciona sus alérgenos (checkboxes)
6. **Decide**: ¿Activar bloqueo?
   - ON: Máxima seguridad (no puede elegir platos)
   - OFF: Flexibilidad (ve advertencias pero decide)
7. Clic en "Guardar cambios"
8. Toast: "Alergias actualizadas correctamente"

### Flujo 2: Seleccionar Menú (con alérgenos configurados)

**Escenario A: Bloqueo OFF (advertencia)**

1. Empleado va a `/empleado/menus/2025-11-18`
2. Ve alert amarillo: "Tienes alérgenos configurados..."
3. Ve platos disponibles
4. Un plato tiene badge rojo: "⚠️ Contiene: gluten"
5. Card con border rojo y background suave
6. **Puede hacer clic** (si es consciente del riesgo)
7. Puede confirmar pedido

**Escenario B: Bloqueo ON (protección)**

1. Empleado va a `/empleado/menus/2025-11-18`
2. Ve alert rojo: "Protección activa..."
3. Ve platos disponibles
4. Un plato tiene badge gris: "🔒 Bloqueado por alérgenos"
5. Card deshabilitado (gris, opaco)
6. **NO puede hacer clic** (protegido)
7. Solo puede elegir platos sin alérgenos

### Flujo 3: Cambiar Modo de Bloqueo

1. Empleado decide que quiere más flexibilidad
2. Va a `/empleado/perfil` → "Información"
3. Clic en "Editar" (sección alérgenos)
4. Desactiva el switch "Activar bloqueo"
5. Clic en "Guardar"
6. Ahora verá advertencias pero podrá elegir

---

## 🎨 UI/UX Highlights

### Claridad Visual

✅ **Códigos de color consistentes**:
- 🔴 **Rojo**: Peligro, alérgeno presente
- 🟡 **Amarillo**: Advertencia, precaución
- 🔒 **Gris**: Bloqueado, no disponible
- 🟢 **Verde**: Seguro, vegetariano/vegano

✅ **Iconografía clara**:
- ⚠️ Triángulo de advertencia
- 🔒 Candado (bloqueo)
- 🛡️ Escudo (protección)
- ℹ️ Info (información)

✅ **Mensajes directos**:
- "Protección activa"
- "Contiene: gluten, lacteos"
- "Bloqueado por alérgenos"
- "Activa el bloqueo para mayor seguridad"

### Responsive

- Grid 2 columnas en desktop
- 1 columna en móvil
- Checkboxes grandes (touch-friendly)
- Espaciado generoso
- Bottom navigation no tapa contenido

### Accesibilidad

- Labels claros
- Descriptions en cada alérgeno
- Contraste alto (rojo sobre blanco)
- Cursor refleja estado (pointer/not-allowed)
- Feedback visual inmediato

---

## 🧪 Cómo Probar

### Test 1: Configurar Alérgenos

```
URL: http://mediacreative.comida.localhost:3000/empleado/perfil
```

**Pasos:**
1. [ ] Ir a tab "Información"
2. [ ] Ver sección "Mis Alergias"
3. [ ] Clic en "Editar"
4. [ ] Seleccionar 2-3 alérgenos (ej: gluten, lacteos)
5. [ ] Activar switch "Bloqueo"
6. [ ] Clic en "Guardar cambios"
7. [ ] Verificar toast de éxito
8. [ ] Badges rojos aparecen en vista

### Test 2: Ver Advertencias (bloqueo OFF)

**Setup:** Configurar alérgenos pero **desactivar** bloqueo

**Pasos:**
1. [ ] Ir a `/empleado/menus/[fecha]`
2. [ ] Ver alert amarillo con advertencia
3. [ ] Buscar un plato con alérgenos del empleado
4. [ ] Badge rojo: "⚠️ Contiene: gluten"
5. [ ] Card con border rojo
6. [ ] **Poder hacer clic** (no está bloqueado)
7. [ ] Seleccionar y confirmar pedido

### Test 3: Ver Bloqueo (bloqueo ON)

**Setup:** Configurar alérgenos y **activar** bloqueo

**Pasos:**
1. [ ] Ir a `/empleado/menus/[fecha]`
2. [ ] Ver alert rojo "Protección activa"
3. [ ] Buscar un plato con alérgenos
4. [ ] Badge gris: "🔒 Bloqueado"
5. [ ] Card deshabilitado (gris, opaco)
6. [ ] **NO poder hacer clic** (cursor not-allowed)
7. [ ] Solo poder elegir platos sin alérgenos

### Test 4: Cambiar entre Modos

**Pasos:**
1. [ ] Activar bloqueo en perfil
2. [ ] Verificar que platos se bloquean
3. [ ] Desactivar bloqueo en perfil
4. [ ] Verificar que platos ahora son clickeables
5. [ ] Badges cambian de gris a rojo
6. [ ] Alert cambia de rojo a amarillo

---

## ✅ Checklist de Funcionalidad

- [x] Selector de 14 alérgenos EU
- [x] Checkboxes interactivos
- [x] Switch de bloqueo (on/off)
- [x] API POST /api/empleado/alergenos
- [x] Validación de permisos
- [x] Guardado en BD (allergens + blockAllergensEnabled)
- [x] Toast de confirmación
- [x] Detección automática de coincidencias
- [x] Badge rojo con nombre de alérgenos
- [x] Badge gris si está bloqueado
- [x] Border y background según estado
- [x] Cursor refleja clickeabilidad
- [x] Alert global amarillo/rojo
- [x] Bloqueo efectivo (no permite clic)
- [x] Modo advertencia (permite clic con warning)
- [x] Responsive design
- [x] Sin errores de linting

---

## 📚 Normativa y Compliance

### Reglamento EU 1169/2011

Este sistema cumple con:

✅ **Art. 9 y Anexo II**: Lista de 14 alérgenos de declaración obligatoria
✅ **Art. 21**: Información sobre alérgenos debe ser clara y visible
✅ **Art. 44**: Responsabilidad del operador de informar

### Mejores Prácticas

✅ **Información clara**: Badges destacados en rojo
✅ **Control del usuario**: Puede activar/desactivar bloqueo
✅ **Trazabilidad**: Cada plato declara sus alérgenos
✅ **Seguridad opcional**: Bloqueo configurable
✅ **Flexibilidad**: Usuario puede decidir asumir riesgo

---

## 🚀 Extensiones Futuras (Opcional)

### Mejoras Posibles

- [ ] Niveles de severidad (leve, moderado, grave)
- [ ] Sustituciones automáticas (plato alternativo sin alérgeno)
- [ ] Historial de reacciones alérgicas
- [ ] Notificaciones si un plato favorito cambia composición
- [ ] Certificación médica de alergias (upload PDF)
- [ ] Export para ERP/RRHH (compliance laboral)

### Integraciones

- [ ] Sincronización con ficha médica empresa
- [ ] Notificación a RRHH si alergia grave
- [ ] Alerta a catering si pedido especial
- [ ] Link con mutua/seguro médico

---

## 🎉 SISTEMA COMPLETADO

El sistema de alérgenos está **100% funcional** y listo para producción.

**Características principales:**
- ✅ 14 alérgenos según normativa EU
- ✅ Selector visual e intuitivo
- ✅ Sistema de bloqueo opcional
- ✅ Advertencias claras en platos
- ✅ Detección automática de coincidencias
- ✅ Mensajería clara y directa
- ✅ Mobile-first y responsive
- ✅ Sin errores de linting

**Protección del empleado:** El sistema permite al empleado decidir su nivel de protección (advertencias vs. bloqueo total), cumpliendo con normativa europea y proporcionando flexibilidad.

---

**Siguiente paso:** FASE 3 - Historial de Pedidos (si procede)

