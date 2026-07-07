# Auditoría adversarial exhaustiva — comidas / Plati

**Fecha:** 2026-07-04 · **Rama:** `chore/pmx10-v3-migration` · **Método:** fan-out de 6 auditores por dominio (API, Server Actions, aislamiento Prisma, dinero/planes, RBAC, auth/impersonación) + verificación independiente línea a línea de todos los CRÍTICOS. Toolchain ejecutado: `type-check` ✅, `lint` ✅, `vitest` ✅ (16 files / 149 tests).

> Documento sin commitear — el mantenedor decide si entra en git.

Cada hallazgo lleva ID estable, `file:line`, escenario concreto y marca **CONFIRMED** (trazado) / **PLAUSIBLE** (sospechado).

---

## 1. Mapa del sistema (para verificar mi entendimiento)

**Qué es:** SaaS multi-tenant Next.js 15 (App Router) + React 19 + Prisma 5 + Postgres + NextAuth v5. Cuatro portales bajo route-groups: `(admin)` ROOT, `(empresa)`, `(catering)`, `(empleado)`, más `(landing)` público. 63 modelos Prisma. 48 rutas API, ~31 Server Actions.

**Rutas de ejecución reales:**
- **Páginas (Server Components):** `middleware.ts` corre → autentica vía `lib/auth/edge` → aplica enforcement por sección (`section-permissions.ts`) → **inyecta `x-tenant-id`/`x-tenant-type` desde la sesión** sobreescribiendo lo que trajera el cliente → la página lee el tenant con `getCurrentTenant()`/`getTenant()` (que leen esos headers).
- **API (`/api/*`):** **el middleware hace `return NextResponse.next()` inmediatamente** (`middleware.ts:22`). No hay inyección de tenant ni gate de auth. Cada ruta debe autenticar y resolver tenant por su cuenta. El helper correcto es `getScopedTenantId(req)` (valida header contra sesión). El helper peligroso es `getTenant()`/`getCurrentTenant()` (confía en el header, que en `/api` es del cliente).
- **Mutaciones:** Server Actions (POST endpoints). El gate correcto es `permittedAction(session.permissions, role, 'perm', legacyRoles)`.
- **Permisos:** en teoría DB-backed (catálogo `permission-catalog.ts` → tablas `Role`/`Permission` → `resolveUserPermissions` → `session.permissions[]` → `permitted()`/`permittedAction()`). En la práctica **conviven cuatro autoridades** (ver Tensión 1).

**Invariantes clave (declaradas):** toda query multi-tenant filtra por `tenantId`/`tenantEmpresa`/`tenantCatering` salvo SUPER_ADMIN; PII cifrada en columnas `*Enc`; AuditLog inmutable; comisión sobre base imponible; ≤11€/día exención IRPF. **Cuáles se cumplen de verdad:** ver hallazgos — varias no.

---

## 2. Hallazgos por severidad

### 🔴 CRÍTICOS

#### C1 — Token de impersonación falsificable → takeover total (cualquier usuario → SUPER_ADMIN de cualquier tenant)
`lib/auth/config.ts:141-165` · **CONFIRMED**
El callback `jwt` con `trigger === 'update'` copia `session.impersonationToken.{targetUserId,targetRole,targetTenantId}` directo al token **sin comprobar que el token actual sea SUPER_ADMIN** y sin verificar que el payload lo emitió el servidor. `session` es 100% controlado por el cliente vía `useSession().update(...)` (expuesto como `useAuth().refresh`, `hooks/use-auth.ts:11`).
**Escenario:** un `EMPLEADO` autenticado llama `update({ impersonationToken: { targetUserId:'<id de un super admin real>', targetRole:'SUPER_ADMIN', targetTenantId:'<cualquiera>', originalUserId:'x', expiresAt: 9e12 } })`. El callback fija `token.role='SUPER_ADMIN'`, `token.tenantId=<cualquiera>` y `token.permissions = resolveUserPermissions(superAdminRoleId,'SUPER_ADMIN')` → `['*']`. Aun apuntando a su propio id, el string `role='SUPER_ADMIN'` basta: `middleware.ts:87` salta todo enforcement y `getScopedTenantId` (`session.ts:141`) concede cross-tenant. La guarda existe en `startImpersonation()` pero **no es ahí donde se acuña el token** — es en este callback, que no valida nada.
**Fix:** mover la transición de privilegio a servidor; dentro del callback validar `token.role==='SUPER_ADMIN'` *antes* de honrar cualquier target, re-derivar `targetRole` de BD, rechazar target SUPER_ADMIN, ignorar `originalUserId/targetRole` del cliente.

