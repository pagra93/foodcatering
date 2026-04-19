# 🎯 FASE 2.5 - Tab Facturación & Pagos

## ✅ COMPLETADO

Esta fase implementa el **Tab de Facturación & Pagos** con gestión de facturas emitidas a empresas, liquidaciones al catering, histórico de comisiones y opciones de descarga.

---

## 📁 Archivos Creados/Modificados

### 1. **Componente Principal**

- **`components/admin/caterings/BillingPaymentsTab.tsx`**
  - Tab completo de Facturación & Pagos
  - KPIs financieros (facturado, cobrado, pendiente, vencido)
  - Tabla de facturas emitidas a empresas
  - Tabla de liquidaciones al catering
  - Histórico de comisiones
  - Opciones de descarga (PDF, CSV)
  - Filtros por estado
  - Datos mock para demostración

### 2. **Integración**

- **`app/(admin)/admin/caterings/[id]/page.tsx`** (actualizado)
  - Importa `BillingPaymentsTab`
  - Reemplaza placeholder con tab funcional
  - Pasa datos del restaurant desde query

---

## 🎨 Funcionalidades Implementadas

### **1. KPIs Financieros** (4 cards)

```
┌──────────────────────────────────────────────────────┐
│ [Total Facturado]  [Cobrado]  [Pendiente]  [Vencido]│
│    2.436,24€       890,62€     605,62€      1.140€   │
└──────────────────────────────────────────────────────┘
```

**Cards:**
- **Total Facturado**: Suma de todas las facturas del período
- **Cobrado** (verde): Facturas ya pagadas
- **Pendiente** (amarillo): Facturas pendientes de pago
- **Vencido** (rojo): Facturas con pago atrasado

### **2. Comisión Vigente** (Card destacado)

```
┌──────────────────────────────────────────────────────┐
│ 📊 Comisión Vigente: 5.00%                           │
│ Ciclo de pago: MENSUAL                               │
│ Facturación Mínima: 1.000,00€ mensual garantizada   │
└──────────────────────────────────────────────────────┘
```

**Información:**
- Porcentaje de comisión actual
- Ciclo de pago (SEMANAL, QUINCENAL, MENSUAL)
- Facturación mínima garantizada
- Diseño destacado con gradiente azul-púrpura

