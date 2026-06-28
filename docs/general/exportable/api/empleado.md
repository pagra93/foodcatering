# API — Empleado

Endpoints para el rol EMPLEADO. 4 endpoints.

Pensados para una futura app móvil nativa. Hoy la UI web usa
principalmente Server Actions; estos endpoints están disponibles por si
se quiere acceder desde un cliente HTTP puro.

## `GET /api/empleado/alergenos`

Devuelve el catálogo de alérgenos + los del propio empleado.

- **Auth**: EMPLEADO.
- **Response**:
  ```json
  {
    "catalog": ["gluten", "lactose", "eggs", "fish", "crustaceans", ...],
    "employeeAllergens": ["lactose", "nuts"],
    "preferences": ["vegetarian"],
    "restrictions": [],
    "blockEnabled": true
  }
  ```

## `POST /api/empleado/cambiar-password`

Cambio de contraseña del empleado.

- **Auth**: EMPLEADO.
- **Body**: `{ currentPassword, newPassword, confirmPassword }`.
- **Validaciones**:
  - Current password coincide (bcrypt compare).
  - New password mínimo 8 chars, mayúscula, número.
  - Confirm match.
- **Side effects**:
  - Actualiza `User.passwordHash`.
  - Invalida otras sesiones del user (rota nonce — pendiente).
  - `logAudit({ action: 'UPDATE', entity: 'User', diff: { password: 'changed' }})`.

## `POST /api/empleado/incidencias`

Reportar incidencia sobre un pedido.

- **Auth**: EMPLEADO.
- **Body**: `{ orderId, type, severity, description }`.
- **Validaciones**:
  - `orderId` pertenece a `session.user.employeeId`.
  - `serviceDate >= hace 7 días`.
  - Tipo está en el catálogo.
- **Side effects**:
  - Crea `Incident` con `reportedBy = user.id`, `status = OPEN`.
  - Cambia `Order.status = ISSUE_REPORTED` si no estaba ya.
  - `logAudit`.
  - Notifica al catering (stub hoy).

## `POST /api/empleado/pedidos`

Guardar/actualizar la selección de pedido para una fecha.

- **Auth**: EMPLEADO.
- **Body**: `{ serviceDate, dishIds: [uuid, uuid, uuid], menuType: FULL|HALF }`.
- **Validaciones**:
  - `serviceDate >= hoy`.
  - `serviceDate` está en `CompanyPolicy.daysActive`.
  - Hora actual < `cutoffTime` del día (para el mismo día).
  - `dishIds` corresponden a `DishSchedule` PUBLISHED del día y del
    catering asignado a la empresa.
  - Alérgenos no conflictivos (si `blockAllergensEnabled`).
  - Precio total ≤ `CompanyPolicy.limitPerDay`.
- **Side effects**:
  - Upsert en `Order` (unique: tenantEmpresa + employeeId + serviceDate).
  - Calcula `price` a partir de `basePrice`/`priceOverride`.
  - Crea `OrderHistory` con `changeReason = USER_EDIT`.
  - `logAudit`.
- **Response**: `{ data: Order }`.

## Endpoints NO expuestos al empleado

Por diseño, el empleado **no** tiene endpoints para:

- Listar otros empleados o pedidos de otros.
- Ver facturas o datos financieros de la empresa.
- Cambiar su rol, email, teléfono, datos de filiación (solo RRHH).
- Borrar pedidos históricos.
- Ver ratings dados por otros.

Intentar acceder a un endpoint de empresa o catering con rol EMPLEADO
devuelve 403.
