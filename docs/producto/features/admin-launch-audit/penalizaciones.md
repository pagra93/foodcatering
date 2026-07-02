# Penalizaciones — detalle, hilo de seguimiento, notificaciones y liquidación

> Feature: `admin-launch-audit` · Épica: **EPIC-003** · Tarea: **HU-040**
> Estado: **hecho** (2026-07-01) · Rama: `chore/pmx10-v3-migration`
> Commits: `f6f50c9` (detalle) · `499fc4c` (hilo + base notif) · `46d590f` (campana in-app) · `75c57e6` (cierre de pendientes)

## Por qué (problema)

Una penalización (`Penalty`) es una sanción económica que **Plati (súper admin)** aplica a un
**catering** por incumplir SLAs (derivada muchas veces de una incidencia). El módulo tenía tres
carencias para lanzar:

1. **No había página de detalle** de la penalización en admin: la fila del listado no llevaba a
   ningún sitio con la información completa ni acciones.
2. **No había canal de comunicación** entre Plati y el catering sobre la sanción (aplicar,
   disputar, resolver) ni **aviso** al catering de que se le había penalizado.
3. **Reglas de negocio a medias**: el plazo de disputa estaba hardcodeado en varios sitios, el
   *timing* de la liquidación no era claro y no se registraba el **origen** de la penalización.

## Qué se hizo

### Detalle de penalización en admin (`f6f50c9`)
- Nueva página `app/(admin)/admin/quality/penalties/[id]/page.tsx` (misma estética que el detalle
  de auditorías, `8232b49`): datos completos + partes implicadas + `PenaltyDetailActions`
  (aplicar/disputar/resolver con server actions). La tabla enlaza a ella.

### Hilo de seguimiento compartido + base de notificaciones (`499fc4c`)
Infraestructura **reutilizable** entre penalizaciones e incidencias:
- **Modelos** `ActivityMessage` (hilo) y `Notification` (campana) en `prisma/schema.prisma`
  (migración aditiva).
- [`lib/notifications.ts`](../../../../lib/notifications.ts): `getEntityParties`,
  `notifyEntityParties` (avisa a todas las partes salvo el autor), `createNotification`,
  `canAccessEntity`. Una penalización involucra **Plati (ROOT) + el catering**; una incidencia
  **ROOT + empresa + catering**.
- [`lib/db/queries/activity.ts`](../../../../lib/db/queries/activity.ts): `getThreadMessages`,
  `getUnreadNotifications`, `getUnreadCount`.
- [`components/shared/activity/ActivityThread.tsx`](../../../../components/shared/activity/ActivityThread.tsx)
  + `actions.ts` (`postMessageAction`): hilo con notas internas (solo Plati) y aviso automático a
  la otra parte al publicar. Integrado en el detalle de penalización e incidencia.

### Notificaciones in-app + campana en los navbars (`46d590f`, Fase D)
- [`components/shared/NotificationBell.tsx`](../../../../components/shared/NotificationBell.tsx)
  (+ `NotificationBellServer`): campana con contador de no leídas y marcar-como-leído. Cableada en
  los navbars de **admin, catering y empresa**.
- Al aplicar una penalización se notifica al catering (server action en
  `components/admin/quality/penalties/actions.ts`).

### Cierre de pendientes: plazo, liquidación y origen (`75c57e6`)
- **Plazo de disputa centralizado** (fin del hardcode duplicado).
- **Timing de liquidación** correcto: la penalización se descuenta en la liquidación del periodo
  correspondiente (`components/admin/billing/actions.ts`).
- **Origen** de la penalización registrado desde `NewPenaltyForm` (p. ej. incidencia asociada),
  visible en el detalle.

## Modelo de datos (referencia)

- `Penalty`: `tenantCatering`, importe, estado (aplicar/disputar/resolver), plazo de disputa,
  origen (incidencia/manual), enlace a liquidación.
- `ActivityMessage` / `Notification`: **compartidos** con incidencias (ver
  [`incidencias.md`](./incidencias.md) Fase 4).

## Verificación

- `pnpm type-check` y `pnpm lint` limpios en todos los commits.
- Migración aditiva (ActivityMessage + Notification) aplicada a `comidas_dev`.
- Flujo: aplicar penalización desde admin → el catering recibe notificación (campana) y puede
  **disputar** desde el hilo → Plati responde/resuelve; el hilo queda como historial + conversación.

## Relación con Incidencias

Penalizaciones e Incidencias **comparten** la misma infraestructura de hilo + notificaciones
(`ActivityMessage`, `Notification`, `notifyEntityParties`, `ActivityThread`, `NotificationBell`).
La Fase 4 de Incidencias (`a483e24`) reutilizó esta base creada aquí. Ver
[`incidencias.md`](./incidencias.md).

## Enlaces

- Detalle: `app/(admin)/admin/quality/penalties/[id]/page.tsx` · `PenaltyDetailActions.tsx`
- Infra compartida: [`lib/notifications.ts`](../../../../lib/notifications.ts) · [`components/shared/activity/`](../../../../components/shared/activity/) · [`components/shared/NotificationBell.tsx`](../../../../components/shared/NotificationBell.tsx)
- Queries: [`lib/db/queries/admin-penalties.ts`](../../../../lib/db/queries/admin-penalties.ts)
