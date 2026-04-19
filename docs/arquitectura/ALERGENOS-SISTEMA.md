# 🥜 Sistema de Alérgenos - Arquitectura Completa

## 📋 RESUMEN

Los alérgenos en el sistema están **centralizados** y se gestionan de forma **relacional** para evitar duplicación. Cada empleado puede marcar sus alergias y el sistema bloqueará automáticamente los platos que contengan esos alérgenos.

---

## 🗄️ ARQUITECTURA DE BASE DE DATOS

### 1. Tabla `Allergen` (Master)

**Ubicación**: Tabla global (compartida por todos los tenants)

```prisma
model Allergen {
  id          String   @id @default(uuid())
  name        String   // "Gluten", "Lactosa", "Frutos secos"
  code        String   @unique // "GLU", "LAC", "NUT"
  description String?
  icon        String?  // Emoji o nombre de icono
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("allergens")
}
```

**Propósito**:
- ✅ **Fuente única de verdad** para todos los alérgenos
- ✅ Gestionados por SUPER_ADMIN en el portal Admin
- ✅ Usados por todos los caterings y empleados
- ✅ No duplicación de datos

---

### 2. Campo `Employee.dietPrefs` (JSON)

**Ubicación**: Tabla `Employee`, campo `diet_prefs`

```typescript
type DietPrefs = {
  allergens?: string[]              // Array de IDs de Allergen
  blockAllergensEnabled?: boolean   // Si true, bloquea platos con alérgenos
  preferences?: string[]            // Preferencias dietéticas (vegetariano, vegano, etc.)
  restrictions?: string[]           // Restricciones adicionales
  calorieTarget?: number            // Meta de calorías diarias
}
```

**Ejemplo**:
```json
{
  "allergens": ["uuid-gluten", "uuid-lactosa"],
  "blockAllergensEnabled": true,
  "preferences": ["vegetarian"],
  "restrictions": ["no_red_meat"],
  "calorieTarget": 2000
}
```

**Propósito**:
- ✅ Almacena las **referencias** a los alérgenos del empleado
- ✅ Configuración personalizada por empleado
- ✅ Flexible (JSON permite añadir campos sin migración)

---

### 3. Campo `Dish.labels` (JSON)

**Ubicación**: Tabla `Dish`, campo `labels`

```typescript
type DishLabels = string[]  // Array de códigos de alérgenos + etiquetas dietéticas
```

**Ejemplo**:
```json
[
  "GLU",           // Contiene gluten
  "LAC",           // Contiene lactosa
  "vegan",         // Es vegano
  "gluten_free",   // Sin gluten
  "low_calorie"    // Bajo en calorías
]
```

**Propósito**:
- ✅ Etiqueta los platos con los alérgenos que contienen
- ✅ Usa **códigos** de la tabla `Allergen` para consistencia
- ✅ También incluye etiquetas dietéticas (vegan, vegetarian, etc.)

---

## 🔄 FLUJO DE DATOS

### 1️⃣ ADMIN CREA ALÉRGENOS (Una sola vez)

```
Portal Admin (sintupper.com/admin)
  ↓
SUPER_ADMIN crea/edita alérgenos
  ↓
Tabla `Allergen` (master)
  ↓
Disponibles para TODOS los tenants
```

**Ejemplo de alérgenos master**:
| ID | Código | Nombre |
|----|--------|--------|
| uuid-1 | GLU | Gluten |
| uuid-2 | LAC | Lactosa |
| uuid-3 | NUT | Frutos secos |
| uuid-4 | EGG | Huevo |
| uuid-5 | FISH | Pescado |

---

### 2️⃣ CATERING ETIQUETA PLATOS

```
Portal Catering (deliciasexpress.sintupper.com/catering)
  ↓
Chef/Admin selecciona alérgenos del plato
  ↓
Guarda en `Dish.labels` usando CÓDIGOS
  ↓
["GLU", "LAC", "vegan"]
```

**Ejemplo**:
- **Plato**: Pasta carbonara
- **Labels**: `["GLU", "EGG", "LAC"]` (contiene gluten, huevo, lactosa)

---

### 3️⃣ EMPLEADO CONFIGURA SUS ALERGIAS

```
Portal Empleado (acme.sintupper.com/empleado/perfil)
  ↓
Empleado selecciona sus alergias
  ↓
Se guardan en `Employee.dietPrefs` usando IDs
  ↓
{
  "allergens": ["uuid-1", "uuid-2"],
  "blockAllergensEnabled": true
}
```

**Ejemplo**:
- **Empleado**: Laura Gómez
- **Alergias**: Gluten (`uuid-1`), Lactosa (`uuid-2`)
- **Bloqueo**: Activado

---

### 4️⃣ SISTEMA FILTRA PLATOS

```
Empleado accede a /empleado/menus
  ↓
Backend obtiene:
  - employee.dietPrefs.allergens (IDs)
  - Convierte IDs a CÓDIGOS (GLU, LAC)
  ↓
Filtra platos:
  - Si dish.labels contiene "GLU" o "LAC" → NO MOSTRAR
  ↓
Menú personalizado sin alérgenos
```

