# Portal Súper Admin — Módulos operativos (sprints 1-8)

Este documento cubre los **8 módulos operativos** del portal Súper Admin
que se construyeron entre los sprints 1 y 8 (abril 2026). Son los que
viven en el sidebar bajo los grupos Usuarios, Calidad, Compliance,
Plantillas, Operación, Integraciones, Facturación y Catálogos.

> El documento `portal-admin.md` describe el scaffolding inicial y la
> navegación del portal. Este detalla la funcionalidad real de cada
> módulo.

---

## 1. Usuarios, Roles y Permisos

**URL**: `/admin/users`, `/admin/users/roles`, `/admin/users/permissions`

### Qué hace

- CRUD completo de usuarios del sistema (no empleados, que son un modelo
  aparte). Sirve para crear AUDITOR, ROOT extra, operativos.
- Consulta de los **14 roles hardcoded** en `lib/auth/permissions.ts`.
  Cada rol tiene descripción, lista de permisos directos, wildcards
  heredados y recuento de usuarios activos.
- **Matriz visual de permisos** (roles × permisos) con 3 estados:
  ✓ directo, ⭘ heredado por wildcard, — sin permiso. Filtros por
  entidad y rol. Export CSV para auditoría.

### Cómo funciona

- Los roles **no se editan desde UI**. Son código controlado por git;
  cambios requieren PR. La UI tiene badge "solo lectura" con tooltip.
- Las queries viven en `lib/db/queries/admin-users.ts` y
  `lib/db/queries/admin-roles.ts`:
  - `getAllUsers(filters)` con paginación server-side.
  - `getRoleUsageStats()` agrega uso de roles sobre `AuditLog`.
  - `getUserLastActivity(userId)` trae última acción.
- `PERMISSION_DESCRIPTIONS` y `ROLE_DESCRIPTIONS` en
  `lib/auth/permissions.ts` dan los textos legibles sin romper la API
  pública de `hasPermission()`.

### Modelos afectados

No hay modelo nuevo. Solo añade metadatos en código sobre los 14 roles
existentes.

---

## 2. Calidad y SLAs

**URL**: `/admin/quality/{incidents,audits,ratings,penalties}`

### Qué hace

- **Incidencias cross-tenant**: agregado de `Incident` con KPIs (abiertas,
  en curso, resueltas, compensadas) + filtros por empresa, catering,
  severidad, fechas. Permite asignar supervisor SinTupper.
- **Auditorías**: listado de `RestaurantAudit` (sanitarias, operativas,
  satisfacción) con PDF embebido. Crear auditoría nueva con upload.
- **Ratings**: agregaciones sobre `OrderRating`. Top 10 mejor/peor
  valorados, tendencia 6 meses, comentarios recientes.
- **Penalizaciones** (*nuevo*): sistema completo con flujo
  `PENDING → APPLIED → DISPUTED → WAIVED`. Catering tiene ventana de
  7 días para disputar una penalización APPLIED.

### Modelos nuevos

```prisma
model Penalty {
  id                String
  tenantCatering    String
  companyId         String?
  type              PenaltyType  // SLA_BREACH / DOC_EXPIRED / INCIDENT_THRESHOLD / MANUAL
  reason            String
  amount            Decimal
  appliedBy         String
  linkedIncidentId  String?
  linkedAuditId     String?
  status            PenaltyStatus @default(PENDING)
  disputedAt        DateTime?
  disputeReason     String?
  resolvedAt        DateTime?
  resolvedBy        String?
  settledAt         DateTime?
  notes             String?
}
```

### Server Actions

`components/admin/quality/penalties/actions.ts`:

- `createPenaltyAction` — SUPER_ADMIN crea manual o desde incidencia.
- `applyPenaltyAction` — mueve PENDING/DISPUTED → APPLIED.
- `waivePenaltyAction` — perdona con motivo.
- `disputePenaltyAction` — el **ADMIN_CATERING afectado** dispara desde
  `/catering/calidad`, solo dentro del plazo de 7 días.

---

## 3. Compliance

**URL**: `/admin/compliance/{fiscal-audit,retention,gdpr,dpa,security}`

### Qué hace