#### C2 — `GET /api/empresa/facturacion/export`: exportación cross-tenant, sin auth, de PII en claro + financiero
`app/api/empresa/facturacion/export/route.ts:10-33` · **CONFIRMED** (triple defecto)
La ruta **no llama a `auth()`** y deriva el tenant solo de `getTenant()` (header `x-tenant-id`, controlado por el cliente porque el middleware no corre en `/api`). Además no comprueba permiso (`emp-billing:export`) ni la feature de pago `data-export`.
**Escenario:** petición **sin sesión** `GET /api/empresa/facturacion/export?year=2026&month=1&format=GENERIC` con header `x-tenant-id: <uuid empresa víctima>` + `x-tenant-type: EMPRESA` → devuelve el CSV ERP completo de la víctima: nombres de empleados (en claro, ver C4), emails, importes. Único requisito: conocer el UUID del tenant. Contrasta con `empresa/pedidos/export/route.ts` que sí usa `getScopedTenantId` + `permittedAction`.
**Fix:** `getRequiredSession()` + `permittedAction(...,'emp-billing:export',...)` + `getScopedTenantId(request)` + `companyHasFeature(ent,'data-export')`.

#### C3 — Seis Server Actions de admin escriben sin ninguna comprobación de auth
`components/admin/caterings/actions.ts:22,70` · `app/(admin)/admin/empresas/[id]/edit/page.tsx:15` · `.../empresas/new/page.tsx:16` · `.../caterings/[id]/edit/page.tsx:11` · `.../caterings/new/page.tsx:11` · **CONFIRMED**
Todas son `'use server'` exportadas que mutan por id-desde-args e importan solo `prisma`/`zod` — cero `auth()`/`permittedAction`. La única "defensa" es `getRequiredSession()` en el *componente página* (solo protege el render GET), más el middleware. Pero el middleware para estas secciones solo exige `<recurso>:view`, y el rol **AUDITOR** (read-only por diseño) tiene todos los `:view`; además el middleware **se salta el enforcement si `permissions[]` está vacío** (`middleware.ts:89`), así que cualquier sesión con JWT legacy pasa.
**Escenario:** un AUDITOR abre `/admin/caterings` (pasa `catering:view`) y el cliente llama `setCateringStatus('<cualquier catering>','SUSPENDED')` → suspende el tenant. O `addCateringDocument` forja un `REGISTRO_SANITARIO` "VÁLIDO" en cualquier catering. O `updateCompanyAction` reescribe el copago empresa/empleado (`CompanyPolicy.copayCompany/copayEmployee/limitPerDay`). O `createCateringAction`/`createCompanyAction` provisiona tenants fantasma.
**Fix:** `requireSuperAdmin(permittedAction(...,'catering:edit'|'empresa:edit'|...))` al inicio de cada acción, como ya hacen los módulos `actions.ts` hermanos.

