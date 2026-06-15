# Modelo de datos

35 modelos, 28 enums. La fuente de verdad es `prisma/schema.prisma`. Este
documento te da el mapa mental por dominio y las relaciones clave.

## Mapa por dominios

```
┌─ TENANCY ─────────┐    ┌─ EMPRESA ─────────────────┐    ┌─ CATERING ──────────┐
│ Tenant            │───◄│ Company ──► CompanySite   │    │ Restaurant          │
│  └─ User          │    │ └─ CompanyPolicy          │    │ └─ RestaurantDocument│
└───────────────────┘    │    └─ CompanyPolicyHistory│    │ └─ RestaurantAudit  │
                         │ └─ CompanySettings        │    │ └─ Dish             │
                         │ └─ Employee ◄─ User       │    │    └─ DishSchedule  │
                         │ └─ EmployeeInvitation     │    └─────────────────────┘
                         └───────────────────────────┘           │
                                  │                              │
                                  └──► CompanyCateringAssignment ◄┘
                                              │
                                  ┌───────────┴──────────────┐
                                  ▼                          ▼
                        ┌─ OPERACIÓN ──────────────────────────┐
                        │ Order ──────┬─► OrderHistory         │
                        │             ├─► OrderRating          │
                        │             ├─► DeliveryEvent        │
                        │             ├─► DeliveryProof        │
                        │             ├─► Incident             │
                        │             └─► routeId → DeliveryRoute│
                        │                    └─ DeliveryRouteSite
                        │                    └─ DeliveryRouteEvent
                        │ KitchenSheet (consolidación producción)
                        │ PackingSheet (consolidación empaquetado)
                        └──────────────────────────────────────┘
                                  │
                                  ▼
                        ┌─ FACTURACIÓN Y FISCAL ──────────────────┐
                        │ Invoice ──► InvoiceLine                 │
                        │ DailySnapshot (firmado SHA-256)         │
                        │ FiscalReport (mensual)                  │
                        │ CompanyExport (CSV ERP)                 │
                        └─────────────────────────────────────────┘
                                  │
                                  ▼
                        ┌─ INFRA TRANSVERSAL ─────────────────────┐
                        │ AuditLog (todo cambio)                  │
                        │ Notification (user / broadcast)         │
                        │ Integration (ERP, SSO, pagos)           │
                        │ Webhook → WebhookDelivery               │
                        └─────────────────────────────────────────┘
```

---

## Dominio 1 — Tenancy

### `Tenant`

La raíz. Representa una organización (Plati, una empresa o un
catering).

| Campo | Notas |
|---|---|
| `id` | UUID, @id |
| `type` | ROOT / EMPRESA / CATERING |
| `name` | Razón social o nombre comercial |
| `subdomain` | Único. `acme` en `acme.plati.es`. |
| `status` | ACTIVE / SUSPENDED / INACTIVE |
| `primaryColor`, `logoUrl` | Branding del portal |
| `contactEmail`, `contactPhone`, `address`, `city`, `postalCode`, `country` | Contacto y dirección |
| `timezone` | `Europe/Madrid` por defecto |
| `currency`, `language` | EUR, es por defecto |
| `config` | JSON de flags extensibles |

**Relaciones**: `users[]`, `companies[]`, `restaurants[]`.

### `User`

Usuario que se loguea. Un usuario pertenece a **un solo tenant**.

| Campo | Notas |
|---|---|
| `id`, `tenantId` | |
| `email` | Único por tenant, no global |
| `passwordHash` | bcrypt |
| `nameEnc`, `phoneEnc` | PII cifrada AES-256-GCM |
| `role` | UserRole (14 posibles) |
| `mfaEnabled` | Aún no implementado end-to-end |
| `status` | ACTIVE / DISABLED / PENDING |
| `deletedAt` | Soft delete |

**Relaciones**: `tenant`, `employees[]` (si el user también es empleado),
`deliveryRoutes[]` (si es repartidor).

