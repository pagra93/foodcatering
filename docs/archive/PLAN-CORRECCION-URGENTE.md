# 🚨 PLAN DE CORRECCIÓN URGENTE - ERRORES CRÍTICOS

## 📊 ANÁLISIS DE ERRORES IDENTIFICADOS

### 🔴 CATEGORÍA 1: ERRORES DE PRISMA (Schema Mismatch)

#### Error 1.1: AuditLog - Campos Incorrectos
**Archivos afectados**: `lib/db/queries/empresa-actividad.ts`

**Errores**:
```
Unknown argument `createdAt` (debe ser `timestamp`)
Unknown field `userId` (debe ser `actorId`)
Unknown field `resourceType` (debe ser `entity`)
Unknown field `resourceId` (debe ser `entityId`)
Unknown field `prevState` (no existe)
Unknown field `newState` (no existe)
Unknown field `ipAddress` (debe ser `ip`)
```

**Schema correcto**:
```prisma
model AuditLog {
  actorId     String    // ✅ NO userId
  timestamp   DateTime  // ✅ NO createdAt
  entity      String    // ✅ NO resourceType
  entityId    String    // ✅ NO resourceId
  ip          String?   // ✅ NO ipAddress
  diff        Json?     // ✅ NO prevState/newState separados
}
```

**Acción**: Reescribir `lib/db/queries/empresa-actividad.ts` con campos correctos

---

#### Error 1.2: CompanySettings - Campo Incorrecto
**Archivos afectados**: `lib/db/queries/empresa-configuracion.ts`

**Error**:
```
Unknown field `deliveryNotes` for CompanySettings
```

**Schema correcto**:
```prisma
model CompanySettings {
  deliveryInstructions String?  // ✅ NO deliveryNotes
}
```

**ERROR MÍO**: Cambié `deliveryInstructions` a `deliveryNotes` en el commit anterior, pero:
- `CompanySite` tiene `deliveryNotes` ✅
- `CompanySettings` tiene `deliveryInstructions` ✅

**Acción**: Revertir cambio en `CompanySettings` (solo afecta a este modelo)

---

#### Error 1.3: CompanyPolicy - Argumento con tipo incorrecto
**Archivos afectados**: `lib/db/queries/empresa-auditoria.ts`

**Error**:
```
Argument `companyId`: Invalid value provided. Expected String, provided Int.
```

**Causa**: Pasando `year` (Int) en lugar de `companyId` (String)

**Acción**: Revisar llamadas a `checkFiscalCompliance()` - orden de parámetros

---

#### Error 1.4: FiscalReport - Invalid Date
**Archivos afectados**: `lib/db/queries/empresa-auditoria.ts`

**Error**:
```
gte: new Date("Invalid Date")
```

**Causa**: Creación incorrecta de fechas en `generateFiscalReport()`

**Acción**: Corregir creación de fechas usando `new Date(year, month - 1, 1)`

---

### 🔴 CATEGORÍA 2: ERRORES DE UI (Event Handlers)

#### Error 2.1: Event handler en Server Component
**Archivos afectados**: Varios componentes con botones

**Error**:
```
Event handlers cannot be passed to Client Component props.
{onClick: function onClick}
```

**Acción**: Identificar TODOS los componentes con este error y convertirlos a Client Components o usar `asChild`

---

### 🔴 CATEGORÍA 3: LÓGICA DE NEGOCIO ROTA

#### Error 3.1: No hay catering asignado
**Pantalla**: Portal Empresa → Catering

**Causa posible**: 
- `CompanyCateringAssignment` no existe en BD
- Query incorrecta

**Acción**: 
1. Verificar seed (¿se creó la asignación?)
2. Verificar query en `lib/db/queries/empresa-catering.ts`

---

#### Error 3.2: Botones no funcionan
**Pantallas afectadas**:
- Empleados: Añadir, Ver, Editar, Suspender, Eliminar
- Incidencias: Nueva, Ver

**Causa posible**: Event handlers en Server Components

**Acción**: Revisar TODOS los botones y convertir a Client Components donde sea necesario

---

## 🎯 ORDEN DE EJECUCIÓN

### SPRINT 1: Corregir Prisma Queries (PRIORIDAD MÁXIMA)
1. ✅ Verificar schema de `AuditLog`
2. ✅ Corregir `lib/db/queries/empresa-actividad.ts`
3. ✅ Corregir `CompanySettings.deliveryInstructions` (revertir error)
4. ✅ Corregir `lib/db/queries/empresa-auditoria.ts` (orden parámetros + fechas)
5. ✅ Verificar `lib/db/queries/empresa-configuracion.ts`

### SPRINT 2: Verificar Seed y Datos
1. ✅ Verificar si `CompanyCateringAssignment` existe en BD
2. ✅ Ejecutar script de verificación si es necesario
3. ✅ Verificar integridad de datos

### SPRINT 3: Corregir Event Handlers (UI)
1. ✅ Buscar TODOS los archivos con `onClick` en Server Components
2. ✅ Convertir a Client Components o usar patrones correctos
3. ✅ Probar cada botón manualmente

### SPRINT 4: Validación de Formularios
1. ✅ Revisar schemas Zod en configuración
2. ✅ Marcar campos opcionales correctamente
3. ✅ Probar guardado de formularios

### SPRINT 5: Testing Completo
1. ✅ Probar cada pantalla del portal empresa
2. ✅ Probar cada botón y acción
3. ✅ Verificar logs limpios

---

## 📝 ARCHIVOS A REVISAR/MODIFICAR

### Prioridad ALTA (rompen la app):
1. `lib/db/queries/empresa-actividad.ts` - AuditLog
2. `lib/db/queries/empresa-configuracion.ts` - CompanySettings
3. `lib/db/queries/empresa-auditoria.ts` - Fechas + parámetros
4. `lib/db/queries/empresa-catering.ts` - Verificar query

### Prioridad MEDIA (funcionalidad rota):
5. `components/empresa/empleados/*` - Event handlers
6. `components/empresa/incidencias/*` - Event handlers
7. `app/(empresa)/empresa/configuracion/*` - Validación formularios

### Prioridad BAJA (mejoras):
8. Scripts de verificación de datos
9. Documentación de errores

---

## ⚠️ ERRORES CRÍTICOS A NO REPETIR

1. ❌ NO cambiar nombres de campos sin verificar el schema completo
2. ❌ NO asumir que todos los modelos tienen los mismos campos
3. ❌ NO usar find/replace global sin revisar cada archivo
4. ❌ NO commitear sin probar en todas las pantallas afectadas
5. ❌ NO pasar funciones desde Server Components a Client Components

---

## ✅ CHECKLIST FINAL

Antes de hacer commit, verificar:
- [ ] Schema de Prisma consultado para CADA modelo
- [ ] Queries probadas con datos reales
- [ ] Event handlers solo en Client Components
- [ ] Formularios validan correctamente
- [ ] TODAS las pantallas del portal empresa funcionan
- [ ] Logs limpios sin errores de Prisma
- [ ] Botones responden correctamente
- [ ] Datos se guardan correctamente

---

**Última actualización**: $(date)
**Estado**: EN PROGRESO