#### C4 — La PII no está cifrada: columnas `*Enc` guardan texto plano; `encryptPII`/`decryptPII` son código muerto
`lib/crypto/pii.ts:50,64` (nunca invocadas) · escrituras en claro: `components/{empresa,catering}/configuracion/usuarios/actions.ts:75`, `lib/db/queries/empresa-empleados.ts:401,502`, `app/api/empresa/empleados/[id]/route.ts:177` · **CONFIRMED**
`encryptPII`/`decryptPII` existen pero **no se llaman en ningún write ni read** (el único fichero que las referencia es `pii.ts`). Todas las escrituras hacen `nameEnc: data.name` (texto plano), y los filtros de búsqueda usan `nameEnc: { contains: search }` — que **solo funciona porque el valor es plano** (no puedes hacer substring sobre ciphertext). El comentario "cifrado en futuro" lo confirma.
**Impacto:** nombres y teléfonos (PII, RGPD) en claro en BD y en respuestas/exports; el nombre `nameEnc` **miente** (un dev asume que está protegido); `PII_ENCRYPTION_KEY` no se usa; el README declara "✅ Cifrado columnar para PII". Combinado con C2 = fuga cross-tenant de PII en claro.
**Fix:** decidir estrategia (cifrado determinista/buscable o cifrado + índice de búsqueda aparte) y cablear `encryptPII`/`decryptPII` en todos los write/read, o retirar la promesa y renombrar las columnas.

---

### 🟠 ALTOS

#### H1 — Rol ROOT a medida sobre `baseRole=SUPER_ADMIN` con cero permisos → `['*']` (escalada)
`lib/auth/resolve-permissions.ts:17-29` · **CONFIRMED**
Si `roleId` existe pero el rol tiene 0 filas `RolePermission`, `rps.length>0` es false y **cae al fallback estático** → `if (role==='SUPER_ADMIN') return ['*']`. Un rol pensado para ser *restrictivo* (creado sobre SUPER_ADMIN, sin marcar permisos) se vuelve *omnipotente*. Variante latente: `rps.length >= ALL_PERMISSION_KEYS.length` (`:22`) colapsa a `['*']` con un check de **conteo**, no de igualdad de conjunto.
**Fix:** con `roleId` presente y 0 perms → devolver `[]` (fail-closed); quitar el atajo `SUPER_ADMIN→['*']` para roles con `roleId`; cambiar `>=` por igualdad de conjunto.

#### H2 — Usuarios creados por tenant reciben `roleId=null` → lockout de su propio portal
`components/catering/configuracion/usuarios/actions.ts:75` y `components/empresa/configuracion/usuarios/actions.ts:71` (omiten `roleId`; admin sí lo pone, `admin/users/actions.ts:93`) · **CONFIRMED**
Al login, `resolveUserPermissions(null, role)` → mapa **estático** (`dishes:*`, `employees:*`…). El middleware evalúa claves **de catálogo** (`dish:view`, `emp-order:export`…). `dish ≠ dishes` → `permitted()` false → `/unauthorized` en todas las secciones regladas del propio portal; los Server Actions también fallan.
**Escenario:** un admin crea un ADMIN_CATERING desde "Usuarios"; ese usuario entra y no puede acceder a platos/menús/rutas/facturas de su propio catering.
**Fix:** mapear `baseRole → Role.id` y setear `roleId` en ambas acciones.

#### H3 — Facturas de comida cargan 21% IVA fijo (debería ser 10% hostelería)
`lib/db/queries/catering-invoices.ts:23` (`FACTURABLE_TAX_RATE = 0.21`, aplicado en `:214,:248`) · **CONFIRMED**
El sistema siembra un `TaxRule` `IVA_COMIDA = 10%` (`seed-demo.ts:76`) que el generador de facturas de comida **nunca consulta**. El flujo SaaS sí lee `TaxRule` (`billing/actions.ts:177`) → inconsistencia, y comida es el equivocado.
**Escenario:** €1.000 de menús → IVA €210 / total €1.210 en vez de IVA €110 / total €1.110. **Cada factura de comida sobrecarga ~€100 por €1.000 y es legalmente incorrecta.**