**Observación**: `nameEnc`/`phoneEnc` están cifrados en BD pero la clave
(`PII_ENCRYPTION_KEY`) todavía no se aplica en producción — los datos se
guardan "sin cifrar" con los helpers que detectarán si está cifrado o no
(`looksEncrypted()`). La migración a datos cifrados real es un script
aparte (`scripts/migrate-pii-encryption.ts`) que se correrá cuando haya
datos reales.

---

## Dominio 2 — Empresa

### `Company`

1:1 con un `Tenant` de tipo EMPRESA. El detalle de negocio vive aquí.

| Campo destacado | Notas |
|---|---|
| `cif` | Único, para facturación |
| `plan` | STARTER / GROWTH / ENTERPRISE |
| `contactRrhhName/Email/Phone`, `contactFinanceName/…` | Dos contactos principales |
| `employeeCount` | Cacheado para dashboards |
| `contractSignedAt`, `contractUrl`, `digitalCertificateUrl` | Documentación del onboarding |
| `contractAnnexes` | JSON array de `{name, url, uploadedAt}` |
| `deductibilityRate`, `adoptionRate`, `monthlySpend` | Métricas cacheadas (recalculadas diariamente) |

### `CompanySite`

Sedes físicas donde se entrega la comida. Una empresa puede tener muchas
sedes.

| Campo destacado | Notas |
|---|---|
| `companyId` | FK a Company |
| `address`, `postalCode`, `latitude`, `longitude` | Para asignación a rutas |
| `deliveryWindow` | Ventana tipo `12:00-14:00` |
| `deliveryNotes` | Instrucciones al repartidor ("entrada por lateral", "llamar al timbre 2") |
| `active` | Soft-disable |

### `CompanyPolicy`

La política actual de la empresa (1:1 con Company). Define el
comportamiento del beneficio:

| Campo | Notas |
|---|---|
| `cutoffTime` | `"11:00"` hora límite para pedidos |
| `daysActive` | JSON: `["monday","tuesday",…]` |
| `limitPerDay` | Presupuesto máximo por empleado/día |
| `copayCompany`, `copayEmployee` | Reparto del coste |
| `noShowRule` | CHARGE / NO_CHARGE / PARTIAL |
| `blockAllergensEnabled` | Si `true`, el selector del empleado oculta platos con alérgenos declarados |
| `effectiveFrom`, `effectiveTo` | Permite programar cambios futuros |
| `version` | Se incrementa cada vez que cambia |

### `CompanyPolicyHistory`