### **3. Tabla de Facturas Emitidas a Empresas**

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Nº Factura  │ Empresa      │ Periodo  │ Pedidos │ Subtotal │ Comisión │... │
├────────────────────────────────────────────────────────────────────────────┤
│ INV-2024-001│ Tech Solut   │ Nov 2024 │ 125     │ 937.50€  │ -46.88€  │   │
│             │              │          │         │          │          │Pagada│
├────────────────────────────────────────────────────────────────────────────┤
│ INV-2024-002│ StartupXYZ   │ Nov 2024 │ 85      │ 637.50€  │ -31.88€  │   │
│             │              │          │         │          │          │Pend. │
├────────────────────────────────────────────────────────────────────────────┤
│ INV-2024-003│ Consulting   │ Nov 2024 │ 160     │ 1200.00€ │ -60.00€  │   │
│             │              │          │         │          │          │Venc. │
└────────────────────────────────────────────────────────────────────────────┘
```

**Columnas:**

1. **Nº Factura**: Código único (INV-YYYY-NNN)
2. **Empresa**: Nombre de la empresa cliente
3. **Periodo**: Mes/año de facturación
4. **Pedidos**: Total de pedidos en el período
5. **Subtotal**: Importe bruto antes de comisión
6. **Comisión**: Comisión aplicada (en rojo, negativo)
7. **Total**: Importe neto tras comisión
8. **Estado**: Badge con estado (Pagada/Pendiente/Vencida)
9. **Acciones**: Ver, Descargar

**Estados de Factura:**
- 🟢 **Pagada** (PAID): Cobrada correctamente
- 🟡 **Pendiente** (PENDING): Esperando pago
- 🔴 **Vencida** (OVERDUE): Pago atrasado

**Filtros:**
- Selector de estado (Todos/Pagadas/Pendientes/Vencidas)

**Resumen de Facturas** (pie de tabla):
```
┌──────────────────────────────────────────────────────┐
│ Total Facturas: 3                                    │
│ Total Pedidos: 370                                   │
│ Comisión Total: 138.76€                              │
│ Total Neto: 2.636,24€                                │
└──────────────────────────────────────────────────────┘
```

### **4. Tabla de Liquidaciones al Catering**

```
┌────────────────────────────────────────────────────────────────────────┐
│ Nº Liquidación│ Periodo  │ Pedidos │ Bruto    │ Comisión │ Neto      │
├────────────────────────────────────────────────────────────────────────┤
│ SET-2024-10   │ Oct 2024 │ 450     │ 3.375€   │ -168.75€ │ 3.206,25€ │
│               │          │         │          │          │ Pagada     │
├────────────────────────────────────────────────────────────────────────┤
│ SET-2024-11   │ Nov 2024 │ 370     │ 2.775€   │ -138.75€ │ 2.636,25€ │
│               │          │         │          │          │ Pendiente  │
└────────────────────────────────────────────────────────────────────────┘
```

**Columnas:**

1. **Nº Liquidación**: Código único (SET-YYYY-MM)
2. **Periodo**: Mes de la liquidación
3. **Pedidos**: Total de pedidos servidos
4. **Importe Bruto**: Total facturado a empresas
5. **Comisión**: Comisión descontada (rojo)
6. **Importe Neto**: A pagar al catering (verde, destacado)
7. **Estado**: Pagada/Pendiente
8. **Acciones**: Descargar

**Características:**
- Importe neto destacado en verde y negrita
- Estado con fecha de pago si está pagada
- Botón de descarga por liquidación

### **5. Histórico de Comisiones**

```
┌──────────────────────────────────────────────────────┐
│ 📊 Histórico de Comisiones                           │
├──────────────────────────────────────────────────────┤
│ 📉 5.00% (Vigente)                                   │
│    Ajuste por volumen                                │
│    01/07/2024 → Actualidad                           │
│                                                       │
│ 📈 8.00%                                             │
│    Lanzamiento inicial                               │
│    01/01/2024 → 30/06/2024                           │
└──────────────────────────────────────────────────────┘
```

**Características:**
- Timeline de cambios de comisión
- Icono indicativo (📉 bajada, 📈 subida)
- Badge "Vigente" en la comisión actual (verde)
- Razón del cambio
- Período de vigencia

**Orden:**
- Comisión actual primero (destacada)
- Histórico en orden cronológico inverso

### **6. Opciones de Descarga y Exportación**

```
┌──────────────────────────────────────────────────────┐
│ 📥 Descargas y Exportaciones                         │
├──────────────────────────────────────────────────────┤
│ [Facturas en PDF]         [Líneas en CSV]           │
│ 📄 Descarga facturas      📊 Exporta detalle        │
│ individuales o lote       por empresa/empleado/día  │
│ [Descargar PDFs]          [Exportar CSV]            │
└──────────────────────────────────────────────────────┘
```

**2 Cards de Descarga:**

1. **Facturas en PDF** (rojo)
   - Icono: Receipt
   - Descarga PDFs individuales o en lote
   - Para archivo y contabilidad

2. **Líneas en CSV** (verde)
   - Icono: FileSpreadsheet
   - Exportación del detalle completo
   - Por empresa, empleado y día
   - Para análisis y reconciliación

---

## 📊 Datos Mock Implementados

### **Facturas**
```typescript
const getMockInvoices = () => [
  {
    id: 'INV-2024-001',
    company: 'Tech Solutions',
    period: 'Noviembre 2024',
    totalOrders: 125,
    subtotal: 937.5,
    commission: 46.88,
    total: 890.62,
    status: 'PAID',
    paidAt: new Date('2024-11-05'),
  },
  // ... más facturas
]
```

### **Liquidaciones**
```typescript
const getMockSettlements = () => [
  {
    id: 'SET-2024-10',
    period: 'Octubre 2024',
    totalOrders: 450,
    grossAmount: 3375.0,
    commission: 168.75,
    netAmount: 3206.25,
    status: 'PAID',
    paidAt: new Date('2024-11-05'),
  },
  // ... más liquidaciones
]
```

### **Histórico de Comisiones**
```typescript
const getMockCommissionHistory = () => [
  {
    effectiveFrom: new Date('2024-07-01'),
    effectiveTo: null,
    rate: 0.05,
    reason: 'Ajuste por volumen',
  },
  {
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: new Date('2024-06-30'),
    rate: 0.08,
    reason: 'Lanzamiento inicial',
  },
]
```

---

## 🔧 Props del Componente

```typescript
type BillingPaymentsTabProps = {
  restaurant: {
    commission: number         // 0.05 = 5%
    minimumBilling: number     // En euros
    paymentCycle: string       // SEMANAL, QUINCENAL, MENSUAL
  }
  cateringId: string
}
```

---

## 🎯 Lógica de Negocio

### **1. Cálculo de KPIs**

```typescript
// Total facturado
const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0)

// Total cobrado (solo facturas PAID)
const totalPaid = invoices
  .filter(inv => inv.status === 'PAID')
  .reduce((sum, inv) => sum + inv.total, 0)

// Total pendiente
const totalPending = invoices
  .filter(inv => inv.status === 'PENDING')
  .reduce((sum, inv) => sum + inv.total, 0)

// Total vencido
const totalOverdue = invoices
  .filter(inv => inv.status === 'OVERDUE')
  .reduce((sum, inv) => sum + inv.total, 0)
