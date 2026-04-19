# 📋 SPRINT 3-4: PÁGINAS FALTANTES Y HANDLERS

## 🔴 PÁGINAS QUE NO EXISTEN (causan 404)

### 1. Empleados - Detalle
**Ruta**: `/empresa/empleados/[id]/page.tsx`
**Estado**: ❌ NO EXISTE
**Impacto**: Botón "Ver detalle" no funciona
**Prioridad**: ALTA

### 2. Empleados - Editar  
**Ruta**: `/empresa/empleados/[id]/editar/page.tsx`
**Estado**: ✅ YA EXISTE (creada anteriormente)
**Impacto**: Botón "Editar" debería funcionar
**Prioridad**: VERIFICAR

### 3. Empleados - Nuevo
**Ruta**: `/empresa/empleados/nuevo/page.tsx`
**Estado**: ❌ NO EXISTE
**Impacto**: Botón "Nuevo Empleado" no funciona
**Prioridad**: ALTA

### 4. Incidencias - Nueva
**Ruta**: `/empresa/incidencias/nueva/page.tsx`
**Estado**: ❌ NO EXISTE
**Impacto**: Botón "Nueva Incidencia" no funciona
**Prioridad**: MEDIA

---

## 🔴 BOTONES SIN HANDLERS

### 1. EmployeesTable - Suspender/Activar
**Archivo**: `components/empresa/empleados/EmployeesTable.tsx`
**Líneas**: 217-227
**Handler necesario**: Llamar a API PATCH `/api/empresa/empleados/[id]`

### 2. EmployeesTable - Eliminar
**Archivo**: `components/empresa/empleados/EmployeesTable.tsx`
**Línea**: 228-230
**Handler necesario**: Llamar a API DELETE `/api/empresa/empleados/[id]`

### 3. EmployeesTable - Reenviar invitación
**Archivo**: `components/empresa/empleados/EmployeesTable.tsx`
**Líneas**: 212-215
**Handler necesario**: Llamar a API POST `/api/empresa/empleados/[id]/resend-invitation`

---

## 🎯 PLAN DE EJECUCIÓN

### Fase 1: Verificar páginas existentes (1 min)
- [x] Verificar si empleados/[id]/editar existe
- [ ] Verificar API routes existentes

### Fase 2: Crear páginas faltantes (20 min)
- [ ] empleados/[id]/page.tsx (detalle)
- [ ] empleados/nuevo/page.tsx (formulario)
- [ ] incidencias/nueva/page.tsx (formulario)

### Fase 3: Añadir handlers (15 min)
- [ ] Handler suspender/activar empleado
- [ ] Handler eliminar empleado  
- [ ] Handler reenviar invitación
- [ ] Verificar API routes necesarias

### Fase 4: Testing (10 min)
- [ ] Probar cada botón
- [ ] Verificar redirecciones
- [ ] Verificar toasts/mensajes

---

## 📝 NOTAS

- Las páginas deben ser Server Components cuando sea posible
- Los formularios necesitan ser Client Components
- Usar `asChild` para botones con Link
- Verificar que las API routes existan antes de llamarlas

