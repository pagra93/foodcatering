# Portal Empleado

**Subdominio**: `<empresa>.plati.es` (el mismo que la empresa —
el rol decide qué portal abre).
**Path prefix**: `/empleado/*`
**Rol**: `EMPLEADO`
**Páginas**: 5

## Filosofía de diseño

Mobile-first. El empleado accede principalmente desde su móvil:

- Navbar minimalista arriba (4 items).
- Sin sidebar.
- Cards grandes, botones táctiles.
- Flujo de selección en <30 segundos para la semana completa.

## Layout

Dos layouts:

- `app/(empleado)/layout.tsx` — passthrough (solo valida sesión).
- `app/(empleado)/empleado/layout.tsx` — navbar mobile-first
  (`EmpleadoNavbar`) con: Menús · Historial · Incidencias · Perfil.
  Valida tenant tipo `EMPRESA`.

## Páginas

### 1. Menús semanales

**URL**: `/empleado/menus`
**File**: `app/(empleado)/empleado/menus/page.tsx`

**Página principal del empleado** — la que usa cada semana.

Queries:
- `auth()` — sesión.
- `getTenant()` — info tenant (headers).
- `prisma.employee.findFirst({ where: { userId, tenantId } })` —
  empleado asociado.
- `getWeekMenusForEmployee(employeeId)` — menús de la semana actual
  con platos disponibles, filtrados por alérgenos del empleado si
  `CompanyPolicy.blockAllergensEnabled = true`.

`WeekView` (client) renderiza:
- Saludo: "Hola, [Nombre]".
- Grid de 5 días (L M X J V) si la empresa opera 5 días, o los que
  correspondan según `CompanyPolicy.daysActive`.
- Cada día es una card con:
  - Fecha + día de la semana.
  - Estado: "Pedido confirmado", "Sin pedido", "Bloqueado (post-cutoff)"
    según hora actual y estado del pedido.
  - Miniatura de los platos seleccionados si ya pidió.
  - Botón "Elegir" / "Cambiar" que navega a `/empleado/menus/[date]`.

Skeleton con Suspense para first load.

### 2. Selector de menú por día

**URL**: `/empleado/menus/[date]`
**File**: `app/(empleado)/empleado/menus/[date]/page.tsx`

Queries:
- `getDayMenuForEmployee(employeeId, date)` — platos disponibles para
  ese día (`DishSchedule` con `status = PUBLISHED`, `visibleTo` aplica,
  respeta `blockAllergensEnabled`), más el pedido actual si existe.
- Verifica que `date >= hoy` y respete `CompanyPolicy.daysActive`.

`DaySelector` (client) con:
- Cabecera "Jueves, 30 abr 2026".
- Hora de corte visible: "Puedes cambiar hasta las 11:00".
- Tres secciones: **1º plato**, **2º plato**, **Postre**.
- Cada sección muestra cards horizontales con:
  - Imagen del plato (si hay).
  - Nombre, descripción breve.
  - Badges de alérgenos con color (rojo si conflicto, naranja si
    presente pero el empleado no es alérgico, gris si no contiene).
  - Nutrición resumida (kcal) si configurada.
  - Precio (lo que paga el empleado = `copayEmployee` × `price`).
- Botón de selección por plato (radio, solo uno por sección).

Al pulsar **"Confirmar pedido"**:
- Valida que haya al menos 1º y 2º (postre opcional según `MenuType`).
- Llama a Server Action `saveOrderAction(date, dishIds)`:
  1. Verifica cutoff (no post-11:00 del `date`).
  2. Calcula `price` final (copay).
  3. Upsert en `Order` (unique key
     `tenantEmpresa, employeeId, serviceDate`).
  4. Estado: `DRAFT` → `CONFIRMED` tras confirmación.
  5. Crea `OrderHistory` con `changeReason = USER_EDIT`.
  6. `logAudit()`.
  7. `revalidatePath('/empleado/menus')`.

### 3. Historial

**URL**: `/empleado/historial?month=&status=&search=&page=`
**File**: `app/(empleado)/empleado/historial/page.tsx`

Queries:
- `getOrderHistoryKPIs(employeeId)` — stats del empleado.
- `getOrderHistory({ employeeId, filters })` — paginado.
- `getAvailableMonths(employeeId)` — lista de meses con pedidos.

`HistorialKPIs`:
- Gasto total (todas las fechas).
- Gasto último mes.
- Gasto este mes.
- Nº total de pedidos.

`HistorialFilters`:
- Mes (dropdown con meses disponibles).
- Estado.
- Búsqueda (nombre de plato, ID).

`HistorialTable`: fecha, platos, precio, estado, acciones (ver detalle
del pedido — mismo componente que en empresa pero con permisos limitados).

### 4. Incidencias

**URL**: `/empleado/incidencias`
**File**: `app/(empleado)/empleado/incidencias/page.tsx`

Queries:
- `getEmployeeIncidents(employeeId)` — sus incidencias.
- `getEmployeeIncidentStats(employeeId)` — stats.
- `prisma.order.findMany({ where: { employeeId, serviceDate: { gte: hace7dias } } })`
  — pedidos recientes sobre los que puede reportar.

