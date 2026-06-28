# 🔗 Verificar y Corregir Relación Company ↔ Catering

**Fecha**: 2025-11-21  
**Propósito**: Diagnosticar y corregir problemas de relación entre empresas y caterings

---

## 🚨 PROBLEMA REPORTADO

Los empleados no pueden ver menús porque:
- La empresa no tiene catering asignado en la BD
- La relación `CompanyCateringAssignment` no existe o está inactiva
- El seed falló antes de crear la relación

**Error típico**:
```
Error: No hay catering asignado a esta empresa
```

---

## 🔍 VERIFICACIÓN

### Opción 1: Ejecutar Script de Verificación (RECOMENDADO)

```bash
npm run db:verify-catering
```

**Este script**:
1. ✅ Busca la empresa ACME en la BD
2. ✅ Busca el catering Delicias Express
3. ✅ Verifica si existe la relación `CompanyCateringAssignment`
4. ✅ Si existe pero está inactiva, la activa
5. ✅ Si NO existe, la crea automáticamente

**Output esperado**:
```
🔍 Verificando relación ACME ↔ Delicias Express...

✅ Empresa ACME encontrada:
   - ID: uuid-empresa
   - Nombre: ACME Corporation S.L.
   - Tenant ID: uuid-tenant-empresa

✅ Catering Delicias Express encontrado:
   - ID: uuid-restaurant
   - Nombre: Delicias Express S.L.
   - Tenant ID: uuid-tenant-catering

✅ RELACIÓN YA EXISTE:
   - ID: uuid-assignment
   - Tipo: PRIMARY
   - Activa: true
   - Prioridad: 1

✅ TODO CORRECTO - La empresa ACME tiene catering asignado
```

**Si NO existe**:
```
⚠️  NO EXISTE LA RELACIÓN - Creando...

✅ RELACIÓN CREADA EXITOSAMENTE:
   - ID: uuid-nuevo
   - Empresa: ACME Corporation S.L.
   - Catering: Delicias Express S.L.
   - Tipo: PRIMARY
   - Activa: true

✅ TODO RESUELTO - Ahora los empleados de ACME pueden ver menús
```

---

### Opción 2: Verificación Manual con Prisma Studio

```bash
npm run db:studio
```

1. **Abrir tabla `Company`**:
   - Buscar "ACME Corporation"
   - Copiar el `id`

2. **Abrir tabla `Restaurant`**:
   - Buscar "Delicias Express"
   - Copiar el `tenantId`

3. **Abrir tabla `CompanyCateringAssignment`**:
   - Filtrar por `companyId` = (id de ACME)
   - Verificar que existe un registro
   - Verificar que `active` = `true`
   - Verificar que `tenantCatering` = (tenantId de Delicias)

**Si NO existe o está inactivo**: Ejecutar `npm run db:verify-catering`

---

## 🛠️ SOLUCIONES

### Solución 1: Script Automático (RECOMENDADO)

```bash
npm run db:verify-catering
```

Este script:
- ✅ Detecta automáticamente el problema
- ✅ Crea la relación si no existe
- ✅ Activa la relación si está inactiva
- ✅ Es **idempotente** (puedes ejecutarlo múltiples veces sin problemas)

---

### Solución 2: Re-ejecutar el Seed Completo

```bash
# 1. Resetear la BD (⚠️ BORRA TODOS LOS DATOS)
npx prisma migrate reset --force --skip-seed

# 2. Aplicar schema
npx prisma db push --accept-data-loss

# 3. Ejecutar seed completo
npm run db:seed
```

**⚠️ ADVERTENCIA**: Esto borra TODOS los datos y los recrea desde cero.

---

### Solución 3: Crear Manualmente en Prisma Studio

```bash
npm run db:studio
```

1. **Ir a tabla `CompanyCateringAssignment`**
2. **Click en "Add record"**
3. **Rellenar campos**:
   ```json
   {
     "id": "(auto-generado)",
     "tenantEmpresa": "(tenant ID de ACME)",
     "tenantCatering": "(tenant ID de Delicias)",
     "companyId": "(ID de ACME)",
     "type": "PRIMARY",
     "zones": [{"name": "Centro Madrid", "postalCodes": ["28013"]}],
     "priority": 1,
     "slaPunctuality": 95.0,
     "slaIncidentRate": 5.0,
     "active": true,
     "assignedAt": "(fecha actual)",
     "assignedBy": "manual",
     "createdAt": "(auto)",
     "updatedAt": "(auto)"
   }
   ```