- **Auditoría fiscal** cross-tenant: vista de `FiscalReport` mensuales
  con alertas (pedidos > 11€, sin proof, tasa deducibilidad baja).
  Verifica integridad recomputando `signatureHash` (SHA-256).
- **Retención de datos**: políticas por entidad (AuditLog 2 años,
  Invoice 5 años, DailySnapshot 4 años). Botón "Ejecutar ahora"
  gated a SUPER_ADMIN.
- **RGPD**: gestión de derechos (acceso, erasure, portability,
  rectificación). Genera dump JSON con todos los datos del usuario.
  Alert si pasa el plazo legal de 30 días.
- **DPA**: Data Processing Agreement por tenant. Histórico de versiones,
  subida de PDF firmado. El tenant ve el DPA vigente en su portal
  (`MyDpaCard`).
- **Seguridad**: checklist OWASP Top 10 + subida de informes pentest.

### Modelos nuevos

`RetentionPolicy`, `GdprRequest`, `DpaAgreement`, `SecurityCheck`,
`SecurityReport`.

---

## 4. Plantillas y Branding

**URL**: `/admin/templates/{branding,communication,announcements}`

### Qué hace

- **Branding por tenant**: SUPER_ADMIN ve tabla con todos los tenants y
  su branding (primary, secondary, logo, favicon). Puede sobreescribir
  el de cualquier tenant vía override.
- **Defaults del sistema**: singleton `SystemSettings` con los valores
  por defecto que heredan tenants sin branding propio (incluye
  `brandName`, que aparece en emails y login).
- **Comunicación**: CRUD de templates de email/SMS/WhatsApp/in-app con
  variables (`{{employee.name}}`, `{{order.date}}`). Preview + test
  send.
- **Announcements**: banners in-app dirigidos por rol/tenant con fechas
  de inicio/fin y severidad.

### Integración visual (end-to-end)

Al guardar branding:

1. Se escribe en `Tenant` (primaryColor, logoUrl, etc.).
2. `revalidatePath('/empresa', 'layout')` + `'/catering'` + `'/empleado'`.
3. Los layouts leen con `getEffectiveBranding(tenant)` (cae al default
   del sistema si el tenant no personaliza).
4. `BrandProvider` inyecta CSS vars `--brand-primary`,
   `--brand-primary-foreground` en el `<body>`.
5. Sidebars/navbars usan `style={{ color: 'var(--brand-primary)' }}`
   + inline styles en enlaces activos y logos.
6. El empleado que refresque ve el color y logo nuevos al instante.

### Modelos

`SystemSettings` (singleton `id='singleton'`), `CommunicationTemplate`,
`Announcement`. `Tenant` amplía campos `secondaryColor`, `faviconUrl`.

---

## 5. Operación

**URL**: `/admin/operations/{impersonation,backups,migrations,maintenance,health,rate-limiting}`

### Qué hace

- **Impersonación**: historial filtrando `AuditLog` por `action IN
  ('IMPERSONATE','IMPERSONATE_END')`. Alerta si > 15 min.
- **Backups**: tabla `BackupEvent` con metadatos de cada pg_dump
  (fecha, tamaño, hash). Cron en servidor escribe aquí tras cada
  backup nocturno.
- **Migraciones**: query directa a `_prisma_migrations`. Indicador
  visual "BD sincronizada con schema".
- **Mantenimiento**: modelo `MaintenanceWindow` con `startsAt/endsAt`,
  `reason`, `allowedRoles`. Middleware consulta: si hay ventana activa
  y el rol no está en allowed → 503 con mensaje custom.
- **Health**: endpoint `/api/admin/health` hace pings (BD, Redis, cron,
  backup, disk, Coolify). UI muestra verde/ámbar/rojo + histórico 24h.
- **Rate-limiting**: stats de `authRateLimiter`,
  `impersonationRateLimiter`, `exportRateLimiter`. Botón "Reset manual"
  para desbloquear usuarios.

### Modelos nuevos

`MaintenanceWindow`, `BackupEvent`, `HealthCheckResult`.

---

## 6. Integraciones

**URL**: `/admin/integrations/{webhooks,api-keys,sso,payments,erp}`

### Qué hace

- **Marketplace visual** con 27 proveedores en 8 categorías (CRM, ERP,
  Payments, SSO, Communication, Analytics, Storage, BI). Muestra
  estado "Disponible" / "Próximamente" / "Conectado".