```

### **2. Cálculo de Factura**

```
Subtotal = Σ (precio_plato × cantidad)
Comisión = Subtotal × tasa_comisión (ej: 5%)
Total = Subtotal - Comisión
```

**Ejemplo:**
- Subtotal: 937.50€
- Comisión (5%): -46.88€
- **Total a pagar al catering: 890.62€**

### **3. Estados de Factura**

- **PAID**: `paidAt` tiene fecha
- **PENDING**: Sin pagar, dentro de plazo
- **OVERDUE**: Sin pagar, fuera de plazo (> N días)

---

## 🧪 Cómo Probar

### 1. **Acceder al Tab**
```
http://localhost:3000/admin/caterings/[tenant-id]
→ Click en tab "Facturación"
```

### 2. **Verificar que se Muestra**
- ✅ 4 cards de KPIs financieros
- ✅ Card de comisión vigente (destacado)
- ✅ Tabla de facturas con filtro
- ✅ Resumen de facturas (pie)
- ✅ Tabla de liquidaciones
- ✅ Histórico de comisiones
- ✅ 2 cards de descarga

### 3. **Interacciones**
1. **Filtrar facturas**: Por estado (Pagadas/Pendientes/Vencidas)
2. **Ver badges de estado**: Colores semánticos
3. **Observar KPIs**: Totales calculados
4. **Ver histórico**: Timeline de comisiones

### 4. **Verificar Datos Mock**
Se muestran 3 facturas y 2 liquidaciones de ejemplo.

---

## 📝 Próximos Pasos (Integración Real)

### **Facturas**
- [ ] Conectar con tabla `invoices` real
- [ ] Generar facturas automáticamente (fin de mes)
- [ ] PDF de factura con plantilla
- [ ] Envío automático por email
- [ ] Recordatorios de pago
- [ ] Gestión de impuestos (IVA 10%)
- [ ] Retenciones si aplican

### **Liquidaciones**
- [ ] Generar liquidaciones al catering
- [ ] Cálculo automático tras cierre mes
- [ ] Integración con pasarela de pago
- [ ] Transferencias bancarias
- [ ] Notificaciones de pago
- [ ] Extractos bancarios

### **Comisiones**
- [ ] Edición de comisión vigente
- [ ] Programación de cambios futuros
- [ ] Overrides por empresa
- [ ] Exenciones por piloto/promoción
- [ ] Alertas de cambios próximos

### **Exportaciones**
- [ ] Generación real de PDFs
- [ ] Exportación CSV con detalle completo
- [ ] Filtros por fecha
- [ ] Descarga masiva (ZIP)
- [ ] Plantillas personalizables
- [ ] Integración con ERP (A3, Sage, SAP)

### **Análisis**
- [ ] Dashboard de tendencias
- [ ] Comparativa mes a mes
- [ ] Gráficos de facturación
- [ ] Predicción de ingresos
- [ ] DSO (Days Sales Outstanding)
- [ ] Aging de cuentas por cobrar

---

## ✅ Checklist de Completado

- [x] Componente `BillingPaymentsTab` creado
- [x] 4 KPIs financieros (facturado, cobrado, pendiente, vencido)
- [x] Card de comisión vigente destacado
- [x] Tabla de facturas emitidas
- [x] Filtro por estado de factura
- [x] Badges de estado con colores
- [x] Resumen de facturas (pie de tabla)
- [x] Tabla de liquidaciones al catering
- [x] Histórico de comisiones con timeline
- [x] 2 cards de opciones de descarga
- [x] Datos mock para demostración
- [x] Integración en página principal
- [x] Estado vacío (sin facturas)
- [x] Responsive design
- [x] Documentación completa

---

## 🎉 Resultado

El Super Admin ahora puede:

1. ✅ **Ver KPIs financieros** (facturado, cobrado, pendiente, vencido)
2. ✅ **Consultar comisión vigente** y condiciones económicas
3. ✅ **Listar facturas emitidas** a empresas con detalle
4. ✅ **Filtrar por estado** (pagadas, pendientes, vencidas)
5. ✅ **Ver liquidaciones al catering** con importes netos
6. ✅ **Revisar histórico de comisiones** y cambios
7. ✅ **Identificar facturas vencidas** rápidamente
8. ✅ **Preparar exportaciones** (PDF, CSV)
9. ✅ **Evaluar salud financiera** del catering

---

## 📦 Componentes Utilizados

- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Contenedores
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - Tablas
- `Badge` - Estados
- `Button` - Acciones
- `Select` - Filtros
- Iconos de `lucide-react`: Euro, FileText, CreditCard, Percent, Download, Receipt, etc.
- `date-fns` - Formateo de fechas

---

## 🚀 Próxima Fase

**FASE 2.6** - Tab Incidencias 🚨

¡5 fases completadas de 7 tabs! 🎯 (71% del sistema de tabs)

