# Qué hace SinTupper

## Una frase

**SinTupper es un SaaS multi-tenant que digitaliza el beneficio de comida
corporativa en España**: conecta a las empresas que lo ofrecen, a los
caterings que lo sirven y a los empleados que lo consumen, garantizando
compliance fiscal IRPF.

## El problema que resuelve

El "ticket restaurante" tradicional (Sodexo, Edenred, etc.) se basa en un
**cheque o tarjeta** que el empleado usa en cualquier restaurante afiliado.
Tiene dos fricciones grandes:

1. **Para la empresa**: poca trazabilidad. El fiscal exige demostrar que el
   gasto se destina efectivamente a comida del empleado durante la jornada
   laboral (Art. 42.3 LIRPF). Con ticket restaurante, esa demostración es
   débil — el empleado podría usar el saldo para otra cosa.
2. **Para el empleado**: ruido operativo. Debe desplazarse, elegir sitio,
   pagar, guardar comprobante. Si la oficina está en un polígono sin
   restaurantes, el ticket pierde gran parte de su utilidad.

**SinTupper sustituye el ticket por un flujo end-to-end**:

- El empleado elige cada día (antes del cutoff, normalmente 11:00) qué
  menú quiere de los que su catering asignado ofrece.
- El catering consolida los pedidos, cocina, empaqueta por empleado y
  reparte en ruta a las sedes de la empresa.
- El empleado recibe su comida en la oficina. El catering factura a la
  empresa a fin de mes.
- El sistema guarda **evidencia auditable** de cada paso (selección,
  producción, entrega firmada, factura) para que la empresa pueda probar
  deductibilidad IRPF al 100%.

## Los 3 valores nucleares

### 1. Compliance fiscal IRPF

El Art. 42.3 de la Ley IRPF permite a las empresas deducir hasta **11€ por
día laborable y empleado** en concepto de comida en el puesto de trabajo.
SinTupper se diseñó desde el día 1 para generar la evidencia que Hacienda
pide si inspecciona:

- Selección nominativa (qué empleado pidió qué plato qué día).
- Prueba de entrega (hora, receptor, foto/firma si el reparto es
  presencial).
- Factura electrónica con desglose línea-por-línea (`InvoiceLine`:
  fecha + empleado + concepto + importe + flag `facturable`).
- Snapshot inmutable diario (`DailySnapshot`) con firma digital SHA-256
  — tamper-evident.
- Reporte fiscal mensual (`FiscalReport`) con ratio de deductibilidad,
  pedidos sobre límite, pedidos sin justificante, etc.

Si un pedido excede los 11€/día de un empleado, el sistema lo marca como
no-deductible; la empresa lo verá en el dashboard y podrá ajustar la
política para evitarlo.

### 2. Multi-tenant sin mezclas

Cada empresa y cada catering es un **tenant** con su propio subdominio
(`acme.sintupper.com`, `deliciasexpress.sintupper.com`). Los datos nunca
se mezclan:

- Toda query Prisma sobre tablas multi-tenant lleva filtro
  `tenantId`/`tenantEmpresa`/`tenantCatering`.
- Middleware dev avisa si una query multi-tenant olvida el filtro.
- Row-Level Security de Postgres preparado para activar cuando las queries
  críticas migren al wrapper `withTenantContext`.
- Usuarios Postgres separados por BD con GRANT estricto — aunque alguien
  confundiera el `DATABASE_URL`, Postgres corta el acceso.

### 3. Un solo actor opera múltiples roles

La misma plataforma sirve a 4 tipos de usuario con intereses distintos y
a veces contrapuestos:

- **Empresa** (RRHH, Finanzas): quiere bajar coste y tener compliance.
- **Catering** (Chef, Repartidor, Finanzas): quiere pedidos claros y
  pago puntual.
- **Empleado**: quiere elegir comida rico y que llegue.
- **Súper Admin SinTupper**: quiere que todos funcionen y cobrar comisión.

El producto da a cada uno **su portal** con vista y permisos propios, pero
sobre los **mismos datos subyacentes**. Un pedido creado por el empleado
lo ve RRHH como estadística, el chef como producción y el admin como
métrica agregada.