4. **Save**

---

## 🧪 VERIFICACIÓN POST-FIX

### 1️⃣ Ejecutar el Script de Verificación

```bash
npm run db:verify-catering
```

Debe mostrar:
```
✅ TODO CORRECTO - La empresa ACME tiene catering asignado
```

---

### 2️⃣ Probar Portal Empleado

```
URL: https://acme.sintupper.com/login
Usuario: laura.gomez@acme.com
Password: Empleado123!
```

**Verificar**:
- ✅ Login exitoso
- ✅ Redirige a `/empleado/menus`
- ✅ NO error "No hay catering asignado"
- ✅ Ve menús de la semana
- ✅ Ve nombre del catering: "Delicias Express"
- ✅ Ve platos disponibles

---

### 3️⃣ Probar Portal Empresa (Admin)

```
URL: https://acme.sintupper.com/login
Usuario: rrhh@acme.com
Password: Rrhh123!
```

**Verificar**:
- ✅ Login exitoso
- ✅ En dashboard, sección "Catering"
- ✅ Muestra "Delicias Express S.L."
- ✅ Muestra estadísticas de SLA
- ✅ NO mensaje "No hay catering asignado"

---

## 📊 CASOS DE USO DEL SCRIPT

### Caso 1: Primera vez después del deploy
```bash
# Después de hacer deploy en Coolify
npm run db:verify-catering
```

**Output esperado**: "RELACIÓN CREADA EXITOSAMENTE"

---

### Caso 2: Verificación periódica
```bash
# Para asegurar que todo está OK
npm run db:verify-catering
```

**Output esperado**: "TODO CORRECTO"

---

### Caso 3: Después de un seed fallido
```bash
# Si el seed se interrumpió
npm run db:verify-catering
```

**Acción**: Crea las relaciones faltantes

---

### Caso 4: Relación inactiva
```bash
# Si alguien desactivó la relación por error
npm run db:verify-catering
```

**Acción**: Reactiva la relación automáticamente

---

## 🔧 CÓMO FUNCIONA EL SCRIPT

### Flujo de Ejecución

```
1. Conectar a BD
   ↓
2. Buscar empresa ACME
   ↓ (si no existe)
   └→ Error: "Ejecuta el seed"
   
   ↓ (si existe)
3. Buscar catering Delicias
   ↓ (si no existe)
   └→ Error: "Ejecuta el seed"
   
   ↓ (si existe)
4. Buscar relación CompanyCateringAssignment
   ↓ (si existe y activa)
   └→ ✅ "TODO CORRECTO"
   
   ↓ (si existe pero inactiva)
   └→ Activar relación → ✅ "Relación activada"
   
   ↓ (si NO existe)
   └→ Crear relación nueva → ✅ "Relación creada"
```

---

## 📋 CHECKLIST DE DIAGNÓSTICO

Si los empleados NO pueden ver menús:

- [ ] Ejecutar `npm run db:verify-catering`
- [ ] Verificar output del script
- [ ] Si dice "NO EXISTE", verificar que se creó correctamente
- [ ] Si dice "TODO CORRECTO", el problema es otro (verificar código)
- [ ] Probar login como empleado
- [ ] Verificar que ahora ve menús

---

## 🎯 TROUBLESHOOTING

### Error: "No se encontró la empresa ACME"

**Causa**: La tabla `Company` está vacía o no tiene ACME.

**Solución**:
```bash
npm run db:seed
```

---

### Error: "No se encontró el catering Delicias Express"

**Causa**: La tabla `Restaurant` está vacía o no tiene Delicias Express.

**Solución**:
```bash
npm run db:seed
```

---

### Script dice "TODO CORRECTO" pero empleados no ven menús

**Causa**: El problema NO es la relación catering, sino otro error.

**Verificar**:
1. Logs del servidor (errores Prisma)
2. Que el empleado tenga `status: 'ACTIVE'`
3. Que el empleado tenga `siteId` válido
4. Que existan platos en `DishSchedule` para las fechas

**Diagnóstico**:
```bash
npm run db:studio
# Verificar:
# - Tabla Employee: buscar usuario por email
# - Tabla CompanySite: verificar que siteId existe
# - Tabla DishSchedule: verificar que hay platos programados
```

---

## 📝 LOGS DE EJEMPLO

### Ejecución Exitosa (relación ya existe)