**Ejemplo de filtrado**:
```typescript
// Backend (lib/db/queries/empleado-menus.ts)
const employeeAllergenCodes = await prisma.allergen.findMany({
  where: { id: { in: employee.dietPrefs.allergens } },
  select: { code: true }
})  // ["GLU", "LAC"]

const safeDishes = dishes.filter(dish => {
  const dishLabels = dish.labels as string[]
  return !employeeAllergenCodes.some(code => dishLabels.includes(code))
})
```

---

## 🔗 RELACIONES

```
┌─────────────┐
│  Allergen   │ (Master - Global)
│  (Table)    │
└──────┬──────┘
       │
       │ Referenced by CODE
       │
       ├───────────────────┐
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│ Dish.labels │     │Employee.    │
│   (JSON)    │     │dietPrefs    │
│             │     │   (JSON)    │
└─────────────┘     └─────────────┘
       │                   │
       │                   │
       └───────┬───────────┘
               │
               ▼
        🍽️ MENÚ FILTRADO
```

---

## ✅ VENTAJAS DE ESTE DISEÑO

1. **✅ Sin Duplicación**
   - Un solo `Allergen` para "Gluten" en todo el sistema
   - Caterings y empleados lo referencian

2. **✅ Consistencia**
   - Cambiar el nombre de un alérgeno lo actualiza en todos lados
   - Códigos (`GLU`, `LAC`) aseguran que las etiquetas sean correctas

3. **✅ Escalabilidad**
   - Añadir nuevos alérgenos sin migración de datos
   - JSON flexible para futuras extensiones

4. **✅ Seguridad**
   - Sistema automático de bloqueo
   - Empleados no pueden seleccionar platos peligrosos

5. **✅ Multi-tenant**
   - Alérgenos compartidos por todos los tenants
   - Cada tenant puede usar los que necesite

---

## 🚨 CASOS DE USO

### Caso 1: Empleado con alergia al gluten

1. Laura accede a `/empleado/perfil`
2. Marca "Gluten" (uuid-1) en sus alergias
3. Activa "Bloquear platos con alérgenos"
4. Guarda → `dietPrefs: { allergens: ["uuid-1"], blockAllergensEnabled: true }`
5. Al acceder a `/empleado/menus`:
   - Backend obtiene `uuid-1` → código `GLU`
   - Filtra todos los platos con `labels: ["GLU", ...]`
   - Laura solo ve platos sin gluten

---

### Caso 2: Catering añade plato con lactosa

1. Chef accede a `/catering/platos/nuevo`
2. Crea "Crema de champiñones"
3. Selecciona alérgenos: "Lactosa" (LAC)
4. Guarda → `labels: ["LAC", "vegetarian"]`
5. Empleados con alergia a lactosa NO verán este plato

---

### Caso 3: Admin añade nuevo alérgeno

1. SUPER_ADMIN accede a `/admin/alergenos`
2. Crea "Soja" (código: SOY)
3. Guarda en tabla `Allergen`
4. Inmediatamente disponible para:
   - ✅ Caterings (al etiquetar platos)
   - ✅ Empleados (al marcar alergias)

---

## 📊 DATOS DE EJEMPLO

### Tabla `Allergen`
```sql
INSERT INTO allergens (id, code, name, description, icon) VALUES
('uuid-1', 'GLU', 'Gluten', 'Presente en trigo, cebada, centeno', '🌾'),
('uuid-2', 'LAC', 'Lactosa', 'Azúcar de la leche', '🥛'),
('uuid-3', 'NUT', 'Frutos secos', 'Almendras, nueces, avellanas', '🥜'),
('uuid-4', 'EGG', 'Huevo', 'Huevo de gallina', '🥚'),
('uuid-5', 'FISH', 'Pescado', 'Pescado y derivados', '🐟');
```

### Employee.dietPrefs
```json
{
  "allergens": ["uuid-1", "uuid-2"],
  "blockAllergensEnabled": true,
  "preferences": ["vegetarian"],
  "calorieTarget": 1800
}
```

### Dish.labels
```json
["GLU", "LAC", "vegetarian", "low_calorie"]
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### API Endpoint: `/api/empleado/alergenos` (POST)

```typescript
// Body
{
  "employeeId": "uuid",
  "allergens": ["uuid-1", "uuid-2"],  // IDs de Allergen
  "blockEnabled": true
}

// Guarda en Employee.dietPrefs
{
  ...currentDietPrefs,
  allergens: ["uuid-1", "uuid-2"],
  blockAllergensEnabled: true
}
```

### Filtrado en `/empleado/menus`

```typescript
// 1. Obtener códigos de alergenos del empleado
const allergenCodes = await prisma.allergen.findMany({
  where: { id: { in: employee.dietPrefs.allergens } },
  select: { code: true }
})  // ["GLU", "LAC"]

// 2. Filtrar platos
const safeDishes = dishes.filter(dish => {
  const labels = dish.labels as string[]
  return !allergenCodes.some(code => labels.includes(code))
})
```

---

## 🎯 CONCLUSIÓN

El sistema de alérgenos está **bien diseñado** para ser:
- ✅ **Centralizado** (tabla `Allergen` master)
- ✅ **Relacional** (referencias por ID/código)
- ✅ **Sin duplicación** (un solo lugar para cada alérgeno)
- ✅ **Flexible** (JSON para configuración personalizada)
- ✅ **Seguro** (bloqueo automático de platos peligrosos)

**No hay duplicación de datos, todo está relacionado correctamente.** 🎉

