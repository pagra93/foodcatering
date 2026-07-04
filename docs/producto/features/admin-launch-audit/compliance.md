# Auditoría de Compliance (`/admin/compliance`)

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-047**
> Estado: **hecho** (2026-07-04) · Rama: `chore/pmx10-v3-migration`
> Commits: `a2a1e6e` (Seguridad) · `2136016` (Visor AuditLog)

## Por qué (auditoría)

Revisión completa de la sección Compliance. El PRD confirma que responde a necesidades reales del
negocio (PRD §T6, §8): RGPD (datos en UE, DPA firmado, minimización), retención fiscal 4 años, derechos
RGPD por usuario, OWASP/pentest para due diligence de clientes grandes, auditoría fiscal IRPF ≤11€/día.
**Ninguna subsección hay que quitarla.**

## Estado por subsección (veredicto)

| Subsección | Estado | Veredicto |
|---|---|---|
| **Auditoría Fiscal** | ✅ Real y **core**: dossier IRPF ≤11€/día por empresa (`FiscalReport`, generado on-demand desde el portal empresa; cálculo en `empresa-auditoria.ts`) | Mantener |
| **Derechos RGPD** | ✅ Real y completo: empleado/empresa crean solicitudes; resolver con dump; **anonimización real** en ERASURE (conserva pedidos por obligación fiscal) | Mantener |
| **DPA** | ✅ Real (alta de acuerdos Art. 28). Vacía en dev por falta de seed; es un registro manual por naturaleza | Mantener |
| **Retención de Datos** | ⏸️ Guarda políticas pero **no las ejecuta** (no hay cron; `lastRun`/`lastDeleted` nunca se pueblan) | **En pausa** (decisión de Pablo): declarativa hasta que exista el cron de operación |
| **Seguridad (OWASP/Pentest)** | ⚠️ Era **fachada**: solo lectura; server actions de escritura huérfanas | **Mejorada** (ver abajo) |

**Gap transversal:** el `AuditLog` es tamper-evident (hash SHA-256) y se escribe de verdad, pero no
había visor consolidado → **añadido**.

## Qué se hizo

### Fase 1 — Seguridad OWASP/Pentest deja de ser fachada (`a2a1e6e`)
- `SecurityManager` (client, patrón `TaxRuleManager`): editar el checklist OWASP Top 10 (estado
  VERIFIED/FAILED/PENDING + evidencia por control) y **subir informes de pentest**, cableando las
  server actions ya existentes (`upsertSecurityCheckAction`/`createSecurityReportAction`, gate
  `security:run-test`). Se retiró el texto stub.
- `prisma/seed-security.ts` idempotente: siembra los 10 controles OWASP (A01–A10) con un ítem
  representativo del sistema (RBAC por tenant, PII cifrada, Zod, hash de integridad, AuditLog…), estado
  PENDING, sin pisar lo editado.

### Fase 2 — Visor de traza de auditoría (`2136016`)
- `getAuditLog` (`lib/db/queries/admin-audit.ts`): cross-tenant, filtros por acción/entidad/ID,
  paginado; resuelve nombre de actor (PII descifrada) y tenant.
- Página `/admin/compliance/audit-log`: filtros + tabla (fecha, actor, acción, entidad, ID, tenant,
  hash corto) + paginación.
- RBAC: permiso `audit-log:view` (portal ADMIN) + seed; regla en `section-permissions`; subítem en el
  sidebar + tarjeta en el índice de Compliance.

## Ficheros clave
- Seguridad: `prisma/seed-security.ts`, `components/admin/compliance/security/SecurityManager.tsx`,
  `app/(admin)/admin/compliance/security/page.tsx`, `components/admin/compliance/security/actions.ts`
  (reutilizado).
- AuditLog: `lib/db/queries/admin-audit.ts`, `app/(admin)/admin/compliance/audit-log/page.tsx`,
  `lib/auth/permission-catalog.ts`, `lib/auth/section-permissions.ts`, `components/admin/AdminSidebar.tsx`,
  `app/(admin)/admin/compliance/page.tsx`.

## Verificación
- `pnpm type-check` + `pnpm lint` limpios, **145 tests verdes**. **Sin migraciones** (tablas ya existían).
- `seed-security.ts` pobló 10 controles OWASP; `seed-rbac.ts` sembró `audit-log:view` en `comidas_dev`.
- Smoke: visor lista 5 logs reales con actor/hash resueltos; crear control OWASP y subir informe desde
  la UI funcionan (dejan traza en AuditLog).

## Deuda consciente (anotada)
- **Retención**: declarativa hasta que exista el cron de operación (decisión de Pablo; el PRD la ubica
  en "Operación"). Ejecutar retención es destructivo → se hará con vista previa + guardas cuando toque.
- **Auditoría Fiscal**: `generatedBy: 'system'` hardcodeado (no el userId real); la query soporta filtro
  por empresa pero la UI solo filtra por año.
- **RGPD**: el dump de datos se entrega como `data:` URL en memoria, no bucket persistente (MVP).
- **DPA**: solo alta (create) desde UI; sin editar/versionar; sin seed.