- **Webhooks**: CRUD completo sobre el modelo `Webhook` existente
  (target URL, evento, secret). Historial de `WebhookDelivery` con
  éxitos/fallos/retries. Botón "Test" dispara evento dummy.
- **API keys**: modelo nuevo con `keyHash` + `lastFour` + `scopes`.
  Plaintext se muestra **una sola vez** al crear. Middleware API
  valida `x-api-key` contra keyHash.
- **SSO / Payments / ERP**: UI de configuración completa (Google/Azure
  AD/Okta para SSO, Stripe/SEPA para payments, SAP/A3/Holded/SII para
  ERP). **Conectores reales fuera de scope** — UI lista para cuando
  se decidan proveedores con clientes.

### Modelos nuevos

`ApiKey`, `SsoConfig`, `PaymentProvider`, `ErpConfig`.

Campos sensibles (`clientSecret`, `credentials`) cifrados con
AES-256-GCM vía `lib/crypto/pii-cipher.ts`.

---

## 7. Facturación y Planes

**URL**: `/admin/billing/{plans,settlements,commissions,metrics,taxes}`

### Qué hace

- **Planes SaaS**: CRUD sobre `SaasPlan` (STARTER/GROWTH/ENTERPRISE).
  Features JSON, límites (maxEmployees, maxOrdersMonth), precios
  mensual/anual, nivel de soporte.
- **Comisiones**: suma `Invoice.total × Restaurant.commission` por
  catering y período. Estados PENDIENTE/LIQUIDADA.
- **Liquidaciones** (`Settlement`): mensual por catering. Gross −
  comisión − penalizaciones = neto. Estados DRAFT/APPROVED/PAID.
  Cron o botón manual genera la liquidación del mes.
- **Métricas**: MRR (suma de `SaasPlan.monthlyPrice` de companies
  activas), ARR (MRR×12), churn (companies INACTIVE / activas a inicio
  de mes), gráficas 12 meses.
- **Reglas fiscales** (`TaxRule`): IVA general, reducido, exento, con
  region (canario/ceuta/melilla) y `validFrom/validTo`. `Invoice.taxRate`
  deja de ser hardcoded 10% y lee la regla aplicable en el momento.

### Triple flujo de facturación

1. **Catering → Empresa**: `Invoice` con pedidos del mes + IVA.
2. **Catering → SinTupper**: comisión sobre esas facturas (configurable
   en `Restaurant.commission`).
3. **SinTupper → Empresa**: cuota SaaS según `SaasPlan` (modelo
   separado `SaasInvoice`).

### Modelos nuevos

`SaasPlan`, `SaasInvoice`, `Settlement`, `TaxRule`.

---

## 8. Catálogos Globales

**URL**: `/admin/catalogs/{allergens,calendars,incident-reasons,menu-templates,zones}`

### Qué hace

Datos maestros **administrables desde UI sin redeploy**. Algunos
estaban hardcoded en el código; ahora viven en BD.

#### Alérgenos (admin)
CRUD de los 14 oficiales EU (gluten, lactosa, crustáceos…) + la
posibilidad de añadir propios. Campos: `code`, `name`, `category`
(`AllergenCategory` enum EU), `active`. Seed sembrado al desplegar.

#### Festivos (admin + empresa + catering)
Modelo clave porque **afecta al cómputo fiscal IRPF** (los festivos
excluyen días de la deducibilidad).

Tres ámbitos:

| Scope | Quién lo crea | Dónde se define |
|---|---|---|
| `NATIONAL` | Super admin | BOE (España) |
| `REGION` | Super admin | DOGA/BOPV/… (con `regionCode` ISO 3166-2) |
| `TENANT` | Empresa o catering | Su propio portal |

Cada empresa y catering puede **desactivar individualmente festivos
oficiales** que no le apliquen (típico en hoteles, hospitales, servicios
24/7). Lo hace vía `HolidayOverride(tenantId, holidayId, disabled)`.

El **helper crítico** es:

```ts
// lib/db/queries/catalogs.ts
export async function getEffectiveHolidays(
  tenantId: string,
  year: number
): Promise<Date[]>

export async function isBusinessDay(
  tenantId: string,
  date: Date
): Promise<boolean>
```