#### H4 — El informe fiscal IRPF pone a 0 el día completo si supera 11€ (en vez de topar en 11€)
`lib/db/queries/empresa-auditoria.ts:87-91,126-128` · **CONFIRMED**
`deductibleOrders = orders.filter(o => price <= 11)` y por empleado `if (price<=11) deductible += price`. El Art. 42.3 LIRPF exime los primeros 11€/día y solo tributa el exceso.
**Escenario:** día de 13€ → informe cuenta **0€** deducible + 13€ no deducible; correcto: 11€ deducible + 2€ exceso. El artefacto de compliance estrella del producto es materialmente erróneo para todo día >11€, y contradice la propia calculadora de landing (`lib/landing/irpf.ts:78`, que sí lo hace bien). (El límite `<=11` en sí es correcto: 11,00 exento, 11,01 no.)

#### H5 — Base de la comisión catering→Plati incluye facturas DRAFT y CANCELLED/VOID → sobrecobro
`components/admin/billing/actions.ts:79-83` · **CONFIRMED**
El `aggregate` de `subtotal` no filtra por `status`, pero `generateInvoice` crea todo como DRAFT y las canceladas conservan `subtotal`.
**Escenario:** SENT €5.000 + CANCELLED €3.000 en un periodo → comisión 5% × €8.000 = €400 en vez de €250 (el catering sobrepaga €150 por una factura anulada). El dashboard `getAccountsOverview` sí excluye DRAFT/CANCELLED → dashboards y cobro real discrepan.

#### H6 — Sin rate limiting en login (fuerza bruta / credential stuffing)
`lib/auth/config.ts:57-118` · **CONFIRMED**
`authRateLimiter` está definido en `lib/ratelimit.ts` pero **nunca se referencia** desde el provider de credenciales. Adivinación ilimitada contra `/api/auth/callback/credentials`. (Solo `impersonationRateLimiter` está cableado, y su clave viene de `x-forwarded-for` spoofable.)

#### H7 — Sin revocación de sesión: usuario deshabilitado/borrado/degradado sigue válido hasta 30 días
`lib/auth/config.ts:42-45` (maxAge 30d) + callback `jwt`/`session` sin lookup a BD salvo login/update · **CONFIRMED**
`status != ACTIVE`, soft-delete, cambio de rol/permiso/tenant o cambio de contraseña **no invalidan** JWTs existentes. Un empleado despedido o un admin degradado conserva sus privilegios (y su tenant) hasta que caduque el token.

#### H8 — Acciones bajo impersonación se auditan como la víctima, no como el admin
`lib/auth/config.ts:149` + `lib/auth/audit.ts:41-57` · **CONFIRMED**
Al impersonar, `token.id = targetUserId`, así que todo `logAudit({ actorId: session.user.id })` registra al usuario impersonado. Solo los eventos start/stop llevan `originalUserId`. Fallo de no-repudio (agravado por C1). La afirmación "auditoría completa" de `IMPERSONATION.md` solo aplica a start/stop.

#### H9 — Sistémico: aislamiento tenant solo en capa de aplicación, sin backstop
`lib/db/prisma.ts:28-117` · **CONFIRMED (design gap)**
La guarda `$use` corre **solo en `NODE_ENV===development`** (`:99`), **solo `console.warn`** (`:110`), **solo en lecturas** (`READ_ACTIONS`, sin update/delete/upsert). `withTenantContext` (`:134`) es un no-op (RLS no habilitado en ningún entorno). La migración RLS está *parked* (`prisma/migrations-parked/20260419000000_enable_rls_multi_tenant`) esperando adopción de `withTenantContext`, que tiene **0 call-sites**. Además `MULTI_TENANT_MODELS` está desactualizada: referencia `EmployeeInvitation` (modelo renombrado a `UserInvitation`) y **omite** DishRating, Penalty, Settlement, SaasInvoice, MenuTemplate, DeliveryZone, GdprRequest, DpaAgreement, UserInvitation, ActivityMessage, etc. Una query sin filtro en cualquiera de esos ni siquiera avisa. Es la raíz que hace que C2 y cualquier futuro olvido sean fugas.