`IncidentsStats`: abierto, en progreso, resuelto, cerrado.

`IncidentsList`: lista con fecha, tipo, estado.

`ReportIncidentButton`: abre dialog para reportar incidencia nueva.

`ReportIncidentDialog` (client):
- Selector de pedido (últimos 7 días).
- Tipo de incidencia (catálogo).
- Descripción.
- Severidad sugerida.

Server Action: `createEmployeeIncident(data)` — crea `Incident` con
`reportedBy = user.id` + audit.

### 5. Perfil

**URL**: `/empleado/perfil`
**File**: `app/(empleado)/empleado/perfil/page.tsx`

Queries:
- `getEmployeeProfile(employeeId)` — datos.
- `getEmployeeMonthlyHistory(employeeId, months=6)` — histórico 6
  meses para gráfica.

3 tabs:

1. **Información** (`ProfileInfo`):
   - Nombre (descifrado), email, teléfono.
   - Empresa, sede, departamento.
   - Número empleado, fecha alta.

2. **Estadísticas** (`ProfileStats`):
   - Gráfica barras: gasto mensual últimos 6 meses (Recharts).
   - Ratings dados vs recibidos.
   - Plato favorito (el más pedido).

3. **Configuración** (`ProfileSettings`):
   - Preferencias dietéticas (`AllergenSelector`): checkboxes de
     alérgenos, preferencias (vegan, vegetarian, etc.), restricciones.
   - Actualiza `Employee.dietPrefs`.
   - Cambio de contraseña — endpoint `POST /api/empleado/cambiar-password`.

## APIs específicas del portal

Ver [../api/empleado.md](../api/empleado.md).

- `GET /api/empleado/alergenos` — alérgenos configurados.
- `POST /api/empleado/cambiar-password` — cambio de contraseña.
- `POST /api/empleado/incidencias` — reportar incidencia.
- `POST /api/empleado/pedidos` — guardar selección (alternativa a
  Server Action por si se usa desde una futura app móvil).

## Lo que NO puede hacer el empleado

- Ver pedidos de otros empleados.
- Ver datos agregados de la empresa (no tiene acceso a facturación,
  no ve cuánto gasta la empresa total, etc.).
- Cambiar su propia política (copays, límites) — eso es RRHH.
- Cambiar de catering — eso es admin empresa.
- Borrar pedidos históricos — solo cancelar pre-cutoff.
- Editar información personal básica (nombre, email, teléfono) —
  solo RRHH puede. Esto es intencional para mantener la integridad de
  registros fiscales.

## Flujo completo típico del empleado (lunes a viernes)

**Lunes 9:00** — notificación por email "Ya tienes menús para esta semana".
Click → `/empleado/menus`.

**Lunes 9:02** — ve los 5 días, ninguno tiene pedido. Pulsa "Elegir"
en lunes → `/empleado/menus/2026-05-04`.

**Lunes 9:03** — selecciona 1º (Gazpacho), 2º (Merluza), postre (Yogur).
Confirma. Vuelve a la vista semanal. El lunes ya aparece como "Pedido
confirmado".

**Lunes 9:04** — repite para martes, miércoles, jueves. El viernes no
pide porque tiene reunión fuera.

**Lunes 10:58** — notificación "Tu pedido del lunes se cerrará en
2 min, revisa". Ignora porque ya está bien.

**Lunes 11:00** — cron cierra el pedido (`LOCKED_AFTER_CUTOFF`). Si
intentara cambiarlo, error.

**Lunes 13:15** — recibe la comida en su sede. Come.

**Lunes 14:00** — notificación "¿Qué te ha parecido tu menú?". Entra y
valora (4/5 en sabor, 5/5 en porción). Alimenta `OrderRating`.

**Miércoles 12:30** — la comida llega fría. Va a `/empleado/incidencias`,
pulsa "Reportar incidencia" sobre el pedido del día, tipo "cold_food",
severidad MEDIUM. El catering la recibe en su portal, la asigna, la
resuelve (compensación: reembolso del copay empleado).

**Viernes 17:00** — navega a `/empleado/perfil` para ver el gasto del
mes. Ve su gráfica, ajusta su `monthlyLimit` si tiene permiso (algunos
planes no lo permiten).

## Detalles de implementación importantes

- **Cutoff validation**: la Server Action vuelve a verificar cutoff
  server-side. Si el empleado intenta forzar vía DevTools, el servidor
  rechaza (`OrderCutoffError`).
- **Bloqueo de alérgenos**: si `CompanyPolicy.blockAllergensEnabled =
  true` y `Employee.dietPrefs.allergies` incluye un alérgeno que el
  plato tiene en `labels`, el plato NO aparece en el selector (ni
  siquiera tachado). Decisión deliberada: evitar que el empleado se
  tiente.
- **Visibilidad por empresa**: un `DishSchedule` puede tener
  `visibleTo = {companies: [...]}`. Si la empresa del empleado no está
  en la lista, el plato no se muestra.
- **Unique order por fecha**: índice único garantiza que un empleado
  tenga max 1 pedido por fecha. Un segundo confirm reemplaza el primero
  (con historial).