`getEffectiveHolidays` combina:

1. Festivos `NATIONAL` + `REGION` del año **menos** los desactivados por
   el tenant vía `HolidayOverride`.
2. Festivos `TENANT` propios del tenant.
3. Deduplicación por ISO date.

`isBusinessDay` = no es sábado ni domingo Y no está en
`getEffectiveHolidays(tenantId, year)`.

#### Motivos de incidencia (admin)
CRUD de `IncidentReason` con `code`, `name`, `defaultSeverity`
(LOW/MEDIUM/HIGH), `category`, `requiresCompensation`, `scope`
(SYSTEM/TENANT). Los empleados y caterings ven estos en el dropdown
al reportar incidencias.

#### Plantillas de menú (catering)
`MenuTemplate` con `structure JSON` — 5 días × 3 cursos (first, second,
dessert), cada uno una lista de strings (nombres de platos). Reutilizable
al programar menús.

#### Zonas de reparto (catering)
`DeliveryZone(tenantCatering, name, postalCodes[], maxDistanceKm,
defaultDriver, notes)`. Validación: CP de 5 dígitos español.
`findCateringsCoveringPostalCode(cp)` devuelve qué catering cubre un
CP concreto.

### Integración fiscal end-to-end (Sprint 8)

`generateFiscalReport(tenantEmpresa, year, month)` en
`lib/db/queries/empresa-auditoria.ts`:

```ts
const [orders, effectiveHolidays] = await Promise.all([
  prisma.order.findMany({ where: {...} }),
  getEffectiveHolidays(tenantEmpresa, year),
])

const holidaysSet = new Set(effectiveHolidays.map(...))
const isBusinessDayLocal = (d) => {
  if (d.getDay() === 0 || d.getDay() === 6) return false
  return !holidaysSet.has(iso(d))
}

// daysWithService = días hábiles únicos con al menos 1 pedido entregado
// ordersOnNonBusinessDay = pedidos servidos en no-hábiles (fiscal red flag)
```

El `signatureHash` SHA-256 del reporte incluye estas nuevas métricas,
así que cambios en festivos del tenant invalidan el hash previo
(hash se recomputa al regenerar el reporte).

### Modelos nuevos

`Allergen`, `Holiday`, `HolidayOverride`, `MenuTemplate`, `DeliveryZone`,
`IncidentReason` + 4 enums (`AllergenCategory`, `HolidayScope`,
`IncidentReasonSeverity`, `MenuTemplate.structure` JSON).

### Seeds

`scripts/seed-catalogs.ts` deja sembrado:

- 14 alérgenos EU.
- 20 festivos nacionales ES (2026 + 2027).
- 10 motivos de incidencia iniciales.

---

## Tests añadidos a lo largo de los sprints

| Sprint | Suite | Tests | Foco |
|---|---|---:|---|
| 1 | `auth/permissions.test.ts` | 17 | Matriz de permisos + wildcards |
| 1 | `auth/permissions-metadata.test.ts` | 6 | Descripciones y consistencia |
| 1 | `auth/scoped-tenant.test.ts` | 7 | Aislamiento multi-tenant |
| 2 | `lib/penalty-validation.test.ts` | 6 | Validaciones Zod |
| 3 | `lib/compliance-validation.test.ts` | 10 | DPA, GDPR, retención |
| 4 | `lib/branding.test.ts` | 6 | Contraste + efectivo branding |
| 5 | `lib/maintenance-validation.test.ts` | 5 | Ventanas |
| 5 | `lib/ratelimit.test.ts` | 7 | Rate limiters |
| 6 | (UI only — sin tests unitarios nuevos) | 0 | — |
| 7 | `lib/billing-validation.test.ts` | 10 | Planes, tax rules |
| 8 | `lib/catalogs-validation.test.ts` | 18 | Schemas catálogos |
| 8 | `queries/catalogs.test.ts` | 9 | `isBusinessDay`, `getEffectiveHolidays`, overrides |

**Total suite**: 121 tests verdes en 14 files. Type-check limpio.
0 lint errors.

---

## Permisos añadidos (extracto)

En `lib/auth/permissions.ts` se añadieron bajo **SUPER_ADMIN**
(y `*:read` bajo AUDITOR):