---

### 🟡 MEDIOS

- **M1 — PATCH de estado de factura salta la guarda de doble-pago / sin máquina de estados.** `app/api/catering/facturas/[id]/route.ts:84-92` acepta cualquier `status` (incl. PAID) y lo escribe sin transición ni `paidAt`. `markInvoiceAsPaid` sí guarda; PATCH es una puerta paralela. Permite PAID→DRAFT→PAID y "pagada" sin `paidAt`. **CONFIRMED.**
- **M2 — Plan inactivo = acceso libre + sin factura.** `getCompanyEntitlements` (`lib/plans/entitlements.ts:47-86`) no comprueba `saasPlan.active`; `generateMonthBillingAction` solo factura planes activos → empresa con plan desactivado mantiene features/cuotas y deja de recibir facturas SaaS (pérdida silenciosa de ingresos). **CONFIRMED.**
- **M3 — Planes anuales mal facturados.** Solo se usa `plan.monthlyPrice` (`billing/actions.ts:210`); un plan anual (`monthlyPrice=0, yearlyPrice=1490`) genera facturas de €0 mientras el dashboard MRR (`admin-billing.ts:151`) reporta €124/mes. **CONFIRMED.**
- **M4 — Empresa sin plan = fail-open (cuotas ilimitadas + sin facturar).** `defaultEntitlements()` devuelve límites `null` (=ilimitado) para `saasPlanId=null`, y la facturación salta esas empresas. Las cuotas fallan *abiertas* mientras las features fallan *cerradas*. **CONFIRMED.**
- **M5 — Modo mantenimiento nunca se invoca (fail-open).** `lib/auth/maintenance-check.ts:19` documentado como "llamado en cada layout", pero **cero callers**. Una `MaintenanceWindow` no bloquea a nadie. **CONFIRMED.**
- **M6 — Reset de contraseña roto (endpoints inexistentes).** `forgot-password/page.tsx:49` y `reset-password/page.tsx:51` hacen POST a `/api/auth/forgot-password` y `/api/auth/reset-password`, que **no existen** (solo el catch-all `[...nextauth]`). Feature de autoservicio no funcional. **CONFIRMED.**
- **M7 — Enumeración de usuarios por timing en login.** `config.ts:76` retorna `null` antes de bcrypt si el email no existe; `:88` corre `bcrypt.compare` si existe → diferencia de tiempo medible. **CONFIRMED.**
- **M8 — Enumeración cross-catering de menús.** `app/api/empresa/catering/menus/route.ts:9-29` solo `getRequiredSession()`; `cateringId` del query sin verificar asignación → cualquier usuario lee menús PUBLISHED de cualquier catering. **CONFIRMED** (IDOR sobre `cateringId`, dato de baja sensibilidad).
- **M9 — Resolución de incidencia/compensación sin authz.** `app/api/catering/incidencias/[id]/route.ts:22-40` solo autentica; un REPARTIDOR puede PATCH `status:'COMPENSATED', compensationAmount:9999` en su tenant. Scope tenant ok (sin fuga), pero falta `permittedAction`. **CONFIRMED.**
- **M10 — Endpoints de producción confían en `legacyRoles` más amplios que el rol de catálogo.** `app/api/catering/produccion/{cocina,empaquetado,etiquetas}/route.ts:25-31` listan COCINERO en `allowedRoles`, pero el COCINERO de catálogo no tiene esos write-perms. Con JWT legacy (perms vacíos) marca ready/packed e imprime etiquetas. **CONFIRMED** (ventana = sesiones legacy).
- **M11 — Capa de guards con vocabulario estático = mina.** `lib/guards/api.ts` (`requirePermission`/`withPermission`) y `lib/guards/PermissionGuard.tsx` usan `hasPermission` contra el mapa estático, ignorando `permissions[]` DB. `PermissionGuard` cablea claves inexistentes (`orders:create`, `employees:write`); `hasPermission('SUPER_ADMIN','orders:create')` es **false** → bloquearía al super admin. Hoy latente (poco usado), landmine para quien lo adopte. **CONFIRMED.**
- **M12 — Feature-gates de pago no aplicados en servidor.** `data-export`, `advanced-analytics`, `api-access` sin `companyHasFeature` en ruta/acción — solo ocultos en UI. **CONFIRMED** (ver también C2).

