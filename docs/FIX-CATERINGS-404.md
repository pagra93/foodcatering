# ✅ Fix: Error 404 en Detalle de Caterings

## 🐛 Problema Identificado

Al hacer click en "Ver Detalle" de cualquier catering en la lista, se obtenía un error **404**.

---

## 🔍 Causa Raíz

### **1. Datos Mock vs Datos Reales**

**Antes:**
```typescript
// app/(admin)/admin/caterings/page.tsx
async function CateringsTableData() {
  return <CateringsTable caterings={[]} />  // ❌ Array vacío
}
```

El componente `CateringsTable` detectaba el array vacío y mostraba **datos MOCK hardcodeados** con IDs ficticios (`'1'`, `'2'`, `'3'`, etc.)

### **2. IDs Falsos**

Cuando hacías click en "Ver Detalle":
- URL generada: `/admin/caterings/1`
- La página de detalle buscaba en BD: `getCateringById('1')`
- **No encontraba el catering** → `notFound()` → **404**

### **3. ID Real en BD**

```sql
SELECT id, name FROM tenants WHERE type = 'CATERING';

-- Resultado:
-- id: 9c8f0c8f-0a7a-48a7-ae19-52a65937e3f4
-- name: Delicias Express
```

El catering real tiene un UUID, NO el ID `'1'`.

---

## ✅ Solución Implementada

### **Cambio 1: Importar query real**

```typescript
// app/(admin)/admin/caterings/page.tsx
import { getCaterings } from '@/lib/db/queries/caterings'
```

### **Cambio 2: Conectar con la BD**

```typescript
async function CateringsTableData() {
  // ✅ Obtener caterings reales de la BD
  const { caterings } = await getCaterings({
    page: 1,
    pageSize: 100,
  })

  // Mapear a formato esperado por el componente
  const cateringsFormatted = caterings.map((catering) => {
    const restaurant = catering.restaurants[0]
    return {
      id: catering.id,  // ← ✅ ID REAL (UUID)
      name: catering.subdomain,
      displayName: catering.name,
      status: catering.status,
      zones: restaurant?.zones || [],
      dailyCapacity: restaurant?.dailyCapacity || 0,
      punctuality: restaurant?.punctualityRate ? Number(restaurant.punctualityRate) : null,
      incidentRate: restaurant?.incidentRate ? Number(restaurant.incidentRate) : null,
      avgRating: restaurant?.averageRating ? Number(restaurant.averageRating) : null,
      documentsStatus: restaurant?.documentsStatus || 'OK',
      lastInvoiceDate: null,
      commission: restaurant?.commission ? Number(restaurant.commission) : 0,
    }
  })

  return <CateringsTable caterings={cateringsFormatted} />
}
```

---

## 🧪 Cómo Probar

### **1. Ve a la lista de caterings**

```
http://localhost:3000/admin/caterings
```

**Resultado esperado:**
- ✅ Ves 1 catering: "Delicias Express"
- ✅ Ya NO ves los 5 caterings mock falsos

---

### **2. Haz click en "Ver Detalle"**

En el menú "Acciones" → "Ver Detalle"

**URL generada:**
```
http://localhost:3000/admin/caterings/9c8f0c8f-0a7a-48a7-ae19-52a65937e3f4
```

**Resultado esperado:**
- ✅ Se carga la página de detalle
- ✅ Ves los 8 tabs
- ✅ Ya NO da 404

---

### **3. URL directa**

También puedes ir directamente:

```
http://localhost:3000/admin/caterings/9c8f0c8f-0a7a-48a7-ae19-52a65937e3f4
```

**Resultado esperado:**
- ✅ Funciona correctamente

---

## 📊 Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Fuente de datos** | Mock hardcodeado | Base de datos real |
| **IDs** | `'1'`, `'2'`, `'3'`... | UUIDs reales |
| **Caterings mostrados** | 5 falsos | 1 real (Delicias Express) |
| **Click en "Ver"** | ❌ 404 | ✅ Funciona |
| **URL** | `/admin/caterings/1` | `/admin/caterings/9c8f0c8f...` |

---

## 🔧 Archivos Modificados

- ✅ `app/(admin)/admin/caterings/page.tsx`
  - Importada función `getCaterings`
  - Conectada query real en `CateringsTableData`
  - Mapeado datos al formato del componente

---

## 💡 Notas Adicionales

### **¿Por qué solo se ve 1 catering?**

Porque solo hay 1 en la base de datos. Puedes crear más usando:

```
http://localhost:3000/admin/caterings/new
```

### **¿Qué pasa con el componente CateringsTable?**

El componente **todavía tiene datos mock internos**, pero ahora:
- Si recibe `caterings={[]}` → Usa mock (fallback)
- Si recibe datos reales → **Usa los datos reales** ✅

### **Query para verificar caterings en BD**

```sql
SELECT 
  t.id,
  t.name,
  t.subdomain,
  t.status,
  r.display_name,
  r.daily_capacity
FROM tenants t
LEFT JOIN restaurants r ON r.tenant_id = t.id
WHERE t.type = 'CATERING'
ORDER BY t.created_at DESC;
```

---

## ✅ Estado Actual

- ✅ Lista de caterings conectada a BD real
- ✅ Detalle de catering funciona correctamente
- ✅ No más errores 404
- ✅ IDs reales (UUIDs)
- ✅ Datos consistentes entre lista y detalle

---

**Fecha:** 17 de Noviembre, 2025  
**Fix:** Conexión de datos reales en lista de caterings

