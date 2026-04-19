# Modelo de negocio y compliance fiscal

## Cómo gana dinero SinTupper

SinTupper cobra **una comisión por transacción** al catering, no a la
empresa ni al empleado. Esto alinea incentivos: SinTupper gana si el
catering factura, y el catering factura si hay pedidos, y hay pedidos si
los empleados encuentran útil el beneficio.

- Configurable por catering (`Restaurant.commission`, tipo `Decimal(5,4)`).
- Default: 5% (valor 0.0500). Negociable por cliente grande.
- Mínimo facturable (`Restaurant.minimumBilling`) para caterings pequeños.
- Ciclo de pago (`Restaurant.paymentCycle`): `SEMANAL`, `QUINCENAL` o
  `MENSUAL`.

La empresa **no paga a SinTupper directamente** — paga al catering la
factura completa, y el catering retiene y transfiere la comisión a
SinTupper. Esto simplifica la operativa fiscal de la empresa cliente (un
solo proveedor en su contabilidad).

## Compliance fiscal IRPF (Art. 42.3 LIRPF)

Esta es la pieza central del producto. El artículo permite:

> **"Las fórmulas indirectas de prestación del servicio de comedor, hasta
> 11€ diarios, siempre que tengan lugar durante días hábiles para el
> trabajador y no en los que el trabajador devengue dietas por manutención
> exceptuadas de gravamen."**

Traducido: la empresa puede deducirse hasta **11€/día/empleado** si y solo
si demuestra que:

1. El beneficio es **nominativo** (no anónimo tipo ticket al portador).
2. Se consume en **días hábiles** (no sábados, domingos, festivos, dietas).
3. Se consume **en el marco de la jornada laboral**.
4. Hay **justificante** individual por entrega.

### Qué genera SinTupper para demostrar cada punto

| Requisito | Evidencia en el sistema |
|---|---|
| Nominativo | `Order.employeeId` + `Employee.userId` → nombre cifrado (`User.nameEnc`). Trazabilidad empleado-fecha-pedido. |
| Días hábiles | `CompanyPolicy.daysActive` (JSON: lunes a jueves típico). Cron job excluye festivos nacionales y regionales. `FiscalReport.daysWithService` cuenta solo días efectivamente servidos. |
| Jornada laboral | `Restaurant.deliveryWindow` define ventana de entrega; `DeliveryProof.deliveredAt` guarda timestamp real. |
| Justificante | `DeliveryProof` con `proofType` (PHOTO / SIGNATURE / NONE), `proofUrl` (foto/firma), `recipientName`, `latitude`/`longitude` si configurado, `verificationHash`. |

### El reporte fiscal mensual (`FiscalReport`)

Al cierre de cada mes, un cron job genera por empresa:

```
FiscalReport {
  periodYear: 2026
  periodMonth: 4
  totalOrders: 420        // pedidos confirmados del mes
  totalAmount: 4.680,00€  // suma de Order.price
  deductibleAmount: 4.400,00€   // los ≤11€/día
  nonDeductibleAmount: 280,00€  // los que excedieron
  deductibilityRate: 94.02%
  employeesServed: 23
  daysWithService: 20
  ordersAboveLimit: 28    // pedidos de un empleado que
                          // acumuló >11€ ese día
  ordersWithoutProof: 0   // sin DeliveryProof
  ordersWithIssues: 5     // con Incident abierta
  fileUrl: "..."          // PDF generado
  signatureHash: "sha256:..."  // firma tamper-evident
}
```

Este reporte es **lo que se le enseña a Hacienda** si inspecciona. Si
alguien modifica datos posteriormente, la verificación del
`signatureHash` lo detecta.

### El snapshot diario (`DailySnapshot`)

Además del reporte mensual, cada noche a las 23:59 se congela un
snapshot **por cada par empresa-catering** con el detalle de los pedidos
servidos ese día:

```
DailySnapshot {
  tenantEmpresa, tenantCatering, serviceDate
  ordersSummary: [
    { employeeId, serviceDate, dishIds, price, delivered, proofUrl },
    ...
  ]
  signHash: "sha256:..."
  fileUrl: "..."
}
```

Este es el documento **inmutable** que sustituye al ticket de papel. Si
la empresa cambia un pedido en `Order.status` después, el snapshot del
día ya está firmado con los valores anteriores — no se puede reescribir
la historia.

