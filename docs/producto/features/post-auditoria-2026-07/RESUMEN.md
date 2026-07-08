# Post-auditoría 2026-07 — Resumen de lo desplegado

Trabajo derivado de la auditoría de seguridad de 2026-07-04
([docs/audits/codebase-audit-2026-07-04.md](../../../audits/codebase-audit-2026-07-04.md)).
Todo lo de abajo está **mergeado a `main`** (PRs #6 y #7).

> Estado: ✅ en `main`. Migraciones se aplican solas en el deploy
> (`prisma migrate deploy` del entrypoint). El guard de aislamiento se activa
> solo (no necesita env var; se apaga con `TENANT_GUARD_ENFORCE=false`).

---

## 1. Fases de remediación (F1–F5)

### F1 · Aceptación de invitación de empleado
- Página `app/(auth)/invitacion` + ruta `app/api/auth/aceptar-invitacion` que
  consumen el token de `UserInvitation`, fijan la contraseña (bcrypt 12) y marcan
  la invitación `ACCEPTED`.
- Email de invitación cableado en `createEmployee` (antes era un TODO); arreglado
  el bug de `companyId` (guardaba el `tenantId`).

### F2 · MFA real (TOTP), opcional para todos
- `User.mfaSecret` (cifrado) + `mfaBackupCodes` (hash). Migración
  `20260708130000_mfa_totp`. Lib `lib/auth/mfa.ts` con **otpauth** + `qrcode`.
- Login pide OTP si el usuario tiene MFA (TOTP o código de recuperación); señal
  al cliente vía `CredentialsSignin.code`. Segundo paso en `LoginForm`.
- Página `app/cuenta/seguridad` (enrolar con QR, ver códigos de recuperación una
  vez, desactivar). Acción admin "Resetear MFA" (recuperación de bloqueo).

### F3 · Facturación anual de planes SaaS
- Enum `SaasBillingCycle`; `Company.billingCycle` + `subscriptionStartedAt`;
  `SaasInvoice.cycle`. Migración `20260708120000_saas_billing_cycle`.
- Un plan anual factura su **precio anual una vez al año, en el mes de alta**
  (helper `lib/billing/cycle.ts` `isAnnualBillingDue`). Selector de ciclo en el
  alta/edición de empresa. El MRR ya normalizaba `yearly/12`.

### F4 · Documentación
- README/CLAUDE.md al día: 56 modelos, ~160 tests, `db:migrate` (no `db:push`),
  `WILDCARD_DOMAIN` real, sin promesas ✅ falsas.

### F5 · Aislamiento por tenant (ver sección 3, quedó como el bloque grande)

---

## 2. Sistema de emails (Resend)

- Módulo reutilizable `lib/email` (cliente Resend con degradación elegante +
  plantillas con layout de marca). Requiere `RESEND_API_KEY`, `EMAIL_FROM`,
  `NEXT_PUBLIC_APP_URL` en Coolify.
- Reset de contraseña real (modelo `PasswordResetToken`, migración
  `20260707110000`, rutas forgot/reset). El reset desde admin/empresa/catering
  envía enlace por email (ya no muestra la contraseña en claro).
- Plantillas: reset, **bienvenida** (cableada al alta de usuario), invitación de
  empleado (cableada, F1), **factura emitida** (al pasar a SENT), **incidencia**
  (al reportar), notificación genérica.
- Admin → **Plantillas de Comunicación**: lista + preview en iframe + "enviar
  test", con badge de estado por plantilla y aviso si falta `RESEND_API_KEY`.

---

## 3. Aislamiento multi-tenant — guard ENFORCED (lo más importante)

**Contexto:** se evaluó activar el bloqueo del guard y también RLS de Postgres.

**Hallazgo clave (probado):** el RLS **automático no es viable con Prisma** — en
una extensión `$allOperations`, la consulta corre en una conexión distinta de
donde se hace `set_config`, así que no puede fijar `app.tenant_id`. RLS solo
funcionaría envolviendo ~300 lecturas en `withTenantContext` (mismo coste que
barrer). **Decisión: opción A — guard a nivel app, enforced.**

**Lo implementado:**
- `prisma.ts` es `server-only`; el frontend quedó **desacoplado de la BD**
  (lo puro se extrajo a `lib/branding/colors`, `lib/incidents/*-ui`,
  `lib/retention/constants`).
- **Guard ACTIVO por defecto**: bloquea lecturas de lista/agregado sobre modelos
  multi-tenant sin filtro de tenant. Escape sin redeploy:
  `TENANT_GUARD_ENFORCE=false`. **Fail-safe**: si algo se escapara, esa vista da
  error, nunca fuga de datos.
- **Exenciones** (`isBoundedLookup`): lecturas acotadas por `id` / `employeeId` /
  `token` (no pueden mezclar tenants). `findUnique` exento. `hasTenantFilter`
  desciende en `AND`/`OR`.
- Fuera de `MULTI_TENANT_MODELS` los modelos sin columna de tenant (OrderHistory,
  OrderRating, DeliveryProof, InvoiceLine, DeliveryRouteSite, ActivityMessage,
  CompanyPolicyHistory) → se aíslan por la tabla padre.
- **`lib/db/prisma-admin.ts`** (cliente sin guard) para lecturas cross-tenant del
  panel admin; ruteados todos los sitios admin (admin-*.ts, caterings, companies,
  catering-assignments, billing/actions, gdpr/actions, funciones globales de
  ratings).
- **Verificación:** barrido runtime de ~90 funciones de lectura (4 portales +
  admin) con el guard encendido → **0 disparos**. Herramienta:
  `scripts/scan-tenant-guard.mjs`.
- **RLS**: migración reescrita para el schema actual y validada, pero **aparcada**
  (`prisma/migrations-parked/`) por si algún día se hace el blindaje a nivel BD.

**Beneficio duradero:** cualquier consulta futura que olvide el filtro de tenant
**peta en dev/CI** antes de producción — el guard es la "memoria".

---

## 4. Otros

- **L10** (fase previa): borrados 8 modelos Prisma muertos.
- **Fix build Docker**: se evitó el doble `pnpm install` en paralelo que tumbaba
  el servidor en el deploy.

---

## 5. Pendientes (backlog, no bloqueante)

- Configurar Resend en Coolify (`RESEND_API_KEY`, `EMAIL_FROM`,
  `NEXT_PUBLIC_APP_URL`) para que los emails salgan de verdad.
- En admin: confirmar `TaxRule` de comida al 10% y asignar plan a las empresas.
- Edición de plantillas de email desde el admin (persistir en BD).
- Facturación anual: cron real (hoy la generación es manual por mes).
- RLS "de verdad" (envolver ~300 lecturas en `withTenantContext`) — solo si se
  quiere blindaje a nivel BD; el guard enforced ya da protección automática.