```bash
$ npm run db:verify-catering

> comidas-plataforma@0.1.0 db:verify-catering
> tsx scripts/verify-and-fix-catering-assignment.ts

🔍 Verificando relación ACME ↔ Delicias Express...

✅ Empresa ACME encontrada:
   - ID: 305369d3-d5b6-491a-b085-fec94c90ff7c
   - Nombre: ACME Corporation S.L.
   - Tenant ID: 883ce3ae-5c96-43fd-9c26-2d22ba9d092a
   - Tenant Name: ACME

✅ Catering Delicias Express encontrado:
   - ID: b8f0e4d2-8c9a-4f1e-9d3b-6a2f5e7c8d9e
   - Nombre: Delicias Express S.L.
   - Tenant ID: 6c8541cd-9083-4304-bffe-3d0edac680a6
   - Tenant Name: Delicias Express

✅ RELACIÓN YA EXISTE:
   - ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   - Tipo: PRIMARY
   - Activa: true
   - Prioridad: 1

✅ TODO CORRECTO - La empresa ACME tiene catering asignado
```

---

### Ejecución Creando Relación (primera vez)

```bash
$ npm run db:verify-catering

> comidas-plataforma@0.1.0 db:verify-catering
> tsx scripts/verify-and-fix-catering-assignment.ts

🔍 Verificando relación ACME ↔ Delicias Express...

✅ Empresa ACME encontrada:
   - ID: 305369d3-d5b6-491a-b085-fec94c90ff7c
   - Nombre: ACME Corporation S.L.
   - Tenant ID: 883ce3ae-5c96-43fd-9c26-2d22ba9d092a
   - Tenant Name: ACME

✅ Catering Delicias Express encontrado:
   - ID: b8f0e4d2-8c9a-4f1e-9d3b-6a2f5e7c8d9e
   - Nombre: Delicias Express S.L.
   - Tenant ID: 6c8541cd-9083-4304-bffe-3d0edac680a6
   - Tenant Name: Delicias Express

⚠️  NO EXISTE LA RELACIÓN - Creando...

✅ RELACIÓN CREADA EXITOSAMENTE:
   - ID: f1e2d3c4-b5a6-7890-cdef-123456789abc
   - Empresa: ACME Corporation S.L.
   - Catering: Delicias Express S.L.
   - Tipo: PRIMARY
   - Activa: true

✅ TODO RESUELTO - Ahora los empleados de ACME pueden ver menús
```

---

## 🔗 ARCHIVOS RELACIONADOS

| Archivo | Descripción |
|---------|-------------|
| `scripts/verify-and-fix-catering-assignment.ts` | Script de verificación y corrección |
| `prisma/seed.ts` | Seed principal (incluye creación de relación) |
| `prisma/schema.prisma` | Schema con modelo `CompanyCateringAssignment` |
| `lib/db/queries/empleado-menus.ts` | Query que usa la relación |

---

## 🎓 LECCIONES APRENDIDAS

### 1. Verificar Relaciones en BD

**Problema**: Asumimos que el seed creó todas las relaciones correctamente.

**Realidad**: El seed puede fallar parcialmente y dejar datos inconsistentes.

**Solución**: Script de verificación independiente que:
- ✅ Verifica estado actual
- ✅ Crea lo que falta
- ✅ Es idempotente (seguro ejecutar múltiples veces)

---

### 2. Separar Diagnóstico de Corrección

**Antes**: "Error en portal → mirar código"

**Ahora**: "Error en portal → verificar datos en BD primero"

**Flujo correcto**:
```
1. Error en aplicación
   ↓
2. Verificar datos en BD (npm run db:verify-catering)
   ↓
3. Si datos OK → problema en código
4. Si datos NO OK → script corrige automáticamente
```

---

### 3. Scripts de Mantenimiento

**Concepto**: No solo seeds para crear datos iniciales, sino también scripts para:
- ✅ Verificar integridad de datos
- ✅ Corregir inconsistencias
- ✅ Diagnosticar problemas
- ✅ Migrar datos

---

## 📈 ESTADO

| Item | Estado |
|------|--------|
| **Script creado** | ✅ COMPLETO |
| **npm command añadido** | ✅ `npm run db:verify-catering` |
| **Documentación** | ✅ COMPLETA |
| **Idempotencia** | ✅ Seguro ejecutar múltiples veces |
| **Pruebas** | ⏳ Pendiente ejecutar en producción |

---

**Fecha de creación**: 2025-11-21  
**Uso recomendado**: Después de cada deploy o cuando empleados no puedan ver menús  
**Seguridad**: ✅ Solo lee y crea datos, no borra nada