Cada cambio de política deja constancia. `previousValues` y `newValues`
son JSON snapshot. Se usa en auditoría fiscal ("el 3 de abril se subió el
límite a 12€, antes era 10€").

### `Employee`

Persona que trabaja en la empresa y consume el beneficio. Tiene
obligatoriamente asociado un `User` (para login) y un `CompanySite`
(dónde recibe la comida).

| Campo destacado | Notas |
|---|---|
| `userId` | FK a User |
| `siteId` | FK a CompanySite |
| `employeeNumber` | Número interno de la empresa |
| `department`, `position`, `startDate`, `endDate` | Para reports por área |
| `dietPrefs` | JSON: `{allergies: [], preferences: [], restrictions: [], ...}`. Schema en `lib/types/diet-prefs.ts` |
| `weeklyMenuDays` | Cuántos días a la semana pide típicamente (4 por defecto) |
| `monthlyLimit` | Override del límite mensual (si no, toma el de la empresa) |
| `deletedAt` | Soft delete; los pedidos históricos se mantienen |

### `EmployeeInvitation`

Cuando RRHH da de alta un empleado nuevo, se le envía un email con un
token para que él mismo fije su contraseña y acepte.

| Campo | Notas |
|---|---|
| `token` | Único, opaque, expira en 7 días |
| `status` | PENDING / ACCEPTED / EXPIRED / CANCELLED |
| `userId`, `employeeId` | Se rellenan al aceptar |

### `CompanySettings`

Preferencias operativas del portal empresa (separadas de `CompanyPolicy`
que es contractual). Notificaciones, vistas por defecto, umbrales de
alerta:

| Campo | Notas |
|---|---|
| `notificationsEmail` | Array de emails destino |
| `notifyDailySummary`, `notifyIncidents`, `notifyInvoices`, `notifyLowAdoption` | Toggles |
| `alertCancellationRate`, `alertAdoptionRate`, `alertDeductibilityRate` | Umbrales para alerts del dashboard |
| `defaultViewEmployees`, `defaultPeriodReports` | UX preferences |

---

## Dominio 3 — Catering

### `Restaurant`

1:1 con un `Tenant` de tipo CATERING. Configuración operativa del
catering.

| Campo destacado | Notas |
|---|---|
| `displayName`, `legalName`, `cif`, `iban` | Para factura |
| `dailyCapacity` | Nº máximo de platos/día |
| `preparationWindow`, `deliveryWindow` | Horarios operativos |
| `cutoffTime` | Hora corte para recibir pedidos del día |
| `leadTimeMinutes` | Antelación requerida (180 = 3h antes del servicio) |
| `operationalDays` | JSON array días laborables |
| `zones` | JSON: `[{name, postalCodes, maxDistance, operator}]` — zonas de reparto |
| `commission` | Decimal(5,4). `0.05` = 5% a Plati |
| `minimumBilling` | Umbral mínimo facturable |
| `paymentCycle` | SEMANAL / QUINCENAL / MENSUAL |
| `punctualityRate`, `incidentRate`, `averageRating` | KPIs cacheados |
| `documentsStatus` | OK / WARNING / BLOCKED según vencimiento de docs |
| `operationalStatus` | ACTIVE / SUSPENDED / UNDER_REVIEW |

### `RestaurantDocument`

Documentación legal. Cuatro tipos (enum `DocumentType`):

- `REGISTRO_SANITARIO`
- `RC` (Responsabilidad Civil)
- `MANIPULADORES` (carnets)
- `OTROS`

Campos clave: `issuedAt`, `expiresAt`, `status` (VALID/EXPIRING/EXPIRED).
Job diario marca como EXPIRING los que están a <30 días de `expiresAt`;
EXPIRED pasado el límite. Los caterings con documentos EXPIRED tienen
`operationalStatus = UNDER_REVIEW` automático.

### `RestaurantAudit`

Auditoría externa de calidad del catering:

- `SANITARIA` — inspección de sanidad.
- `OPERATIVA` — revisión operativa (tiempos, procedimientos).
- `SATISFACCION` — NPS encuestas a empleados.

Score numérico + `reportUrl` al informe PDF.

### `Dish`

Un plato en el catálogo del catering.

| Campo | Notas |
|---|---|
| `course` | FIRST / SECOND / DESSERT |
| `name`, `description`, `ingredients`, `imageUrl` | Descriptivo |
| `labels` | JSON array: alérgenos + tags nutricionales (ej: `["gluten","lactose","vegan"]`) |
| `nutrition` | JSON: `{kcal, protein, carbs, fat}` |
| `basePrice` | Precio base por defecto |
| `active` | Soft-disable sin perder histórico |

**Nota**: editar un plato publicado **no retroactiva** los menús ya
publicados — la UI avisa al chef.

### `DishSchedule`

"Este plato, este día concreto, con esta disponibilidad/precio/visibilidad".
Es lo que el empleado ve como "menú de hoy".

| Campo | Notas |
|---|---|
| `dishId`, `date` | (dishId, date) es único |
| `stockLimit` | Si se alcanza, el plato deja de ofrecerse |
| `priceOverride` | Precio de hoy, si diferente del base |
| `visibleTo` | `"all"` o `{companies: [...], zones: [...]}` — visibilidad segmentada |
| `status` | PUBLISHED / HIDDEN |

---

## Dominio 4 — Asignación Empresa ↔ Catering

### `CompanyCateringAssignment`

El "contrato" entre una empresa y un catering. Tabla que cruza dos
tenants (tiene `tenantEmpresa` **y** `tenantCatering`).

| Campo | Notas |
|---|---|
| `type` | PRIMARY / BACKUP |
| `zones` | Array de zonas postales que cubre esta asignación |
| `priority` | 1 = mayor prioridad |
| `slaPunctuality`, `slaIncidentRate` | SLAs contractuales |
| `active` | Permite desactivar sin borrar histórico |
| `assignedAt`/`assignedBy`, `deactivatedAt`/`deactivatedBy`/`deactivationReason` | Auditoría del vínculo |

**Por qué histórica y no borrada**: si un pedido del pasado se audita,
hay que saber qué catering lo sirvió.

---

## Dominio 5 — Pedidos

### `Order` — el modelo más crítico

Cruza dos tenants: `tenantEmpresa` + `tenantCatering`.

| Campo | Notas |
|---|---|
| `employeeId`, `siteId` | Quién pidió y dónde entregar |
| `serviceDate` | Fecha del servicio, no de la creación |
| `selection` | JSON: `{dish_ids: [uuid, uuid, uuid]}` — 1º + 2º + postre |
| `price` | Precio total congelado en el momento del pedido |
| `menuType` | FULL (completo) o HALF (solo 1º o solo 2º) |
| `status` | DRAFT / CONFIRMED / CANCELLED_BEFORE_CUTOFF / LOCKED_AFTER_CUTOFF / DELIVERED / NO_SHOW / ISSUE_REPORTED / COMPENSATED / REJECTED |
| `lockedAt` | Timestamp del lock post-cutoff |
| `routeId` | FK a DeliveryRoute (se asigna tras cutoff) |
| `invoiceId` | FK a Invoice (se asigna al generar factura del mes) |
| `version`, `integrityHash` | Tamper-evidence |
| `createdBy`, `lastModifiedBy` | Quién lo creó / modificó |

**Índice único**: `(tenantEmpresa, employeeId, serviceDate)` — un
empleado solo puede tener un pedido por fecha. Cambios de selección
modifican el registro, no crean uno nuevo.

**Máquina de estados (simplificada)**:

```
DRAFT ──(empleado confirma)──► CONFIRMED
                                  │
                                  ├──(empleado cancela pre-cutoff)──► CANCELLED_BEFORE_CUTOFF
                                  │
                                  └──(cron 11:00)──► LOCKED_AFTER_CUTOFF
                                                       │
                                                       ├──(entrega OK)──► DELIVERED
                                                       │
                                                       ├──(no aparece)──► NO_SHOW
                                                       │
                                                       └──(incident abierta)──► ISSUE_REPORTED
                                                                                 │
                                                                                 └──(compensación)──► COMPENSATED
```

### `OrderHistory`

Cada cambio de `Order` deja un registro aquí con `prevValues`/`newValues`
+ `changeReason`:

- `USER_EDIT` — empleado cambia antes del cutoff.
- `RRHH_OVERRIDE` — RRHH forcó cambio post-cutoff.
- `STOCK_SUBSTITUTION` — catering cambió plato por stock.
- `CANCEL_BEFORE_CUTOFF`, `CANCEL_AFTER_CUTOFF`.
- `DELIVERY_MARK` — repartidor marcó DELIVERED/FAILED.
- `SYSTEM_ADJUSTMENT` — cron, conciliación.

### `OrderRating`

Valoración post-entrega del empleado. 1:1 con `Order`:

- `rating` (1-5) obligatorio.
- `tasteRating`, `portionRating`, `presentationRating` (1-5) opcionales.
- `comment` texto libre.

Alimenta `Restaurant.averageRating` (recalculado nightly).

---

## Dominio 6 — Producción

### `KitchenSheet`

Snapshot inmutable de la consolidación de pedidos para cocina. Uno por
(catering, serviceDate):

```json
content: [
  { dishName: "Gazpacho", course: "FIRST", quantity: 45, dietFlags: ["vegan"] },
  { dishName: "Merluza al horno", course: "SECOND", quantity: 38, dietFlags: [] },
  { dishName: "Yogur", course: "DESSERT", quantity: 30, dietFlags: ["lactose"] }
]
```

`signatureHash` hace del sheet una prueba de "esto es lo que teníamos
que cocinar hoy" — si luego el chef alega que no recibió la orden, el
hash demuestra lo contrario.

### `PackingSheet`

Análogo pero granulado por empleado (para empaquetado individual). Uno
por (catering, empresa, serviceDate):

```json
content: [
  {
    employeeName: "Laura G.",
    employeeNumber: "E-0042",
    site: "Madrid Gran Vía",
    dishes: ["Gazpacho","Merluza al horno","Yogur"],
    allergens: ["lactose"],
    notes: "Sin postre"
  },
  ...
]
```

Se usa para imprimir etiquetas térmicas (futuro) y para que el packer
verifique que cada bolsa lleva lo correcto.

---

## Dominio 7 — Entregas

### `DeliveryRoute`

Una ruta es "repartidor X reparte estos pedidos en este orden el día Y".

| Campo | Notas |
|---|---|
| `tenantId` (catering) | |
| `name`, `date` | Identificador legible |
| `deliveryUserId` | FK a User (el repartidor) |
| `estimatedDuration` | En minutos |
| `status` | PENDING / IN_PROGRESS / COMPLETED / CANCELLED |
| `startedAt`, `completedAt` | Timestamps reales |

### `DeliveryRouteSite`

Parada de la ruta en una sede concreta, con `sequence` (orden).

### `DeliveryEvent` (por pedido)

Eventos en el ciclo de un pedido: PACKED → OUT_FOR_DELIVERY → DELIVERED
/ FAILED. Cada uno con `timestamp` y `markedBy`.

### `DeliveryRouteEvent` (por ruta)

Eventos de la ruta completa: ROUTE_STARTED, ROUTE_COMPLETED,
ROUTE_CANCELLED, LOCATION_UPDATE (GPS), ORDER_DELIVERED,
INCIDENT_REPORTED. Con `metadata` JSON para contextualizar.

### `DeliveryProof`

La prueba digital de entrega. 1:1 con Order.

| Campo | Notas |
|---|---|
| `deliveredAt` | Timestamp real |
| `deliveredBy` | Nombre del repartidor |
| `deliveryMethod` | in_person / locker / reception |
| `proofType` | PHOTO / SIGNATURE / NONE |
| `proofUrl` | URL a foto o firma |
| `recipientName` | Quien recibió (si aplica) |
| `latitude`, `longitude` | Geolocalización del device en el momento |
| `verificationHash` | Tamper-evidence |

Es la pieza fiscal más importante junto con `DailySnapshot`.

---

## Dominio 8 — Facturación

### `Invoice`

Una factura mensual del catering a la empresa. Cruza tenants.

| Campo | Notas |
|---|---|
| `period` | `"2026-04"` |
| `number` | Serie + correlativo según configuración |
| `issueDate`, `dueDate` | Para contabilidad |
| `startDate`, `endDate` | Fechas del período cubierto |
| `subtotal`, `taxRate`, `taxAmount`, `total` | Decimal(10,2) |
| `status` | DRAFT / ISSUED / SENT / PAID / OVERDUE / CANCELLED / VOID |
| `sentAt`, `paidAt` | Trazabilidad |
| `snapshot` | JSON inmutable del estado de generación — permite reconstruir la factura aunque se cambien datos después |
| `integrityHash` | SHA-256 del subtotal + nº líneas + timestamp |
| `pdfUrl` | URL al PDF generado |

### `InvoiceLine`

Una línea por pedido facturable:

| Campo | Notas |
|---|---|
| `date`, `orderId`, `employeeId` | Trazabilidad |
| `concept` | `"Gazpacho + Merluza al horno + Yogur"` |
| `amount` | Decimal(8,2) |
| `facturableFlag` | FULL / HALF / NONE |
| `note` | Motivo si `!= FULL` (ej: "NO_SHOW parcial 50%") |

### `CompanyExport`

Exportaciones que la empresa descarga para su ERP:

- `ERP_CSV` — CSV estructurado.
- `PAYROLL_CSV` — para nómina (copay empleado).
- `SUMMARY_PDF` — resumen visual.

---

## Dominio 9 — Fiscal / compliance

### `DailySnapshot`

Ver [business-model.md](../overview/business-model.md). Snapshot
inmutable diario por par (empresa, catering) con `signHash` SHA-256.

### `FiscalReport`

Reporte mensual por empresa con todos los KPIs fiscales. Ver
[business-model.md](../overview/business-model.md).

---

## Dominio 10 — Auditoría

### `AuditLog`

Tabla más usada a nivel de escritura. Cada operación relevante escribe
una fila:

```json
{
  tenantId, actorId,
  action: "UPDATE",
  entity: "Order", entityId: "abc-123",
  diff: {
    before: { status: "CONFIRMED" },
    after: { status: "LOCKED_AFTER_CUTOFF" }
  },
  ip, userAgent, timestamp,
  hash: "sha256:..."
}
```

- `actorId` nunca es null (el cron jobs usa un `SYSTEM_ACTOR_ID`).
- `hash` incluye el timestamp → dos logs idénticos tienen hash distinto
  (evita ataques de replay).
- No hay delete. Para retención, el cron purga logs >2 años tras firmar
  un backup en frío.

---

## Dominio 11 — Incidencias

### `Incident`

Problemas reportados por empresa, empleado o catering:

| Campo | Notas |
|---|---|
| `orderId` | Opcional — puede haber incidencias sin pedido (ej: sede sin acceso) |
| `type` | Catálogo de tipos (cold_food, wrong_dish, missing_items, ...) |
| `severity` | LOW / MEDIUM / HIGH |
| `status` | OPEN / IN_PROGRESS / RESOLVED / COMPENSATED |
| `reportedBy`, `openedBy`, `assignedTo` | Quién reportó, quién abrió el ticket, a quién se asignó |
| `resolution` | JSON: `{type, amount, details}` — qué compensación se aplicó |

---

## Dominio 12 — Notificaciones e integraciones

### `Notification`

| Campo | Notas |
|---|---|
| `userId` | null = broadcast a todos los del tenant |
| `type` | INVOICE / INCIDENT / ALERT / REMINDER / INFO |
| `priority` | LOW / NORMAL / HIGH / URGENT |
| `title`, `message`, `actionUrl` | Contenido |
| `read`, `readAt` | Estado |
| `expiresAt` | Desaparece de la campanita tras esta fecha |

### `Integration`

Configuración de integraciones externas. `config` es JSON libre porque
cada tipo (ERP, SSO, PAYMENTS, MESSAGING) tiene campos distintos.

### `Webhook` + `WebhookDelivery`

Para notificar eventos a sistemas externos. `Webhook` define el destino
y el secret (HMAC), `WebhookDelivery` guarda cada intento con response
y retries.

---

## Enums (resumen)

Los 28 enums están en `schema.prisma`. Los más importantes ya están
explicados en contexto arriba. Para la lista literal completa, consultar
el schema o el anexo de este documento en
`docs/project-registry.md#enums`.

## Índices y performance

La mayoría de queries de portal filtran por `tenantId + algo más`, por
eso muchos modelos tienen índices compuestos:

- `Order`: `(tenantEmpresa, employeeId, serviceDate)` único; `(tenantEmpresa, serviceDate)`, `(tenantCatering, serviceDate)` para listados de portal.
- `AuditLog`: `(tenantId, entity, entityId)` para consultar historial de una entidad.
- `Incident`: `(tenantEmpresa, status)`, `(tenantCatering, status)` para dashboards.
- `Invoice`: `(tenantCatering, tenantEmpresa, period)` único.

En caso de lentitud, el primer sospechoso es ausencia de filtro tenant
(full table scan). Ver logs con `log: ['query']` en `PrismaClient`.
