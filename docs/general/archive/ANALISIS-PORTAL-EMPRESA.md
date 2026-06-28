# 🔍 ANÁLISIS COMPLETO - PORTAL EMPRESA

**Fecha**: 2025-11-21  
**Portal**: `acme.sintupper.com`  
**Usuario Prueba**: `rrhh@acme.com`  
**Estado**: Análisis inicial completado

---

## 📊 RESUMEN EJECUTIVO

Se han identificado **9 problemas críticos** en el portal empresa que impiden el uso normal de la aplicación. Los problemas se dividen en:

- **3 Bloqueadores** (impiden funcionalidad core): Configuración, Pedidos, Empleados
- **4 Redirecciones incorrectas** (rutas no implementadas): Facturación, Incidencias, Auditoría, Actividad
- **1 Error de arquitectura** (Catering da error, ya sabemos por qué)
- **1 Problema de UX** (usuario RRHH no puede acceder a portal empleado)

---

## 🔴 PROBLEMA 1: CONFIGURACIÓN NO MUESTRA NADA

### Síntoma
> "No se pudo cargar la configuración de la empresa"

### Causa Probable
1. Query de Prisma con campos incorrectos (ya corregimos algunos en `empresa-configuracion.ts`)
2. API route `/api/empresa/configuracion/*` tiene errores
3. Componentes intentan acceder a campos que no existen

### Archivos Involucrados
- `lib/db/queries/empresa-configuracion.ts`
- `app/api/empresa/configuracion/**/route.ts`
- `app/(empresa)/empresa/configuracion/page.tsx`
- Componentes: `ConfigPlanTab`, `ConfigSettingsTab`, etc.

### Prioridad
🔴 **CRÍTICA** - La configuración es esencial para el funcionamiento del sistema

---

## 🔴 PROBLEMA 2: EMPLEADOS - MÚLTIPLES FALLOS

### 2A. No se puede ver detalle del empleado

**Síntoma**: Click en empleado no muestra detalle

**Causa Probable**:
- Ruta `app/(empresa)/empresa/empleados/[id]/page.tsx` no existe o tiene error
- Link mal formado en la tabla de empleados

### 2B. Editar da error 404

**Síntoma**: Click en "Editar" → 404

**Causa Probable**:
- Ruta `app/(empresa)/empresa/empleados/[id]/editar/page.tsx` NO EXISTE
- O el componente intenta navegar a `/empresa/empleados/[id]/edit` (inglés)

### 2C. Suspender no hace nada

**Síntoma**: Click en "Suspender" → sin respuesta

**Causa Probable**:
- API route `/api/empresa/empleados/[id]/suspender` falta o tiene error
- Componente no tiene `'use client'` y el onClick no funciona
- Falta manejo de respuesta (loading, success, error)

### Archivos Involucrados
- `app/(empresa)/empresa/empleados/page.tsx`
- `app/(empresa)/empresa/empleados/[id]/page.tsx` (verificar existe)
- `app/(empresa)/empresa/empleados/[id]/editar/page.tsx` (crear si no existe)
- `app/api/empresa/empleados/[id]/route.ts`
- Componente de tabla de empleados

### Prioridad
🔴 **CRÍTICA** - RRHH necesita gestionar empleados

---

## 🔴 PROBLEMA 3: PEDIDOS - NO SE PUEDE VER DETALLE

### Síntoma
> "No puedo ver el detalle del pedido, creo que da error de algo por el tenant"

### Causa Probable
1. Query en `empresa-pedidos.ts` ya tiene el error de `Incident.description` que corregimos
2. Posible error adicional en `app/(empresa)/empresa/pedidos/[id]/page.tsx`
3. Verificación de tenant demasiado estricta (no permite ver pedido de otro empleado)

### Causa Real (según logs anteriores)
```
Unknown field `description` for select statement on model `Incident`
```

**✅ YA CORREGIDO** en el commit anterior.

### Verificar
- Que el redeploy funcione
- Que la página de detalle maneje bien los datos del pedido

### Prioridad
🟡 **ALTA** - Ya corregido, solo verificar

---

## 🟠 PROBLEMA 4: CATERING DA ERROR

### Síntoma
> "No funciona, da error"

### Causa CONOCIDA
```
Unknown field `restaurant` for include statement on model `CompanyCateringAssignment`
Unknown field `description` for select statement on model `Incident`
```

**✅ YA CORREGIDO** en `empresa-catering.ts` (commit anterior).

### Prioridad
🟡 **ALTA** - Ya corregido, solo verificar

---

## 🟡 PROBLEMA 5-8: REDIRECCIONES A DASHBOARD

### Síntoma
Todas estas secciones redirigen al dashboard cuando se hace click:
- **Facturación** → Dashboard
- **Incidencias** → Dashboard
- **Auditoría Fiscal** → Dashboard
- **Actividad** → Dashboard

### Causa Probable
Dos opciones:
1. **Links en el menú apuntan a rutas que NO EXISTEN** → Next.js redirige a `/empresa` por defecto
2. **Middleware o layout detectan ruta inexistente** y hacen redirect

