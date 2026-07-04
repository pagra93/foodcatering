# Auditoría de Branding (`/admin/templates` — Plantillas y Branding)

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-048**
> Estado: **hecho** (2026-07-04) · Rama: `chore/pmx10-v3-migration`
> Commits: `a4be91e` (white-label) · `7a0c514` (admin edición + índice) · `b4fc876` (Avisos en-app)

## Por qué (auditoría)

Revisión de la sección "Plantillas y Branding". De 4 páginas, **solo Branding era real** (y a medias);
índice, Comunicación y Avisos eran placeholders "Próximamente".

**Hallazgos:**
- **Branding por tenant**: el editor de *defaults del sistema* guardaba de verdad, pero la tabla por
  tenant era **solo lectura** (existía `overrideTenantBrandingAction` **huérfana**). Y el branding se
  aplicaba **solo a la navegación** (favicon + logo + color en sidebar/navbar); los botones/enlaces del
  contenido usaban el `--primary` fijo (tomate) de `globals.css`, ignorando el tenant. Las CSS vars
  `--brand-*` se inyectaban pero **nadie las consumía**. Seeds demo guardaban el color en un JSON
  (`config.branding`) que el sistema **nunca leía**.
- **Comunicación** y **Avisos**: placeholders de modelos inexistentes.
- **Índice**: placeholder "Próximamente" sin navegación.

**Decisiones de Pablo:** white-label a **todo el portal**; **construir Avisos en-app**; Comunicación
(email/SMS) se deja para después.

## Qué se hizo

### Fase 1 — White-label real (`a4be91e`)
`lib/branding/index.ts`: nuevo `hexToHslTriple` y `buildBrandingStyle` ahora emite, además de
`--brand-*`, las variables del tema shadcn ligadas al tenant (`--primary`, `--primary-foreground`,
`--ring`, `--secondary`/`-foreground`) en HSL. Como el `style` se inyecta en el wrapper de los layouts
empresa/catering/empleado, **cascada a todos los componentes** → botones/enlaces/foco toman el color del
tenant, no solo la navegación. El admin/landing (sin `style` de tenant) siguen en tomate Plati. + tests.

### Fase 2 — Admin: edición por tenant + índice real (`7a0c514`)
- `TenantBrandingManager` (tabla + dialog por fila) cablea `overrideTenantBrandingAction`
  (gate `template-branding:edit`): el super admin edita el branding de cualquier tenant desde el admin.
- `/admin/templates` deja de ser placeholder → panel con tarjetas de navegación.
- Seed: Demo Empresa/Catering guardan el color en la columna `primaryColor` (no en `config.branding`).

### Fase 3 — Avisos en-app (`b4fc876`)
- Modelo `Announcement` (severity INFO/WARNING/CRITICAL, audience ALL/EMPRESA/CATERING/EMPLEADO,
  startsAt/endsAt, dismissible, active) + migración `20260704160000_announcements`.
- Queries `getAnnouncements` / `getActiveAnnouncements(portal)`; actions upsert/toggle/delete
  (gate `announcement:create/edit/publish`, audita, revalida layouts).
- Admin CRUD `/admin/templates/announcements` (`AnnouncementManager`) — sustituye el placeholder.
- `AnnouncementBanner` (descartable por localStorage) inyectado en los 3 layouts de portal.

## Ficheros clave
- White-label: `lib/branding/index.ts`, `tests/unit/lib/branding.test.ts`.
- Admin branding: `app/(admin)/admin/templates/{page,branding/page}.tsx`,
  `components/admin/templates/branding/TenantBrandingManager.tsx`,
  `components/shared/branding/actions.ts` (`overrideTenantBrandingAction`, reutilizada).
- Avisos: `prisma/schema.prisma` + migración, `lib/db/queries/admin-announcements.ts`,
  `components/admin/templates/announcements/{AnnouncementManager,actions}`,
  `app/(admin)/admin/templates/announcements/page.tsx`, `components/shared/AnnouncementBanner.tsx`,
  layouts `app/(empresa|catering|empleado)/**/layout.tsx`.

## Verificación
- `pnpm type-check` + `pnpm lint` limpios; **149 tests verdes** (145 + 4 de branding). Migración de
  `Announcement` aplicada a `comidas_dev` + cliente regenerado + `pnpm dev` reiniciado.
- White-label: un portal de tenant con color no-tomate tiñe también los botones del contenido; el admin
  sigue en tomate.
- Avisos: crear un aviso activo para EMPRESA → banner en el portal empresa; descartar lo oculta; fuera de
  fechas/inactivo no aparece (smoke verificado).

## Deuda consciente (anotada)
- **Comunicación (email/SMS/WhatsApp)**: sigue como placeholder — feature mayor aparte (modelo
  `CommunicationTemplate` + proveedor de envío).
- **`secondaryColor`**: ahora se emite como `--secondary` del tema, pero pocos componentes lo usan; su
  impacto visual es menor que el de `--primary`.
- **`customCss`**: descartado (no existe como campo ni se planea inyectar CSS libre por seguridad).
- El **preview** del `BrandingEditor` de los portales es una simulación local (no el portal real).
