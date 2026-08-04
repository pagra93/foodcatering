# Análisis: del prototipo al producto — auditoría en 6 dimensiones

**Fecha:** 2026-08-04 · **Rama auditada:** `fix/dockerfile-seed-finance` (limpia, = main + fix Dockerfile)

**Origen:** análisis solicitado a partir del artículo "un prototipo funcional no es un producto
de producción": la IA acerca la apariencia, pero seguir siendo fiable exige resolver
**seguridad, escalabilidad, concurrencia, manejo de errores, observabilidad y arquitectura de
datos** — y la dificultad real es el criterio técnico, no la sintaxis.

**Método:** 5 auditorías paralelas de solo lectura (una por dimensión, con verificación
`file:line` en el código actual, no en la documentación) + verificación manual de los hallazgos
críticos + `pnpm audit --prod`. Los hallazgos ya resueltos por las remediaciones de 2026-04 y
2026-07 se listan como "estado sólido" para no re-trabajar lo cerrado.

---

## Veredicto

| Dimensión | Estado | Resumen |
|---|---|---|
| Seguridad | 🟢/🟡 | La más madura: authz, aislamiento, PII cifrada y headers verificados. Quedan bypass del rate limit por XFF, impersonación sin TTL efectivo y CVEs de dependencias. |
| Concurrencia / consistencia | 🔴 | Buena base de constraints y transacciones, pero **3 fallos de datos de dinero** (facturas catering) y varios check-then-act sin protección. |
| Escalabilidad + datos | 🟡 | Agregación en BD y paginación en lo principal; pero N+1 severos en admin, `distinct` en memoria, pool sin configurar y **cero jobs programados**. |
| Manejo de errores | 🟡 | Transacciones correctas en flujos críticos; pero 3 contratos de action distintos, 0 error boundaries y fallos de infraestructura disfrazados de errores de usuario. |
| Observabilidad / operación | 🔴 | Todo es *pull* (logs de Coolify, panel manual); nada es *push*. Sin health endpoint, sin alerting, sin error tracking, sin saber qué commit corre. |

**Plati no es el "prototipo" del artículo.** Tiene RBAC dinámico con enforcement, PII cifrada
AES-256-GCM con backfill, guard de aislamiento a nivel Prisma, auditoría con hash SHA-256 (79
puntos de escritura), transacciones en los flujos multi-entidad, unique constraints en los
invariantes principales, CI con Postgres real, backups con detección de dump vacío y un runbook
con restore reversible. Varias piezas son ejemplares (facturación SaaS con retry de correlativo,
`markInvoiceAsPaid` con auditoría intra-transacción, seeds prod idempotentes).

El gap real hasta "producto de producción" se concentra en **cinco frentes**:

1. **Consistencia de los datos de dinero** en la facturación catering→empresa.
2. **El propio guard de tenant genera falsos positivos** que hoy rompen flujos de portal.
3. **Observabilidad cero-push**: los incidentes solo se detectan si un cliente llama.
4. **Automatización inexistente**: facturación, cutoff, snapshots y retención dependen de humanos.
5. **Contrato de errores** fragmentado (3 estándares de action, mensajes que nunca llegan al usuario).

---

## 🔴 P0 — crítico ahora mismo

### P0-1 · El guard de tenant rompe crear/editar pedido, forgot-password y la vista de facturación de empresa

Verificado manualmente, no solo por agentes:

- [lib/db/prisma.ts:134](../../../lib/db/prisma.ts#L134) — `TENANT_GUARD_ENFORCE !== 'false'` → **bloquea por defecto**. El `.env` local NO define la variable y `docs/audits/runbook-produccion-seguridad.md:52` está desactualizado (habla de "modo aviso").
- [lib/db/queries/empleado-menus.ts:399-402](../../../lib/db/queries/empleado-menus.ts#L399) — dentro de `createOrUpdateOrder`: `companyCateringAssignment.findMany({ where: { companyId, active } })`. `CompanyCateringAssignment` está vigilado ([prisma.ts:48](../../../lib/db/prisma.ts#L48)); `hasTenantFilter` no reconoce `companyId` ([prisma.ts:91-115](../../../lib/db/prisma.ts#L91)) ni `isBoundedLookup` ([prisma.ts:148-152](../../../lib/db/prisma.ts#L148)) → **throw**. Todo intento de pedido = 500.
- [app/api/auth/forgot-password/route.ts:28](../../../app/api/auth/forgot-password/route.ts#L28) — `prisma.user.findFirst({ where: { email, status, deletedAt } })` sin tenant → el guard lanza, el `catch` lo traga y responde "revisa tu correo" **sin enviar nada**. Nadie puede recuperar contraseña.
- [lib/db/queries/empresa-facturacion.ts:149-157](../../../lib/db/queries/empresa-facturacion.ts#L149) — mismo patrón `{ companyId, active, type }`.

Es la misma familia del incidente del login (commit `c41046d`), que confirma que el enforcement está activo en prod. El escáner `scripts/scan-tenant-guard.mjs` no los detecta (evalúa la regex sobre todo el argumento: un `select: { tenantCatering }` lo da por seguro).

**Mejora:** (1) añadir filtro por relación a las 3 queries (`company: { tenantId } }` pasa el guard y es correcto) y `prismaAdmin` en forgot-password (lookup cross-tenant legítimo, como el login); (2) sustituir el escáner por **tests unitarios contra el guard real** (`hasTenantFilter`/`isBoundedLookup` ya se exportan) — hoy es imposible porque `tests/setup.ts` fija `TENANT_GUARD_ENFORCE='false'`; (3) cuando el guard bloquee, registrar el evento en tabla (ver P0-8), no solo `console`. **Esfuerzo: S + M (harness).**

### P0-2 · `Order.selection` tiene 3 formatos incompatibles → las facturas catering→empresa salen casi a 0 €

- Escritura real: `{ starterId, mainId, dessertId }` ([empleado-menus.ts:394-396](../../../lib/db/queries/empleado-menus.ts#L394)).
- Facturación lee `firstId/secondId/dessertId` ([catering-invoices.ts:104-109](../../../lib/db/queries/catering-invoices.ts#L104)) → solo resuelve el postre.
- Reputación lee `{ first: {dishId}, ... }` ([lib/ratings/selection.ts:19-22](../../../lib/ratings/selection.ts#L19)) — el formato de los seeds → `rateDishesAction` siempre devuelve "Ningún plato válido".

Una factura de un mes real sale con importe ≈ 0 €, y el `snapshot` + `integrityHash` "inmutables" sellan el error. **Mejora:** contrato único (el de `lib/ratings/selection.ts`), validado con Zod al escribir, migración de datos, y test de contrato pedido→factura (`invoice.subtotal === Σ order.price`). **Esfuerzo: M.**

### P0-3 · La factura recalcula precios actuales en vez de usar `order.price` → rompe el límite IRPF de 11 €

[catering-invoices.ts:181-182](../../../lib/db/queries/catering-invoices.ts#L181) factura con `dish.basePrice` **de hoy**, no con el `Order.price` que se validó contra `limitPerDay` al pedir. Si el catering sube precios a mitad de mes, la factura supera los 11 €/día exentos sin que nadie lo detecte, y regenerar una factura da totales distintos cada vez. **Mejora:** facturar `order.price` + comprobación `line.amount <= limitPerDay` en la generación. **Esfuerzo: M.**

### P0-4 · Numeración de facturas catering duplicable (RD 1619/2012)

[catering-invoices.ts:237-244](../../../lib/db/queries/catering-invoices.ts#L237) — read-then-insert del correlativo sin lock; `Invoice.number` **no tiene `@unique`** (el `@@unique` del modelo es por período, [schema.prisma:916](../../../prisma/schema.prisma#L916)). Dos facturas del mismo catering a la vez (empresas distintas) → mismo número. Además el prefijo es el literal `CATERING-` para todos los caterings. **Mejora:** `@@unique([tenantCatering, number])` + retry `P2002` (patrón ya probado en [admin/billing/actions.ts:253-297](../../../components/admin/billing/actions.ts#L253)); diseñar serie por catering. **Esfuerzo: S (constraint+retry) / M (series).**

### P0-5 · Fallos de infraestructura en flujos de dinero devueltos como 400 + rastro de auditoría "best-effort"

- [app/api/catering/facturas/[id]/pagar/route.ts:69-77](../../../app/api/catering/facturas/[id]/pagar/route.ts#L69) (y 25 rutas más): cualquier `Error` no-Zod → **400 con `error.message` crudo** (esquema Prisma incluido). Un timeout de BD al marcar una factura pagada queda archivado como "error del usuario" e invisible para cualquier monitor de 5xx.
- Settlements y facturas SaaS: `logAudit` va **fuera de la transacción** y se traga sus fallos ([admin/billing/actions.ts:348→357](../../../components/admin/billing/actions.ts#L348), [lib/auth/audit.ts:81-84](../../../lib/auth/audit.ts#L81)) → una liquidación puede quedar PAGADA sin ninguna entrada en `audit_logs`. Contraste: la factura catering sí lo hace bien ([catering-invoices.ts:590](../../../lib/db/queries/catering-invoices.ts#L590)). Suspender un catering no se audita en absoluto.

**Mejora:** 400/422 solo para Zod/negocio, 500 + mensaje genérico para el resto (patrón ya existente en [lib/guards/api.ts:88](../../../lib/guards/api.ts#L88)); mover `auditLog.create` dentro de la tx en mutaciones de dinero. **Esfuerzo: M.**

### P0-6 · GDPR: anonimización irreversible con cierre de solicitud fuera de la transacción

[components/admin/compliance/gdpr/actions.ts:151-185](../../../components/admin/compliance/gdpr/actions.ts#L151) — la anonimización es atómica pero el `gdprRequest.update({status:'RESOLVED'})` queda fuera; si falla, la solicitud sigue PENDING con el usuario ya anonimizado, y el reintento re-anonimiza sobre el email ya anónimo. **Mejora:** meter el update en la misma tx + guarda de idempotencia. **Esfuerzo: S.**

### P0-7 · No existe ningún scheduler: todo lo periódico es manual

Cero cron/BullMQ/instrumentation en el repo. Consecuencias verificadas:
- `LOCKED_AFTER_CUTOFF` se lee en 10 sitios y **no lo escribe nadie** — los pedidos nunca se congelan en BD.
- Facturación mensual = botón de admin; snapshot MRR = botón (y su error se traga: `captureMrrSnapshotAction().catch(() => {})` en [ActualsEditor.tsx:83](../../../components/admin/business-plan/ActualsEditor.tsx#L83)); `RetentionPolicy.lastRun/nextRun` **nunca se escriben**; consolidación de producción se recalcula al abrir la pantalla.

**Mejora:** cron del host (mecanismo ya probado con backups) → endpoints internos `/api/cron/*` con token, o `node-cron` en `instrumentation.ts` con lock en BD. Jobs mínimos: lock-orders-at-cutoff, generate-month-billing, snapshot-mrr, apply-retention, consolidate-production. **Esfuerzo: L.**

### P0-8 · Observabilidad push = 0: sin health, sin alerting, sin error tracking, sin versión

- No hay `/api/health` ni `HEALTHCHECK` en el Dockerfile; Coolify solo mira el puerto.
- [docker-entrypoint.sh:65-67](../../../docker-entrypoint.sh#L65) — si `migrate deploy` falla 3 veces, **arranca igual** con schema viejo (y el healthcheck daría verde).
- Sin `instrumentation.ts`/`onRequestError`/Sentry; 93 `console.*` sin tenantId/userId/requestId; una violación del guard de tenant (el evento más grave del producto) queda en un `console.warn` efímero.
- Imposible saber qué commit corre en prod (sin `SOURCE_COMMIT`/`/api/version`).
- CI corre **en paralelo** al deploy de Coolify (mismo push), no como gate — y `next.config.js` desactiva type-check/lint en build confiando en un CI que no bloquea.
- `BackupEvent` no lo escribe nadie (el check de backups está en WARN crónico); emails sin rastro persistente (si `RESEND_API_KEY` se pierde, todo sigue "funcionando" sin enviar nada); backups solo en el mismo host y restore jamás ensayado.

**Mejora (el 80 % es 1 día):** `/api/health` (SELECT 1 + migraciones pendientes) + `HEALTHCHECK` + UptimeRobot/healthchecks.io + `exit 1` si la migración falla + `ARG SOURCE_COMMIT` → `/api/health` + `instrumentation.ts` con Sentry free tier + deploy vía webhook de Coolify al final del CI. Después: logger `pino` con redacción de PII, `EmailLog`, `INSERT` de `BackupEvent` en el script, rclone a B2, simulacro de restore trimestral. **Esfuerzo: S (día 1) + M (resto).**

### P0-9 · CVEs: `next@15.5.15` y `next-auth@5.0.0-beta.30` acumulan 4 critical + 18 high

`pnpm audit --prod` (2026-08-04): 42 avisos. Los relevantes de runtime:
- **next-auth / @auth/core — 2 CRITICAL** (email normalizer valida antes de normalizar Unicode; errores de configuración en checks de existencia) + HIGH (`getToken()` excepción no capturada con Bearer malformado) + MODERATE (cookies OAuth state/nonce/PKCE sin binding).
- **next@15.5.15 — 8 HIGH** (bypass de middleware/proxy en App Router ×3, DoS con Server Components/Server Actions/connection exhaustion, SSRF en Server Actions y rewrites) + XSS/cache-poisoning moderados. Con el middleware haciendo de gate RBAC, un bypass de middleware es directamente un bypass de authz de sección.
- El resto (postcss, sharp, yaml, esbuild, babel) son transitivas de build/menores.

**Mejora:** subir `next` al último parche de la serie 15 y `next-auth`/`@auth/core` a la beta parcheada (no es la migración a Next 16; es un bump de parche). Añadir `pnpm audit --prod` como gate del CI. Fijar `next-auth` exacto (sin `^`). **Esfuerzo: S.**

---

## Dimensión 1 · Seguridad

### Sólido (verificado hoy)
- Guard de tenant fail-closed con válvula sin redeploy; `prismaAdmin` contenido al ámbito admin (sin fugas a portales).
- Impersonación: solo SUPER_ADMIN real, rol/permisos releídos de BD; revocación de sesión vía `tokenVersion` con revalidación cada 5 min.
- **Sin IDOR encontrado** en rutas `[id]` (ownership validado antes de escribir, PDFs con ACL por tenant+rol).
- Headers de seguridad presentes (CSP, X-Frame-Options DENY, nosniff, HSTS en prod); sin secretos commiteados; Docker no-root sin secretos horneados; bcrypt 12 + anti-timing + tokens de reset SHA-256 un solo uso.
- Sin `req.json()` sin Zod en las rutas revisadas; sin `$queryRawUnsafe` con input de usuario; sin endpoints debug.

### Hallazgos
| P | Hallazgo | Evidencia | Mejora | Esf. |
|---|---|---|---|---|
| P0 | **Rate limit de login evadible con `X-Forwarded-For`**: la clave usa el primer elemento de XFF, que controla el atacante (Traefik añade la real al final). Credential stuffing sin freno; es el único control anti fuerza bruta. | [lib/ratelimit.ts:144-150](../../../lib/ratelimit.ts#L144) | Usar el último elemento de la cadena (o `X-Real-IP` del proxy) + bucket adicional por email solo. | S |
| P1 | **Impersonación sin TTL efectivo**: `expiresAt` no se comprueba en el callback jwt y `/stop` no toca el JWT → una vez iniciada dura hasta 30 días. Hoy latente (la UI no la invoca), estalla al cablear el botón. | [lib/auth/impersonation.ts:150-180](../../../lib/auth/impersonation.ts#L150), lib/auth/config.ts:277,365 | Comprobar `expiresAt` en el callback y restaurar identidad original. | S |
| P1 | **Dos rutas `/api/empleado` derivan tenant de la cabecera `x-tenant-id`** que en `/api` nadie inyecta (el middleware sale antes) y que el cliente controla → hoy dan 500; el patrón es inseguro. | app/api/empleado/pedidos/route.ts:39, cambiar-password:39, [middleware.ts:22](../../../middleware.ts#L22) | `session.user.tenantId`/`getScopedTenantId` en toda ruta API. | S |
| P1 | **Inyección de fórmulas CSV** en los 2 exports (nombres/departamentos van a Excel de Finanzas sin neutralizar `= + - @`). | empresa-pedidos.ts:349, empresa-facturacion.ts:350 | Helper `csvCell()` que prefije `'`. | S |
| P2 | CSP con `'unsafe-inline'` en script-src (no defiende de XSS real). | next.config.js:45 | Nonce por request + strict-dynamic. | M |
| P2 | `/api/empresa/catering/sla` sin `permittedAction` (cualquier rol del tenant lee SLAs). | app/api/empresa/catering/sla/route.ts:11-29 | Añadir permiso + `getScopedTenantId`. | S |
| P2 | Rate limiting solo en 3 endpoints; forgot/reset/invitación/creaciones sin límite; buckets en memoria (se resetean en cada deploy). | lib/ratelimit.ts:112-125 | Cubrir auth públicos; Redis antes de multi-réplica. | S/M |
| P2 | Form demo público: PII de leads a stdout + sin rate limit. | app/(landing)/demo/actions.ts:55 | Persistir en tabla/Resend, quitar log. | S |
| P2 | Upload de documentos valida MIME declarado y no sanea nombre (latente: storage aún ficticio). | app/api/empresa/configuracion/documentos/route.ts:37-88 | Magic bytes + nombre generado en servidor al integrar storage. | S |
| P2 | JWT 30 días; suspender/borrar usuario no incrementa `tokenVersion` (ventana de 5 min, robo de token 30 días). | lib/auth/config.ts:61,337 | `maxAge` 7d + `tokenVersion++` en suspensión/borrado. | S |
| P2 | Escáner de guard con falsos negativos y 97 falsos positivos → falsa sensación de cobertura. | scripts/scan-tenant-guard.mjs:22 | Sustituir por tests contra el guard real (P0-1). | M |

**Pendiente operativo a verificar (no comprobable desde el repo):** que el backfill de PII y la migración de seguridad se ejecutaran en prod (runbook `docs/audits/runbook-produccion-seguridad.md`), y el valor real de `TENANT_GUARD_ENFORCE` en Coolify.

---

## Dimensión 2 · Concurrencia y consistencia

### Sólido (verificado)
- `@@unique` bien puestos: 1 pedido/empleado/día; 1 factura/período; 1 settlement/período; `MrrSnapshot.period`; `DishRating(orderId,dishId)`; `DeliveryProof.orderId`; tokens únicos.
- Transacciones en pedido+historial, entrega+prueba+evento, factura completa, alta de empleado.
- Flujo SaaS ejemplar: retry de correlativo con captura de `P2002`; settlements skip-if-exists; seeds prod con upsert; `migrate deploy` con advisory lock.
- Máquina de estados de factura defendida (PAID solo por su acción; terminales cerrados).

### Hallazgos (además de P0-2/3/4)
| P | Hallazgo | Evidencia | Mejora | Esf. |
|---|---|---|---|---|
| P1 | **Cutoff 11:00 evaluado en TZ del servidor (UTC)**: en verano el cierre real es a las 13:00 de Madrid; se puede cancelar comida ya producida. `Tenant.timezone` existe y nadie lo lee. Sin `ENV TZ` en Docker. | empleado-menus.ts:383-388,599; Dockerfile | Inmediato: `ENV TZ=Europe/Madrid` + test de borde. Bien: cálculo con TZ del tenant + job que marque `LOCKED_AFTER_CUTOFF`. | S/M |
| P1 | **Cuotas de plan check-then-act** (empleados, sedes, empresas/catering): dos altas paralelas superan el límite sin que nada lo revierta. | empresa-empleados.ts:400-410; sedes/route.ts:50-69 | `count` dentro de la tx + `FOR UPDATE`/advisory lock por tenant. | S×3 |
| P1 | **Tokens de un solo uso no atómicos** (reset, invitación, códigos MFA): dos usos paralelos pasan; los backup codes MFA pueden "resucitar" (RMW del array entero). | password-reset.ts:45-57; aceptar-invitacion:57-84; config.ts:150-162 | `updateMany({where:{...,usedAt:null}})` + `count===1`; tabla `MfaBackupCode`. | S/M |
| P1 | **`Order.version` RMW sin lock optimista** y `OrderHistory` sin `@@unique(orderId,version)`: ediciones concurrentes duplican versión y rompen la cadena de integridad L11. | empleado-menus.ts:438; schema:850 | Unique + `update({where:{id,version}})` → traducir `P2025`. | S |
| P1 | **Cancelar factura bloquea el período para siempre** (unique cubre CANCELLED) y regenerar puede recobrar pedidos ya facturados (no filtra `invoiceId:null`). | catering-invoices.ts:69-94,646 | Unique parcial `WHERE status NOT IN (...)` + filtro `invoiceId:null`. | S |
| P1 | `updateCompanyPolicy`: historial y política en 2 ops sin tx → historial fantasma del límite fiscal. | empresa-configuracion.ts:188-209 | Una tx + update condicionado por versión. | S |
| P2 | `P2002` sin traducir en ningún handler (fuga de esquema + UI sin reintento). | (global; único catch: admin/billing) | Helper `translatePrismaError` → 409 de dominio. | S |
| P2 | `generateInvoice`: mes entero en una tx interactiva con timeout default 5 s → `P2028` con empresas grandes. | prisma.ts:25; catering-invoices.ts:51 | `transactionOptions` + lecturas fuera de la tx. | S/M |
| P2 | Nada garantiza un único catering PRIMARY activo por empresa; el pedido coge uno no determinista (`take:1` sin `orderBy`). | empleado-menus.ts:493-500 | Unique parcial `(companyId) WHERE active AND type='PRIMARY'`. | S |
| P2 | Penalizaciones: transición check-then-act sin tx → doble click = 2 notificaciones + 2 audits + `settledAt` pisado (mueve el descuento de mes). | admin/quality/penalties/actions.ts:92-131 | `updateMany` condicional + tx. | S |
| P2 | Mezcla UTC/local en rangos de período (settlements/facturas): estalla justo al fijar `TZ=Europe/Madrid`. | admin/billing/actions.ts:118-119 | Helper único de períodos en UTC + tests con ambas TZ. | S |
| P2 | Seeds de arranque `deleteMany→createMany` sin tx: ventana de permisos/planes vacíos en cada deploy (entitlements fail-closed → 403 transitorios). | seed-rbac-prod.mjs:82; seed-catalog-prod.mjs:67 | Envolver en tx + advisory lock. | S |
| P2 | **Drift de migraciones**: ninguna migración crea `orders/users/tenants/...` (prod nació de `db push`); los `@@unique`/índices futuros del schema **no llegarán a prod** sin baseline. | prisma/migrations/ vs schema | `prisma migrate diff` → baseline `0_init` + `migrate resolve`; verificar en prod los uniques críticos. | M |
| P2 | Entrypoint arranca aunque la migración falle (ver P0-8). | docker-entrypoint.sh:65-67 | `exit 1` en prod. | S |
| P2 | `POST /api/catering/facturas/generar` sin UI, sin rate limit ni idempotency key (materializa el P0-4 vía reintento de red). | catering/facturas/generar | `Idempotency-Key` o advisory lock por (tenant, período). | M |

---

## Dimensión 3 · Escalabilidad y arquitectura de datos

### Sólido (verificado)
- Reputación agrega en BD (`date_trunc`+`groupBy`) — patrón de referencia; KPIs de dashboards con `count/aggregate/groupBy`; series por `$queryRaw`.
- Paginación de servidor real en los listados principales (pedidos, audit, invoices, historial, empleados).
- Middleware edge sin BD; singleton Prisma correcto; sesión JWT sin query por request; sin imports de servidor en cliente.
- Índices multi-tenant base correctos en `Order` y `DishRating`.

### Hallazgos
| P | Hallazgo | Evidencia | Mejora | Esf. |
|---|---|---|---|---|
| P1* | **Pool sin `connection_limit` + dos PrismaClient** (2 pools): con las páginas admin de cientos de queries, 2-3 admins concurrentes agotan el pool (`P2024`). | .env; prisma.ts:26 + prisma-admin.ts:26 | `?connection_limit&pool_timeout` calculados; a medio plazo unificar clientes. | S/M |
| P1* | **`distinct` de Prisma se resuelve en memoria** (sin `nativeDistinct`): dashboards admin traen TODOS los pedidos de 7 días/mes cross-tenant para deduplicar en JS; `getAuditEntities` escanea `audit_logs` entero para un `<select>`. | admin-dashboard.ts:380-422; companies.ts:85-93; admin-audit.ts:82-89 | `groupBy`/`SELECT DISTINCT` en SQL. | M |
| P1* | **N+1 en admin**: `/admin/caterings` ≈ **415 queries** por carga (4 por catering, `pageSize:100` "sin paginación por ahora", filtros en JS); `/admin/empresas` ≈ 94; `/empresa/empleados` +60. | admin/caterings/page.tsx:49-65; companies.ts:279-303 | Una query agregada por métrica (`groupBy` por tenant) + merge en Map (patrón ya existente en catering/empresas) + paginar. | M |
| P1 | **Índices faltantes para queries calientes** (8 concretas): notificaciones del layout (2×/render) sin `(tenantId, read, createdAt)`; pedidos recientes sin `(tenant*, createdAt)`; audit por tenant sin `(tenantId, timestamp)`; producción sin `(tenantCatering, serviceDate, status)`; etc. | activity.ts:91-99; schema:1246-1249… | Declararlos + migración (requiere resolver el baseline del drift). | S |
| P1 | **Soft delete inconsistente: 64 queries sobre `Order` ignoran `deletedAt`** — incluido el **reporte fiscal** (suma pedidos borrados a la base IRPF) y KPIs de admin (cifras distintas entre portales). | empresa-auditoria.ts:52,238; admin-dashboard.ts:104-148; empleado-historial.ts | `$extends` que inyecte `deletedAt:null` por defecto con opt-out; índices parciales. | M |
| P1 | **Fiscal/compliance/factura traen el mes entero a memoria** (`findMany`+`include` sin `take`, reduce en JS); `Invoice.snapshot` embebe miles de pedidos (fila JSON de MB); PDF con `renderToBuffer` bloqueando el event loop. | empresa-auditoria.ts:52-60; catering-invoices.ts:273-296 | Agregados en SQL (`SUM/COUNT FILTER/LEAST(price,11)`); snapshot = totales+hash; PDF en worker/streaming. | M/L |
| P1 | **Cero `unstable_cache`**: el layout de empresa ejecuta ~8 queries por navegación sobre datos que cambian una vez al mes (tenant, branding, entitlements, anuncios). | app/(empresa)/empresa/layout.tsx:20-28 | `unstable_cache` con tags por tenant + `revalidateTag` en mutaciones; adelgazar el include de `getCurrentTenant`. | M |
| P1 | Búsqueda de empleados carga el tenant completo (PII cifrada impide filtrar en SQL) + `distinct` de departamentos en memoria en cada carga. | empresa-empleados.ts:98-137 | Columna de búsqueda determinista (HMAC de tokens); mientras: limitar a campos en claro + `take`. | M |
| P1 | Exports truncados a 10.000 filas **sin aviso** y construidos en memoria. | empresa-pedidos.ts:308-351 | Cursor + streaming, o export como job con enlace por email. | M |
| P2 | Retención/particionado: `AuditLog`, `OrderHistory` (~3 M filas/año con 2 JSON cada una), `Notification` (sin usar `expiresAt`), crecen para siempre. | schema; lib/retention/constants.ts | Job de retención (P0-7) + particionado mensual + archivado frío. | L |
| P2 | Reputación global: 5 `groupBy` sin ventana temporal sobre todo el histórico en cada carga. | ratings.ts:502-531 | Ventana 12 meses o rollup diario. | M |
| P2 | Queries que traen filas para contarlas (`getAvailableMonths` trae todo el historial; producción reescanea el día ×4 pantallas). | catering-operations.ts:35-53; empleado-historial.ts:201 | `groupBy`/`date_trunc`. | S |
| P2 | Estado in-memory que rompe con 2+ réplicas (rate limit, caches de módulo, futuro scheduler). | ratelimit.ts:55; notifications.ts:40-49 | Redis + locks en BD (documentar como precondición de escalar réplicas). | M |
| P2 | React Query montado sin un solo consumidor (~13 kB + expectativa falsa de retry/onError). | providers.tsx:38 | Retirarlo o adoptarlo de verdad. | S |
| P2 | Round-trips secuenciales evitables en dashboards (~14 en `/admin`). | admin-dashboard.ts:263-320 | `Promise.all`. | S |

\* P1 con asterisco = los agentes los marcaron P0 "a escala"; hoy no duelen porque hay pocos datos, pero son lo primero que revienta con el primer tenant activo grande.

---

## Dimensión 4 · Manejo de errores

### Sólido (verificado)
- Flujos multi-entidad críticos transaccionales; email siempre fuera de la tx; `markInvoiceAsPaid` = patrón de referencia (audit intra-tx).
- `lib/email/client.ts` degrada sin romper; `revalidatePath` consistente en 20/23 ficheros de actions.
- Contrato de action bien resuelto en el portal catering (`ActionResult<T>` + `formatZodError`) — el modelo a generalizar.
- `withAuth/withRoles` en `lib/guards/api.ts` ya implementa el formato de error correcto (401/403/500 genéricos)… pero solo lo usan 3 de 52 rutas.

### Hallazgos (además de P0-5/6)
| P | Hallazgo | Evidencia | Mejora | Esf. |
|---|---|---|---|---|
| P1 | **`redirect()` dentro de try/catch**: 11 API routes y ~10 actions capturan `NEXT_REDIRECT` → sesión caducada = HTTP 500 `{"error":"NEXT_REDIRECT"}` o toast literal "NEXT_REDIRECT" en vez de ir al login. Cero referencias a `isRedirectError` en el repo. | api/empresa/pedidos/export:12; catering/platos/actions.ts:37→80 | En API: `auth()` + 401. En actions: re-lanzar `NEXT_*` como primera línea del catch. | M |
| P1 | **3 contratos de Server Action** conviven; el dominante (`throw new Error('Ya está pagada')`) **no funciona en producción**: Next redacta el mensaje y el usuario ve el texto genérico de React. Toda la mensajería de negocio en español solo se ve en `next dev`. | 17 ficheros throw vs 2 contratos de retorno | Estandarizar `ActionResult<T>` con wrapper `withAction()`; documentar en CLAUDE.md. | L (por portales) |
| P1 | **0 error boundaries**: sin `error.tsx`, `global-error.tsx`, `not-found.tsx` ni `loading.tsx` en toda la app → pantalla blanca genérica de Next ante cualquier excepción de RSC. | `find app -name error.tsx` = 0 | 4 ficheros por route-group reutilizando un componente + `global-error`. | S |
| P1 | **9 componentes leen `error.message` de respuestas que traen `error`** → el motivo real del backend (cutoff, límite, duplicado) nunca llega al usuario; siempre sale el literal hardcodeado. Incluye el flujo de pedido (`DaySelector`). | DaySelector.tsx:135; NewIncidentForm.tsx:54… | Helper `readApiError(res)` compartido. | S |
| P1 | **`Number(searchParams)` sin validar en 14 páginas** → `?page=abc` = `skip: NaN` = `PrismaClientValidationError` = pantalla blanca (sin boundary). Los `Math.max(1, NaN)` aguas abajo no protegen. | admin/billing/settlements/page.tsx:50… | `z.coerce.number().catch(1)` o `parsePage()` compartido. | S |
| P1 | **`authorize()` traduce cualquier fallo de sistema a "credenciales incorrectas"** (BD caída, clave PII mal puesta → todos los usuarios ven "email o contraseña incorrectos"). | lib/auth/config.ts:189-197 | Distinguir `system_error` con mensaje propio. | S |
| P1 | `catch { notFound() }` sobre bloques de 285 líneas: cualquier fallo se presenta como "no existe", sin log. | admin/tenants/[id]/page.tsx:35-322 | Query devuelve null → `notFound()` fuera del try. | S |
| P1 | `.catch(() => {})` y resultados de action descartados en botones admin (snapshot MRR, suspender catering, borrar aviso): la UI refresca sin feedback y el admin cree que funcionó. | ActualsEditor.tsx:83; CateringsTable.tsx:82 | Prohibir por ESLint + patrón toast (ya existe en MarkPaidButton). | S |
| P2 | `redirect('/acceso-denegado')` apunta a una ruta inexistente (la real es `/unauthorized`). | app/(empresa)/layout.tsx:23 | Cambiar la ruta. | S |
| P2 | `.parse()` (36) domina frente a `.safeParse()` (2) en fronteras; `request.json()` sin proteger (body malformado = 500 con mensaje del parser); 18 rutas exponen `details: error.errors` completos de Zod; una devuelve `error` como array. | api/**; empresa/incidencias:53 | `safeParse` + `apiError()` único que aplane issues. | M |
| P2 | Resultado de `sendEmail` descartado en alta de empleado/usuario ("creado" aunque la invitación no salió; el remedio manual existe, falta la señal). Sin timeout en Resend (bloquea el alta si va lento). | empresa-empleados.ts:503-508; email/client.ts | Devolver `emailed:` (patrón ya existe en resetPassword) + `AbortSignal.timeout(5000)`. | S |
| P2 | MFA: 3 mutaciones sin `revalidatePath` ni `logAudit`. | app/cuenta/seguridad/actions.ts | Añadir ambos. | S |
| P2 | 0 tests de rutas de error (ningún test ejercita un catch, un status code ni una action fallando). | tests/ | Añadir a la estrategia de testing. | M |

---

## Dimensión 5 · Observabilidad y operación

### Sólido (verificado)
- AuditLog serio: 79 escrituras reales, hash por línea, sobrevive a impersonación, visor cross-tenant.
- Entrypoint: no `db push` en prod, seeds gateados e idempotentes, credenciales enmascaradas.
- `backup-prod.sh` con `set -euo pipefail`, detección de dump vacío y rotación; RUNBOOK con restore reversible y swap con ventana de 48 h.
- CI con Postgres real y 5 gates; guard fail-closed con válvula sin redeploy.

### Hallazgos (además de P0-8)
| P | Hallazgo | Evidencia | Mejora | Esf. |
|---|---|---|---|---|
| P1 | `BackupEvent` no lo escribe nadie → el check de backups está en WARN crónico que nadie mira; cuando el cron muera de verdad, dirá lo mismo que hoy. `PG_CONTAINER` hardcodeado a un id efímero de Coolify. | backup-prod.sh; admin-operations.ts:189-194 | `INSERT` al final del script (o endpoint interno) + resolver contenedor por nombre. | S |
| P1 | Emails sin rastro persistente: 11 puntos de envío, ninguno persiste el resultado; si la API key desaparece, resets/invitaciones/facturas dejan de salir **en silencio total**. | lib/email/client.ts:47-52 | Modelo `EmailLog` escrito en `sendEmail` + check en health si `!isEmailConfigured()` en prod + webhook de bounces. | M |
| P1 | Sin correlación: 0 requestId/traceId; el guard de tenant no persiste violaciones (el evento forense más importante queda en stdout efímero). | middleware.ts; prisma.ts:163-169 | `x-request-id` en middleware + logger con child bindings + guard → tabla `SecurityEvent`/AuditLog. | M |
| P1 | Backups solo en el mismo host (fallo de disco = BD + backups a la vez); restore nunca ensayado. | backup-prod.sh:12; setup-prod-backups.md:90 | rclone a B2 (el comando ya está escrito en el doc) + simulacro trimestral anotado. | S |
| P1 | PII en claro en logs: email en cada request sin tenant (`middleware.ts:112`), formulario demo completo a stdout, destinatarios en logs de email — mientras se cifra la misma PII en BD. | middleware.ts:112; demo/actions.ts:55 | `redact` de pino + loguear ids, no emails. | S |
| P2 | Cobertura de auditoría desequilibrada: pedidos, entregas, rutas, empleados, cambio de política fiscal, MFA y contraseñas **no** auditan; 7 valores de `AuditAction` muertos; `logLogin/logLogout` definidos y jamás llamados. | api/** = 0 logAudit | Cablear el enum muerto + MFA + contraseñas + login. | M |
| P2 | Métricas: cero técnicas; MRR depende de un botón y sobrescribe el cierre del mes si se pulsa tarde. | ActualsEditor.tsx:83-99 | Cron mensual (P0-7) + latencia/status por request desde el logger. | S/M |
| P2 | RUNBOOK cubre el deploy feliz, no el incidente: faltan migración fallida (`migrate resolve`), rollback con migración aditiva aplicada, restore parcial por tenant, incidente de datos con plazos RGPD, y "me han avisado de que algo va mal". | RUNBOOK.md | 4 secciones nuevas + fecha del último simulacro de restore. | M |

---

## Roadmap propuesto

### Fase A — esta semana (todo S, ~2-3 días en total)
1. **Desatascar el guard**: fix de las 3 queries (P0-1) + `prismaAdmin` en forgot-password + verificar `TENANT_GUARD_ENFORCE` en Coolify + smoke test manual de pedido en dev.
2. `@@unique([tenantCatering, number])` + retry en facturas (P0-4) y unique parcial para períodos cancelados.
3. GDPR: cierre dentro de la tx (P0-6).
4. Clave del rate limit sin confiar en XFF del cliente; TTL de impersonación en el callback.
5. `/api/health` + `HEALTHCHECK` + UptimeRobot + `ARG SOURCE_COMMIT` + `exit 1` si migración falla + deploy vía webhook al final del CI.
6. Bump de parche de `next` y `next-auth`/`@auth/core` + `pnpm audit --prod` en CI.
7. `ENV TZ=Europe/Madrid` + test de borde del cutoff.
8. Error boundaries (4 route-groups + global) + `parsePage()` + `readApiError()` + fix `/acceso-denegado`.
9. CSV escaping + quitar PII de logs (demo, middleware).

### Fase B — antes del primer tenant real (M, 2-3 sprints)
1. **Contrato único de `Order.selection`** + migración + facturar `order.price` + test de contrato pedido→factura (P0-2/3).
2. **Scheduler mínimo** (cron host → `/api/cron/*` con token): lock-cutoff, facturación, MRR, retención (P0-7).
3. **Logger estructurado** (pino + redact) + `instrumentation.ts` con Sentry + `apiError()` en las 52 rutas + requestId (P0-5/8).
4. Concurrencia: cuotas en tx, tokens atómicos, lock optimista de pedido + unique de OrderHistory, penalizaciones condicionales, tx en policy.
5. **Baseline de migraciones** (`migrate diff` → `0_init`) y después los 8 índices que faltan + `connection_limit`.
6. `deletedAt` por `$extends` + arreglar el reporte fiscal; N+1 de admin (`groupBy` por tenant) + paginar `/admin/caterings`; `distinct` → SQL.
7. `unstable_cache` en layouts (tenant/branding/entitlements/anuncios).
8. Contrato `ActionResult` + `withAction()` portal a portal; `EmailLog` + `BackupEvent` + off-site B2 + simulacro de restore; RUNBOOK de incidentes.

### Fase C — para escalar (L, con tráfico real)
1. Retención + particionado de AuditLog/OrderHistory/Notification.
2. Redis (rate limit + caché) como precondición de la segunda réplica.
3. Exports en streaming/job; PDF fuera del event loop; búsqueda PII indexada (HMAC).
4. Auditoría del ciclo de vida del pedido + login; métricas técnicas.
5. Ramas dedicadas ya previstas: Next 16, Prisma 7, resolvers 5, ESLint 10.

---

## Decisiones de criterio técnico pendientes (la tesis del artículo)

Estas no las resuelve ningún generador de código; son juicio:

1. **Mecanismo del scheduler**: cron del host + endpoints con token (simple, ya hay precedente con backups) vs `node-cron` en `instrumentation.ts` (autocontenido, necesita lock en BD para multi-réplica). Recomendación: cron del host hoy, diseño de los endpoints ya idempotente.
2. **Series de numeración de facturas**: definir formato por catering (prefijo propio, reinicio anual) — requisito legal, no técnico.
3. **Error tracking**: Sentry SaaS free tier (recomendado por fricción cero en single-replica) vs self-hosted.
4. **Baseline de migraciones**: momento delicado (tocar `_prisma_migrations` en prod); hacerlo antes de necesitar el primer índice nuevo.
5. **React Query**: retirarlo o adoptarlo — decidir, no dejarlo muerto.
6. **Búsqueda sobre PII cifrada**: aceptar búsqueda solo por campos en claro vs índice HMAC (más obra).
7. **Cuándo Redis**: no antes de la segunda réplica, pero sí decidido antes (rate limit, caché, locks).

## Qué NO hace falta rehacer

Para no re-trabajar lo cerrado en 2026-04/07: aislamiento por guard + `prismaAdmin` (decisión RLS→opción A ya tomada y probada), cifrado PII y su backfill, RBAC dinámico y `permittedAction`, impersonación (salvo TTL), máquina de estados de facturas, flujo SaaS de facturación, seeds prod, script de backup (salvo `BackupEvent`/off-site), CI (salvo convertirlo en gate), y la estructura de constraints de pedidos/valoraciones/settlements.