---

### 🔵 BAJOS / robustez

- **L1 — bcrypt cost = 10** (`empresa-empleados.ts:403`, `cambiar-password:81`) — por debajo del 12 recomendado. **CONFIRMED.**
- **L2 — MFA decorativo:** `mfaEnabled` fluye a la sesión pero no se exige en ningún sitio. **CONFIRMED.**
- **L3 — Contraseñas temporales devueltas en claro** en `resetPasswordAction` y hermanas (auth/authz/tenant ok; TODO de MVP sin email). **CONFIRMED.**
- **L4 — Cancelar factura bloquea re-facturar el periodo + P2002 sin manejar.** `@@unique([tenantCatering,tenantEmpresa,period])` sin status en la clave (`schema.prisma:949`); `generateInvoice` implica regenerar tras cancelar pero `create` lanza P2002 → 500 y ese periodo queda infacturable. **CONFIRMED.**
- **L5 — Carreras check-then-insert en cuotas** (empleados `empresa-empleados.ts:369-380`, sedes `sedes/route.ts:51-54`) sin constraint en BD. **PLAUSIBLE.**
- **L6 — Bordes de mes UTC vs local** en penalizaciones/periodos (`billing/actions.ts:110-116` UTC vs `firstDayOfNextMonth` local; `invoice.ts:285-289`). Si el contenedor no corre UTC, gap/solape en el borde. **PLAUSIBLE.**
- **L7 — Cascadas destruyen evidencia fiscal.** `DeliveryProof.order onDelete: Cascade` (`schema:1258`) + `RetentionPolicy` con `entity=Order, mode=HARD` (`schema:1674`) → un purge HARD sobre Order borra el justificante de entrega. Latente (no hay hard-deletes hoy). **PLAUSIBLE.** → `onDelete: Restrict` o forzar SOFT.
- **L8 — `assignDriverToRoute` actualiza ruta por id sin verificar propiedad** (`catering-routes.ts:285-307`), a diferencia de `updateRoute`. Sin callers hoy; landmine copy-paste. **PLAUSIBLE.**
- **L9 — Selección de platos del pedido no acotada al catering del empleado** (`empleado-menus.ts:386-392`): `dish.findMany({ where:{ id:{ in } } })` sin filtro de restaurante. Rompe integridad de menú (no fuga de datos protegidos). **PLAUSIBLE.**
- **L10 — Modelos muertos:** `DeliveryEvent`, `KitchenSheet`, `PackingSheet`, `DailySnapshot`, `CompanyExport`, `Webhook`, `WebhookDelivery`, `Integration` (0 refs). `DailySnapshot` (compliance fiscal) nunca se genera. **CONFIRMED.**
- **L11 — `OrderHistory` no se escribe en el flujo de pedido del empleado** (`empleado-menus.ts` create/cancel), solo en el de empresa → trazabilidad/versionado inconsistente en la ruta de mayor volumen. **CONFIRMED.**
- **L12 — Consultas sin `take`** que agregan en JS sobre tablas que crecen (`ratings.ts:90,263,480`, `catering-calidad.ts:24`, varios `order.findMany`). Acotadas por periodo/tenant hoy; degradan a volumen. **PLAUSIBLE.**
- **L13 — `env.example` (trackeado en git) expone IP real del Postgres dev** `5.78.124.107:5432` (host+puerto+usuario+db). Recon de infra. **CONFIRMED.**
- **L14 — Directorio `app/api/debug/env/` vacío** (sin `route.ts`). Housekeeping. **CONFIRMED.**
- **L15 — `session.ts#requirePermission` sin bypass SUPER_ADMIN ni fallback legacy** — bloquearía a un super admin con JWT legacy (inconsistente con middleware). Sin usar hoy. **CONFIRMED.**
- **L16 — Implementaciones de wildcard divergentes:** `permissionsInclude`/`hasPermission` (`permissions.ts:170,191`) hacen `slice(0,-2)` dejando el prefijo **sin los dos puntos** → `emp-config:*` casaría `emp-config-user:view` (over-match); `permitted()` (`section-permissions.ts:154`) casa exacto. Latente (el path DB nunca guarda `recurso:*`). **CONFIRMED (latent).**