`penalties:*, retention:*, gdpr:*, dpa:*, security:*, announcements:*,
branding:*, system_settings:*, maintenance:*, backups:*, health:*,
rate_limit:*, plans:*, settlements:*, commissions:*, tax_rules:*,
api_keys:*, sso:*, erp:*, payments:*, catalogs:*, allergens:*,
holidays:*, incident_reasons:*, menu_templates:*, delivery_zones:*`.

Además a **ADMIN_EMPRESA** y **ADMIN_CATERING** se les dio
`holidays:read, holidays:update, branding:read, branding:update`.
A **ADMIN_CATERING** también `menu_templates:*, delivery_zones:*`.

---

## Archivos clave (referencias rápidas)

### Modelos nuevos (Prisma)
`prisma/schema.prisma` — ~25 modelos nuevos entre sprints 1-8.

### Queries por dominio
- `lib/db/queries/admin-users.ts` · `admin-roles.ts`
- `lib/db/queries/admin-quality.ts`
- `lib/db/queries/admin-compliance.ts`
- `lib/db/queries/admin-operations.ts`
- `lib/db/queries/admin-integrations.ts`
- `lib/db/queries/admin-billing.ts`
- `lib/db/queries/catalogs.ts` — **incluye `isBusinessDay` y
  `getEffectiveHolidays`**
- `lib/db/queries/branding.ts`

### Validaciones Zod
`lib/validations/{penalty,retention,gdpr,dpa,security,branding,
communication,announcement,maintenance,billing,catalogs}.ts`.

### Server Actions (agrupados por dominio)
- `components/admin/<modulo>/actions.ts`
- `components/catering/catalogs/actions.ts`
- `components/empresa/**/actions.ts`
- `components/shared/{branding,catalogs}/...`

### Seeds / scripts
- `scripts/seed-catalogs.ts` (alérgenos, festivos, motivos).
- Existentes: `prisma/seed.ts`, `seed-companies.ts`, `seed-caterings.ts`.

---

## Limitaciones actuales (conscientes)

1. **Integraciones**: UI de SSO, Stripe y ERP está completa, pero
   conectores reales requieren decisiones comerciales (qué proveedor
   primero, qué mercado). Badge "Próximamente" en esas tarjetas.
2. **Backups**: El modelo `BackupEvent` existe y el cron está previsto,
   pero requiere acceso SSH al servidor de producción para conectar la
   ejecución real de `pg_dump`.
3. **`FiscalReport.generatedBy`** sigue siendo `'system'` hardcoded
   — pre-existente a Sprint 8, anotado para próxima iteración.
4. **Menú templates** usa nombres de plato como strings en lugar de
   referencias a `Dish.id`. Cuando el catálogo de platos esté
   normalizado se migrará a UUIDs.
5. **Conectores ERP/SII reales** (SAP/A3/Holded): fuera de scope. El
   export `/api/empresa/facturacion/export` sigue siendo el canal.

---

## Cómo probarlo end-to-end

1. **Branding**: login como ADMIN_EMPRESA o ADMIN_CATERING →
   `/configuracion/branding` → cambia `primaryColor` → guarda → navega
   por el portal: sidebar, navbar y logos cambian.
2. **Festivos override**: como ADMIN_CATERING →
   `/catering/configuracion/holidays` → desactiva "Día de la
   Constitución" → ese día vuelve a contar como hábil en
   `isBusinessDay(tuTenantId, new Date('2026-12-06'))`.
3. **Festivo propio**: el mismo flujo, añade "Cierre técnico 15 agosto"
   → aparece en `getEffectiveHolidays(tu, 2026)`.
4. **Fiscal Report**: como ADMIN_EMPRESA → `/empresa/auditoria` →
   genera reporte → `daysWithService` refleja solo días hábiles (según
   tus overrides); `ordersWithIssues` marca pedidos en no-hábiles.
5. **Penalty dispute**: SUPER_ADMIN crea penalty a catering X → dentro
   de 7 días el ADMIN_CATERING de X puede disputar desde
   `/catering/calidad`; pasados 7 días se bloquea.
6. **Allergen**: SUPER_ADMIN añade alérgeno nuevo → aparece
   inmediatamente en el selector de platos del catering.

---

Última actualización: 2026-04-19 (cierre sprint 8).