## Flujo completo (el "día típico")

```
08:00   Chef publica menús de la semana (1º + 2º + postre por día).
        SinTupper valida y manda notificación a empresas.

08:00   Empleado recibe notificación, entra al portal y elige sus comidas
        de la semana. Cada selección respeta alergias (bloqueo de
        alérgenos activable por la empresa), presupuesto diario
        (copay empresa + copay empleado ≤ límite política).

10:55   Sistema recuerda al empleado que el cutoff es a las 11:00.

11:00   CUTOFF. Pedidos quedan LOCKED. Cron job consolida producción:
        - Cuántos platos de cada tipo hay que preparar.
        - Cuántos paquetes individuales etiquetados por empleado.
        - Cuántas paradas por ruta y en qué orden.

11:05   Chef abre Kitchen Display en tablet → ve consolidado de 1º
        (ej: "45 × Gazpacho"). Cocina.
        Simultáneamente el equipo de packing abre Packing Display →
        ve paquete por empleado con su selección + alergenos + sede.

12:30   Repartidor abre la vista móvil de su ruta → Google Maps por cada
        parada. Marca cada entrega: hora, receptor, foto/firma si aplica.
        Empleado recibe su comida en la sede.

13:00   Empleado valora su menú (1-5 estrellas: sabor, porción,
        presentación, comentario opcional). Alimenta la métrica
        `averageRating` del catering.

23:59   Cron job:
        - Genera DailySnapshot firmado con SHA-256.
        - Calcula pedidos sobre límite IRPF (>11€).
        - Marca pedidos no entregados como NO_SHOW.

Día 1    Cron job de facturación:
del mes  - Catering emite factura mensual a empresa (una línea por pedido).
         - Empresa recibe factura + CSV para ERP.
         - SinTupper retiene comisión (config por catering, default 5%).
```

## Qué NO es SinTupper

Para evitar confusiones por si alguien lo compara con productos adyacentes:

- **No es un marketplace de restaurantes** (Glovo, UberEats). Aquí una
  empresa tiene UN catering asignado (con backup opcional), no elige
  distinto cada día.
- **No es un ticket restaurante** (Sodexo). Aquí el empleado no puede usar
  el saldo fuera del sistema. La comida se cocina expresamente para él.
- **No es un sistema de comanda para restaurantes al público**. El
  Kitchen Display aquí está pensado para producción en lote B2B con
  ventanas de cocina y corte fijo, no atención a mesa.
- **No es un ERP**. Exporta a ERPs (CSV/SII) pero no sustituye
  contabilidad ni nómina.

## Alcance funcional por portal (resumen)

| Portal | Para quién | Funciones principales | Estado |
|---|---|---|---|
| **Súper Admin** | SinTupper | Dashboard global, CRUD tenants/empresas/caterings/users, KPIs, auditoría cross-tenant | 🟡 90% |
| **Empresa** | RRHH, Finanzas, Manager de Sede | Empleados, pedidos, facturación, incidencias, catering asignado, auditoría fiscal, configuración | 🟡 85% |
| **Catering** | Chef, Cocinero, Repartidor, Finanzas | Platos, menús semanales, rutas, KDS, facturas mensuales, incidencias | 🟡 80% |
| **Empleado** | Empleado de empresa cliente | Selector semanal, historial, perfil, incidencias | 🟡 75% |

## Decisiones filosóficas de producto

1. **El empleado es dueño de su experiencia**. RRHH puede overridear
   (override audit-trailed) pero el empleado decide por defecto.
2. **Todo cambio deja huella**. `audit_logs` + `order_history` +
   `company_policy_history` con hash SHA-256 — no hay delete definitivo
   en datos sensibles, solo soft-delete.
3. **Compliance por diseño, no por aplauso de abogado**. Las restricciones
   fiscales (11€/día, nominativo, trazabilidad) están codificadas en el
   esquema, no en un checklist humano.
4. **La empresa y el catering son iguales**. Ningún tenant es "dueño" del
   otro; se comunican vía `CompanyCateringAssignment` como partners.
5. **Un solo origen de verdad**. `schema.prisma` define los datos, todo lo
   demás (queries, validaciones, tipos) se deriva.