---

### 📄 DOCS / DX (drift confirmado)

- **D1** — README "schema Prisma con 34 modelos" (`README.md:213`) — **real: 63**.
- **D2** — CLAUDE.md "6 suites, 51 tests" (`CLAUDE.md:142`) — **real: 16 files / 149 tests**.
- **D3** — README describe estructura inexistente (`app/(auth)/(tenant)/`, `components/features/`, `components/layouts/`) — real: `(admin)(empresa)(catering)(empleado)(landing)`, `components/{admin,empresa,catering,...}`.
- **D4** — README "Seed inicial (TODO)" (`:116`) — **seed totalmente implementado** (`prisma/seed.ts` + `db:seed` funcional).
- **D5** — README enseña `pnpm db:push` como paso de setup (`:84`) — CLAUDE.md lo **prohíbe** por destructivo (preferir `migrate deploy`). El onboarding enseña el camino peligroso.
- **D6** — `WILDCARD_DOMAIN`: README `.comida.localhost` vs `env.example` `.localhost:3000`.
- **D7** — README marca ✅ features **no implementadas**: "Cifrado columnar para PII" (C4), "Snapshots diarios firmados" (L10, sin writer ni cron), "Retención 4 años" (`admin-retention.ts` tiene política pero **sin purge/deleteMany**), "Tests E2E de aislamiento" (el test de aislamiento es *unit*, `tests/unit/auth/scoped-tenant.test.ts`; el `e2e/example.spec.ts` es el de plantilla).
- **D8** — `package.json` `"prepare":"husky install"` — `husky install` deprecado en husky v9.

---

## 3. Tensiones de diseño (lo estructural, no la línea)

1. **Cuatro autoridades de permisos, dos vocabularios disjuntos.** Path DB (catálogo singular `dish:view`, `emp-order:export`) vs path estático (`PERMISSIONS` map + `hasPermission` + `lib/guards/*` + `PERMISSION_DESCRIPTIONS`, plural `dishes:*`, `orders:read`). No intersectan. Raíz de C4-adyacente H2, H1, M10, M11. **Alternativa:** eliminar el mapa estático, `hasPermission`, `PermissionGuard` y `guards/api.ts#requirePermission`; una sola fuente = catálogo + `permitted()`; fallback = fail-closed.

2. **Aislamiento tenant sin red de seguridad.** RLS *parked*, `withTenantContext` no-op con 0 adopción, guarda `$use` dev-only/read-only/no bloqueante con lista obsoleta. Un `where` olvidado = fuga (C2 lo demuestra). **Alternativa:** habilitar RLS (las policies ya están escritas) o convertir `$use` en middleware bloqueante, activo en prod, con lista derivada del schema y cobertura de writes.