### Por qué el cutoff existe

El cutoff (hora límite para modificar pedidos, típicamente 11:00) no es
solo logística — es fiscal:

- Antes del cutoff: `Order.status = CONFIRMED` pero editable.
- Después del cutoff: `status = LOCKED_AFTER_CUTOFF`, `lockedAt = now()`.
  Cualquier cambio después genera `OrderHistory` con
  `changeReason = RRHH_OVERRIDE` (nunca `USER_EDIT`).
- Esto garantiza que el empleado no cambia el pedido después de
  recibirlo — lo cual invalidaría la deductibilidad.

## Precios en el sistema

SinTupper usa **Decimal(8,2)** o **Decimal(10,2)** para todo importe, nunca
Float. Razón: la suma de 30 pedidos × 11.00€ × 365 días debe dar exacto; un
float de precisión simple acumula error.

### Cadena de pricing

```
Dish.basePrice                      // 11.50€ el catering marca su precio
  +
DishSchedule.priceOverride?         // 9.90€ oferta del jueves
  =
Order.price                         // el precio que se fija al pedir
  →
InvoiceLine.amount                  // lo que se factura
  ×
InvoiceLine.facturableFlag          // FULL / HALF / NONE (caso no-show)
  =
Invoice.subtotal + taxAmount        // IVA 10% por defecto en comida
  =
Invoice.total                       // lo que paga la empresa
```

## Estructura multi-parte de una operación típica

Supongamos una empresa con 100 empleados, copay 80/20 (empresa/empleado),
límite 11€/día. Un empleado pide un menú de 12€.

| Concepto | Importe |
|---|---|
| Precio del menú | 12,00 € |
| Copay empresa (80%) | 9,60 € |
| Copay empleado (20%) | 2,40 € |
| ¿Deducible? | **9,60 ≤ 11 → sí.** |

Si el precio fuera 14€:

| Concepto | Importe |
|---|---|
| Precio del menú | 14,00 € |
| Copay empresa (80%) | 11,20 € |
| Copay empleado (20%) | 2,80 € |
| ¿Deducible? | **11,20 > 11 → se marca `ordersAboveLimit`.** La empresa podrá deducir 11, no 11,20. |

La UI en el portal empresa ya avisa antes de cambiar la política si con la
nueva configuración algún pedido histórico se volvería no-deductible.

## CompanyCateringAssignment: el "contrato"

Empresa y catering no se asignan por capricho — queda registrado en
`CompanyCateringAssignment` con:

- `type`: `PRIMARY` o `BACKUP` (se puede tener un catering de respaldo).
- `zones`: si el catering solo cubre ciertos códigos postales.
- `priority`: en caso de múltiples caterings, el de mayor prioridad
  atiende primero.
- `slaPunctuality`, `slaIncidentRate`: SLA acordado. Si se incumple, el
  sistema emite alertas al súper admin y a la empresa.
- `assignedAt`, `assignedBy` + `deactivatedAt`, `deactivatedBy`,
  `deactivationReason`: auditoría completa del vínculo comercial.

Cuando se desactiva una asignación, no se borra — queda histórica. Así se
puede reconstruir quién sirvió a quién en cada momento (otra pieza fiscal:
si un pedido viejo se audita, hay que saber qué catering lo hizo).

## Por qué no es un marketplace

Una decisión deliberada: **una empresa tiene un catering** (primario, más
opcionalmente uno backup). No se elige cada día.

Razones:

1. **Compliance**: la factura debe venir del mismo proveedor consistente
   para que el empleado acumule su límite de 11€/día trazable.
2. **Logística**: rutas de reparto se optimizan con clientes fijos; un
   catering que sirve a 20 empresas recurrentes sabe sus rutas por el
   código postal y no reoptimiza cada día.
3. **Calidad**: el catering ajusta producción a las preferencias
   agregadas de sus empresas. Un marketplace descoordinado → calidad
   variable.
4. **Incentivos**: al catering le conviene invertir en la relación
   (mejores platos, ajuste a alérgenos comunes de una empresa); si
   fuera marketplace, cada pedido sería transaccional.

Si una empresa grande necesita varios caterings (ej: oficinas en Madrid +
Barcelona), se configura un assignment por cada pareja empresa-catering
con sus zonas postales asignadas.