### Verificar
¿Existen estas rutas?
- `app/(empresa)/empresa/facturacion/page.tsx`
- `app/(empresa)/empresa/incidencias/page.tsx`
- `app/(empresa)/empresa/auditoria/page.tsx`
- `app/(empresa)/empresa/actividad/page.tsx`

### Prioridad
🟢 **MEDIA** - Funcionalidades secundarias pero importantes

---

## 🔵 PROBLEMA 9: USUARIO RRHH NO PUEDE PEDIR COMIDA

### Síntoma
> "No veo como acceder a la sección de empleado, estoy registrado como rrhh pero esa persona también tendrá que pedir"

### Causa - ARQUITECTURA
El usuario `rrhh@acme.com` tiene rol `RRHH` pero **NO tiene registro en la tabla `Employee`**.

El portal empleado (`app/(empleado)`) requiere que el usuario sea un `Employee`, no solo tener rol `EMPLEADO`.

### Solución
Dos opciones:

**OPCIÓN A (Recomendada)**: **Dual-Role**
- Un usuario puede tener rol `RRHH` Y ser empleado
- El seed debe crear un `Employee` asociado a `rrhh@acme.com`
- El layout verifica: si es RRHH → portal empresa, si es Employee → puede también acceder a portal empleado
- Botón en navbar: "Ver como empleado" / "Ver como RRHH"

**OPCIÓN B**: **Usuario separado**
- RRHH usa `rrhh@acme.com` para gestión
- RRHH tiene OTRO usuario `juan.rrhh@acme.com` (con rol EMPLEADO) para pedir comida
- Menos conveniente pero más seguro (separación de roles)

### Archivos Involucrados
- `prisma/seed.ts` - Crear Employee para usuarios RRHH/Finanzas
- `app/(empresa)/layout.tsx` - Permitir acceso dual
- Navbar/Header - Botón para cambiar entre vistas

### Prioridad
🟢 **MEDIA** - UX importante pero no bloqueante

---

## 📊 TABLA DE PRIORIDADES

| # | Problema | Prioridad | Estado | Estimación |
|---|----------|-----------|--------|------------|
| 1 | Configuración no carga | 🔴 CRÍTICA | Pendiente | 30 min |
| 2A | Empleados - Ver detalle | 🔴 CRÍTICA | Pendiente | 15 min |
| 2B | Empleados - Editar 404 | 🔴 CRÍTICA | Pendiente | 20 min |
| 2C | Empleados - Suspender | 🔴 CRÍTICA | Pendiente | 15 min |
| 3 | Pedidos - Ver detalle | 🟡 ALTA | **✅ Corregido** | - |
| 4 | Catering - Error | 🟡 ALTA | **✅ Corregido** | - |
| 5 | Facturación - Redirect | 🟢 MEDIA | Pendiente | 10 min |
| 6 | Incidencias - Redirect | 🟢 MEDIA | Pendiente | 10 min |
| 7 | Auditoría - Redirect | 🟢 MEDIA | Pendiente | 10 min |
| 8 | Actividad - Redirect | 🟢 MEDIA | Pendiente | 10 min |
| 9 | RRHH como empleado | 🟢 MEDIA | Pendiente | 30 min |

**Total estimado**: ~2.5 horas

---

## 🎯 ESTRATEGIA DE CORRECCIÓN

### FASE 1: CORRECCIONES PRISMA (En progreso)
✅ Portal Empresa - Incident/Dish/CompanyCateringAssignment  
⏳ Portal Catering - Dish.ingredients, Order.tenantId, etc.

### FASE 2: VERIFICAR RUTAS EXISTENTES
🔍 Listar todas las rutas en `app/(empresa)/empresa/`  
🔍 Identificar rutas faltantes

### FASE 3: CORREGIR CONFIGURACIÓN (CRÍTICO)
🔴 Revisar queries de configuración  
🔴 Probar API routes  
🔴 Verificar componentes

### FASE 4: CORREGIR EMPLEADOS (CRÍTICO)
🔴 Crear ruta de detalle si no existe  
🔴 Crear ruta de edición  
🔴 Implementar acción "Suspender"

### FASE 5: CREAR RUTAS FALTANTES (MEDIA)
🟢 Crear páginas básicas para Facturación, Incidencias, etc.  
🟢 O documentar como "Próximamente"

### FASE 6: DUAL-ROLE PARA RRHH (MEDIA)
🟢 Modificar seed para crear Employee  
🟢 Permitir acceso dual en layout  
🟢 Agregar switcher en navbar

---

## 📝 NOTAS IMPORTANTES

1. **Priorizar funcionalidad sobre estética**: Primero que funcione, luego que se vea bien
2. **Testing incremental**: Redeploy después de cada fase crítica
3. **Documentar decisiones**: Si una ruta no existe, documentar por qué
4. **Comunicación con usuario**: Reportar progreso cada fase


