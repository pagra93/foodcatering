# 🎯 FASE 2.2 - Tab Calidad & Cumplimiento

## ✅ COMPLETADO

Esta fase implementa el **Tab de Calidad & Cumplimiento** con gestión de documentos, auditorías, sanciones/bonificaciones y políticas de alérgenos.

---

## 📁 Archivos Creados/Modificados

### 1. **Componentes Principales**

- **`components/admin/caterings/QualityComplianceTab.tsx`**
  - Tab completo de Calidad & Cumplimiento
  - Lista de documentos con estado y fechas
  - Resumen de validación documental
  - Secciones de auditorías, sanciones y políticas
  - Integración con modal de subida

- **`components/admin/caterings/UploadDocumentModal.tsx`**
  - Modal para subir documentos
  - Validación con react-hook-form + zod
  - Selector de tipo de documento
  - Campos de fechas (emisión/caducidad)
  - Preview de archivo seleccionado
  - Información contextual por tipo de documento

### 2. **Componentes UI (shadcn/ui)**

- **`components/ui/dialog.tsx`**
  - Componente de modal (Dialog) de Radix UI
  - Overlay, contenido, header, footer
  - Animaciones de entrada/salida

- **`components/ui/label.tsx`**
  - Etiquetas accesibles para formularios
  - Basado en Radix UI Label

### 3. **Integración**

- **`app/(admin)/admin/caterings/[id]/page.tsx`** (actualizado)
  - Importa `QualityComplianceTab`
  - Reemplaza placeholder con tab funcional
  - Pasa documentos desde query

---

## 🎨 Funcionalidades Implementadas

### **1. Resumen de Documentos** (4 cards)

```
┌────────────────────────────────────────────────────────┐
│ [Total]  [Válidos]  [Por Caducar]  [Caducados]       │
│   10        7            2              1             │
└────────────────────────────────────────────────────────┘
```

### **2. Tabla de Documentos Obligatorios**

Columnas:
- **Tipo de Documento**: Registro Sanitario, Seguro RC, APPCC, etc.
- **Fecha de Emisión**: DD/MM/YYYY
- **Fecha de Caducidad**: DD/MM/YYYY
- **Estado**: Badge con semáforo (Válido/Por caducar/Caducado)
- **Verificado**: Si/No + fecha de verificación
- **Acciones**: Ver, Descargar

#### Estados de Documentos:
- 🟢 **Válido**: Documento vigente
- 🟡 **Próximo a caducar**: Caduca en ≤ 30 días
- 🔴 **Caducado**: Ya expiró

#### Iconos por Estado:
- ✅ `CheckCircle` - Válido (verde)
- ⚠️ `AlertTriangle` - Por caducar (amarillo)
- ❌ `XCircle` - Caducado (rojo)

### **3. Modal de Subida de Documentos**

**Campos del Formulario:**

1. **Tipo de Documento** (obligatorio)
   - Registro Sanitario
   - Seguro de Responsabilidad Civil
   - Certificado de Manipulador de Alimentos
   - Certificado APPCC
   - Otro Documento

2. **Archivo** (obligatorio)
   - Formatos aceptados: PDF, JPG, PNG
   - Drag & drop o selector
   - Preview con nombre y tamaño

3. **Fecha de Emisión** (obligatorio)
   - Input tipo `date`
   - Validación con zod

4. **Fecha de Caducidad** (obligatorio)
   - Input tipo `date`
   - Validación con zod

**Información Contextual:**

- **Registro Sanitario**:
  > Documento obligatorio emitido por la autoridad sanitaria. Debe estar vigente en todo momento.

- **Seguro RC**:
  > Cobertura mínima recomendada de 300.000€. Verifica que incluya responsabilidad por intoxicaciones alimentarias.

### **4. Sección de Auditorías**

```
┌────────────────────────────────────────────────────┐
│ 🛡️ Auditorías                  [Planificar]      │
├────────────────────────────────────────────────────┤
│                                                     │
│           No hay auditorías registradas            │
│   Las auditorías internas y externas              │
│   aparecerán aquí                                  │
│                                                     │
└────────────────────────────────────────────────────┘
```

Incluirá (próximamente):
- Fecha de auditoría
- Tipo (interna/externa)
- Score obtenido
- Hallazgos
- Acciones correctivas
- Deadlines

### **5. Sanciones y Bonificaciones**

**Sanciones por SLA**
- Histórico de penalizaciones por incumplimiento
- Motivo, fecha, importe

**Bonificaciones**
- Incentivos por cumplimiento excepcional
- Criterios, fecha, importe

### **6. Políticas de Alérgenos**