3. **El middleware no cubre `/api` y falla abierto.** Salta todo en `/api` (obligando a cada ruta a re-implementar auth, y muchas divergen a `getTenant()` por header → C2), y desactiva enforcement con `permissions[]` vacío (JWT legacy bypassa secciones → habilita C3, M10). **Alternativa:** wrapper de auth compartido para rutas API (`withApiAuth`); eliminar el fallback legacy tras forzar re-login.

4. **Features "grado compliance" que son fantasmas de schema mientras se venden como hechas.** PII cifrada (C4), DailySnapshot firmado (L10), purga de retención, `integrityHash`/`OrderHistory` en el flujo del empleado (L11). El *value prop* fiscal del producto (trazabilidad, cifrado, snapshots firmados, retención) está en gran parte sin implementar. **Alternativa:** condicionar los ✅ del README a implementación real; priorizar el cierre de la cadena de compliance o ajustar la promesa.

5. **La transición de privilegio de impersonación vive en un callback dirigido por el cliente, no en servidor.** Las guardas están en la capa equivocada (`startImpersonation` valida, pero no es quien acuña el token). **Alternativa:** acuñar el token de impersonación en servidor con la identidad del admin del *token actual verificado*, y que el callback solo lo consuma tras validar firma/origen.

---

## 4. Brechas de expectativa (esperaba X, encontré Y)

- Esperaba que el middleware inyectara el tenant en toda petición; **encontré** que se salta `/api` por completo → el header es del cliente allí.
- Esperaba que `nameEnc`/`phoneEnc` estuvieran cifradas; **encontré** texto plano y un módulo de cripto muerto.
- Esperaba que crear un admin de catering funcionara; **encontré** que el nuevo usuario queda bloqueado de su propio portal (`roleId=null`).
- Esperaba que `pnpm db:push` (README) fuera el camino bendecido; **encontré** que CLAUDE.md lo prohíbe como destructivo.
- Esperaba tener que implementar `db:seed` ("TODO" en README); **encontré** que ya está completo.
- Esperaba que las facturas de comida usaran el `TaxRule` de comida (10%) que la app siembra; **encontré** 21% hardcodeado.
- Esperaba que impersonar requiriera ser super admin; **encontré** que cualquier usuario puede auto-elevarse vía `update()`.
- Esperaba que AUDITOR fuera estrictamente read-only; **encontré** que puede suspender tenants, forjar documentos de compliance y crear tenants.

---

## 5. Preguntas abiertas (solo el mantenedor puede responder)

1. Empresa con `saasPlanId=null`: ¿tier gratuito intencional o misconfiguración? Determina si M4 (cuotas ilimitadas fail-open) es bug o feature.
2. ¿AUDITOR debe poder alcanzar acciones de escritura de admin, o es estrictamente read-only? Fija la severidad exacta de C3.
3. ¿El contenedor Coolify corre en UTC? Determina si L6 (bordes de mes) se dispara en prod.
4. ¿El mapa estático `PERMISSIONS` se retiene a propósito para algo, o es legacy a eliminar?
5. ¿Kitchen/Packing/DailySnapshot/Webhook/Integration son roadmap o abandonados? (decidir keep-or-drop; L10)
6. ¿Se probó RLS alguna vez en dev? ¿Quién es el owner y cuál el plan para "des-parkearla"?
7. ¿La estrategia de PII buscable admite cifrado (índice aparte) o se aceptó plano a sabiendas? (C4)

---

## Ranking global de remediación

1. **C1** (takeover impersonación) — antes de cualquier deploy.
2. **C2** (export sin auth cross-tenant PII+financiero) — antes de cualquier deploy.
3. **C3** (6 acciones admin sin auth).
4. **C4 / H9 / Tensión 2** (PII en claro + sin backstop de aislamiento).
5. **H1/H2** (escalada por rol vacío + lockout por `roleId=null`).
6. **H3/H4/H5** (IVA comida, IRPF por día, base de comisión) — dinero/compliance recurrente.
7. **H6/H7/H8**, luego MEDIOS y BAJOS.