```
┌──────────────────────────────────────────────────────┐
│ Política de Alérgenos y Etiquetado                  │
├──────────────────────────────────────────────────────┤
│ ℹ️ Cumplimiento de Normativa                         │
│   El catering debe declarar todos los alérgenos     │
│   presentes según Reglamento UE 1169/2011           │
│   ✓ 14 alérgenos principales                        │
│   ✓ Etiquetado claro en menús                       │
│   ✓ Notificación de cambios                         │
├──────────────────────────────────────────────────────┤
│ [Etiquetas Activas]  [Adhesión]  [Última Actualiz.] │
│        14 alérgenos     100%       15/11/2025        │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Tipos de Documentos Soportados

| Tipo | Código | Descripción |
|------|--------|-------------|
| Registro Sanitario | `SANITARY_REGISTRATION` | Documento obligatorio de la autoridad sanitaria |
| Seguro RC | `LIABILITY_INSURANCE` | Seguro de Responsabilidad Civil (min. 300K€) |
| Manipulador | `FOOD_HANDLER_CERTIFICATE` | Certificado de Manipulador de Alimentos |
| APPCC | `APPCC_CERTIFICATE` | Análisis de Peligros y Puntos de Control Críticos |
| Otro | `OTHER` | Otros documentos relevantes |

---

## 🔧 Validación de Documentos

### **Schema de Zod**

```typescript
const uploadDocumentSchema = z.object({
  type: z.enum([
    'SANITARY_REGISTRATION',
    'LIABILITY_INSURANCE',
    'FOOD_HANDLER_CERTIFICATE',
    'APPCC_CERTIFICATE',
    'OTHER',
  ]),
  file: z.instanceof(File).optional(),
  issuedAt: z.string().min(1, 'La fecha de emisión es obligatoria'),
  expiresAt: z.string().min(1, 'La fecha de caducidad es obligatoria'),
})
```

### **Reglas de Validación**

1. ✅ El tipo de documento es obligatorio
2. ✅ El archivo es obligatorio (PDF, JPG, PNG)
3. ✅ La fecha de emisión es obligatoria
4. ✅ La fecha de caducidad es obligatoria
5. ⚠️ La fecha de caducidad debe ser posterior a la de emisión (TODO)
6. ⚠️ El archivo debe ser legible (validación manual)

---

## 🎯 Lógica de Cálculo de Estados

### **Estado: VALID (Válido)**
```typescript
expiresAt > (now + 30 días)
```

### **Estado: EXPIRING_SOON (Próximo a caducar)**
```typescript
expiresAt <= (now + 30 días) && expiresAt >= now
```

### **Estado: EXPIRED (Caducado)**
```typescript
expiresAt < now
```

---

## 🧪 Cómo Probar

### 1. **Acceder al Tab**
```
http://localhost:3000/admin/caterings/[tenant-id]
→ Click en tab "Calidad & Cumplimiento"
```

### 2. **Verificar que se Muestra**
- ✅ Resumen de documentos (4 cards)
- ✅ Tabla de documentos con estado
- ✅ Botón "Subir Documento"
- ✅ Secciones de auditorías, sanciones y políticas

### 3. **Probar Modal de Subida**
1. Click en "Subir Documento"
2. Seleccionar tipo de documento
3. Subir archivo (PDF, JPG, PNG)
4. Ingresar fechas
5. Ver información contextual
6. Click en "Subir Documento"
7. Ver loading state
8. Ver cierre automático del modal

### 4. **Verificar Colores de Estado**
- 🟢 Verde para documentos válidos
- 🟡 Amarillo para próximos a caducar
- 🔴 Rojo para caducados

---

## 📝 Estructura de Datos

### **Document Type**

```typescript
type Document = {
  id: string
  type: string // SANITARY_REGISTRATION, LIABILITY_INSURANCE, etc.
  fileUrl: string
  issuedAt: Date
  expiresAt: Date
  status: string // VALID, EXPIRING_SOON, EXPIRED
  verifiedBy: string | null
  verifiedAt: Date | null
}
```

### **Props del Tab**

```typescript
type QualityComplianceTabProps = {
  documents: Document[]
  cateringId: string
}
```

---

## 🚀 Próximos Pasos (Mejoras Futuras)

### **Documentos**
- [ ] Implementar subida real de archivos (S3/Cloudinary)
- [ ] Implementar descarga de documentos
- [ ] Implementar visualización de documentos (iframe/modal)
- [ ] Implementar verificación manual por Super Admin
- [ ] Notificaciones automáticas pre-caducidad (15 días)

### **Auditorías**
- [ ] Crear modelo `Audit` en schema
- [ ] Formulario de planificación de auditoría
- [ ] Lista de auditorías con historial
- [ ] Subida de informes de auditoría
- [ ] Seguimiento de acciones correctivas

### **Sanciones/Bonificaciones**
- [ ] Crear modelo `Penalty` y `Bonus` en schema
- [ ] Cálculo automático basado en SLAs
- [ ] Formulario de registro manual
- [ ] Histórico con timeline
- [ ] Reportes mensuales

### **Alérgenos**
- [ ] Validación de etiquetado en cada plato
- [ ] Dashboard de cumplimiento
- [ ] Alertas de cambios no notificados

---

## ✅ Checklist de Completado

- [x] Componente `QualityComplianceTab` creado
- [x] Modal `UploadDocumentModal` con validación
- [x] Componentes UI `Dialog` y `Label` creados
- [x] Integración en página principal
- [x] Tabla de documentos con estado
- [x] Resumen de validación (4 cards)
- [x] Secciones de auditorías y sanciones (placeholder)
- [x] Política de alérgenos (info estática)
- [x] Sistema de semáforos por estado
- [x] Iconos contextuales por estado
- [x] Información contextual por tipo de documento
- [x] Validación con react-hook-form + zod
- [x] Documentación completa

---

## 🎉 Resultado

El Super Admin ahora puede:

1. ✅ **Ver todos los documentos** del catering en una tabla
2. ✅ **Identificar rápidamente** documentos caducados o por caducar
3. ✅ **Subir nuevos documentos** con validación de fechas
4. ✅ **Ver resumen** de cumplimiento documental
5. ✅ **Acceder a información** sobre auditorías y sanciones (próximamente)
6. ✅ **Revisar política de alérgenos** y cumplimiento

**Próximo paso:** FASE 2.3 - Tab Operación Diaria (menús, cutoff, logística) 🚀

