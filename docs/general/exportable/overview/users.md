# Los usuarios de Plati

La plataforma tiene **4 tipos de usuario** organizados en **14 roles RBAC**.
Cada uno entra por su propio portal y ve solo lo que necesita.

## Mapa 10 000 metros

| Portal | Subdominio ejemplo | Tipos de tenant | Roles que entran |
|---|---|---|---|
| Súper Admin | `admin.plati.es` | ROOT | `SUPER_ADMIN`, `AUDITOR` |
| Empresa | `acme.plati.es` | EMPRESA | `ADMIN_EMPRESA`, `RRHH`, `FINANZAS`, `MANAGER_SEDE`, `EMPLEADO` |
| Catering | `deliciasexpress.plati.es` | CATERING | `ADMIN_CATERING`, `CHEF`, `COCINERO`, `REPARTIDOR`, `FINANZAS_CATERING` |
| Empleado | `acme.plati.es` (mismo subdominio que empresa) | EMPRESA | `EMPLEADO` |

> Empleado no tiene subdominio propio: entra por el subdominio de **su
> empresa**. El portal se elige por rol tras el login (ver `getDashboardPath`
> en `lib/auth/permissions.ts`).

---

## 1. Súper Admin (Plati)

**Quién**: Equipo operativo de Plati. Son los "dueños" de la plataforma.

**Qué quiere conseguir**:

- Onboarding de nuevas empresas y nuevos caterings.
- Detectar caterings con problemas (documentos expirados, alta tasa de
  incidencias) antes de que escalen.
- Cobrar la comisión a tiempo y tener visibilidad financiera global.
- Ayudar a un tenant concreto cuando pide soporte (entrar en su portal
  con permiso para reproducir el problema — **impersonación**).

**Cómo lo consigue en la plataforma**:

- Dashboard con KPIs globales: empresas activas, caterings activos,
  pedidos hoy, incidencias abiertas, facturado del mes, tasa de
  adopción agregada.
- CRUD de tenants (genérico), empresas (específico), caterings
  (específico con wizard), usuarios.
- Módulo "Docs por Caducar" y "Incidencias Críticas" para triage
  proactivo.
- Botón "Impersonar" en detalle de usuario — entra a su portal con
  sesión de 15 min auditada, banner naranja siempre visible, un solo
  clic para salir y volver a su sesión original.

**Roles**:

- `SUPER_ADMIN` — puede todo (wildcard `*:*`). Típicamente 1-3 personas.
- `AUDITOR` — solo lectura sobre todos los tenants. Para auditores
  externos o equipos de compliance sin poder de modificación.

---

## 2. Empresa (cliente B2B)

**Quién**: El cliente que paga. Son empresas (pymes a grandes corporativos)
que ofrecen comida subvencionada a sus empleados como beneficio.

Dentro de una empresa hay varios perfiles:

### 2.a ADMIN_EMPRESA

**Quién**: Director de Personas / People Ops / responsable del beneficio.

**Qué quiere conseguir**:

- Configurar la política: cuánto pagamos (copay empresa), cuánto pone
  el empleado (copay empleado), en qué días se sirve, hora de corte,
  regla de no-show (cobrar, no cobrar, parcial).
- Tener un dashboard que le diga cuántos empleados usan el beneficio
  (adopción), cuánto se gasta, si hay incidencias abiertas.
- Cambiar de catering si el actual no cumple SLA (Plati asiste).
- Firmar el contrato y subir documentación.

### 2.b RRHH

**Quién**: Equipo de RRHH que gestiona altas y bajas.

**Qué quiere conseguir**:

- Dar de alta empleados: uno a uno o import CSV.
- Asignar cada empleado a una sede (`CompanySite`) para que el reparto
  sepa dónde entregar.
- Registrar alergias y preferencias dietéticas de cada empleado — estas
  se traducen en bloqueo de alérgenos automático en el selector.
- Dar de baja empleados al salir (soft-delete con `deletedAt`, el
  histórico se preserva para auditoría fiscal).
- Mandar invitaciones a empleados nuevos para que se den de alta en el
  portal (`EmployeeInvitation` con token de un solo uso).

### 2.c FINANZAS

**Quién**: Contabilidad de la empresa.

**Qué quiere conseguir**:

- Ver la factura mensual del catering con desglose línea por línea.
- Exportar a CSV para cargar en el ERP (SAP, Sage, A3, etc.).
- Tener el reporte fiscal mensual (`FiscalReport`) con ratio de
  deductibilidad, pedidos sobre límite, pedidos sin justificante — todo
  lo que necesita para justificar ante Hacienda.
- Conciliar pedidos ↔ factura (módulo "Conciliación" en
  `/empresa/facturacion`).

### 2.d MANAGER_SEDE

**Quién**: Responsable de una sede específica (ej: "Madrid — Gran Vía").

**Qué quiere conseguir**:

- Ver solo los empleados y pedidos de su sede (alcance restringido).
- Reportar incidencias locales (comida llegó tarde, faltaron paquetes).
- Validar las entregas si el catering no tiene proof digital.

### 2.e EMPLEADO

Ver sección 3.

---

## 3. Empleado

**Quién**: El que se come la comida. Persona trabajando en una empresa
cliente de Plati.

**Qué quiere conseguir**:

- Elegir menú de la semana de forma rápida (menos de 30 segundos
  idealmente). Ver fotos si el catering las subió, ver alérgenos
  codificados con color, ver calorías si el plato las tiene.
- No tener que pensar si pedí para el jueves o no — la app le recuerda
  antes del cutoff.
- Marcar alergias una vez y que el sistema le **oculte** los platos
  conflictivos (no simplemente avise).
- Ver cuánto gastó este mes y comparar con su límite personal
  (`monthlyLimit`, opcional por empleado, o el de la empresa si no está
  seteado).
- Reportar una incidencia (llegó frío, no era lo que pedí, faltaba
  postre) en un clic.
- Valorar el menú (sabor, porción, presentación) para que el catering
  mejore.

**Flujo típico**:

1. Lunes 9:00 — recibe notificación "Ya tienes menús disponibles".
2. Entra al portal (link directo desde la notificación), ve los 5 días
   laborables con 3 opciones cada uno (1º + 2º + postre).
3. Selecciona. Ve al instante cuánto le costará (`copayEmployee`) y
   cuánto paga la empresa.
4. Lunes 11:00 — cutoff. Puede cambiar la selección del martes al
   viernes, pero el lunes ya está locked.
5. Lunes 13:00 — recibe la comida en su sede. Valora.

**Restricción importante**: el empleado **no ve** otros empleados ni
datos de la empresa. Su scope es solo él (`employeeId` en queries).

---

## 4. Catering (proveedor B2B)

**Quién**: Empresa de restauración colectiva que cocina y reparte. Puede
tener un cliente o varios simultáneamente.

### 4.a ADMIN_CATERING

**Quién**: Dueño o director del catering.

**Qué quiere conseguir**:

- Mantener catálogo de platos actualizado (50-200 platos típicamente).
- Publicar menú semanal a tiempo (cada domingo para la semana siguiente).
- Configurar zonas de reparto, ventanas de cocina, días operativos,
  capacidad diaria.
- Ver KPIs: adopción, puntualidad, incidencias, rating medio.
- Subir documentación: Registro Sanitario, RC, Manipuladores.
- Cobrar factura mensual.

### 4.b CHEF

**Quién**: Jefe de cocina o responsable de producción.

**Qué quiere conseguir**:

- Ver la consolidación del día: "hoy tengo que cocinar 45 × Gazpacho,
  38 × Merluza al horno, 30 × Yogur".
- Pantalla tipo KDS (Kitchen Display System) en tablet fullscreen,
  con refresco automático cada 30s.
- Gestionar stock: si se acaba un plato a mitad de semana, ocultar
  `DishSchedule` para que nadie más lo pida.
- Ver métricas de calidad: ratings, incidencias por tipo, compensaciones
  pagadas.

### 4.c COCINERO

**Quién**: Cocinero de línea.

**Qué quiere conseguir**:

- Acceso de solo lectura a Kitchen Display.
- No tocar nada que no sea "marcar plato listo" cuando termina una
  tanda.

### 4.d REPARTIDOR

**Quién**: Persona que conduce la ruta y entrega a las empresas.

**Qué quiere conseguir**:

- Ver su ruta del día en móvil — lista de paradas ordenadas, botones
  grandes, un tap para abrir Google Maps.
- Confirmar cada entrega: hora, receptor (si aplica), foto/firma si es
  el modo configurado.
- Reportar incidencias in-situ (sede cerrada, cliente no estaba, paquete
  dañado).
- Ver solo **su** ruta, no las de otros repartidores.

### 4.e FINANZAS_CATERING

**Quién**: Contabilidad del catering.

**Qué quiere conseguir**:

- Ver cuánto le va a facturar cada empresa este mes (en tiempo real, no
  esperar al cierre).
- Emitir las facturas el día 1 (cron automático, pero aprobación
  manual).
- Registrar cobros, gestionar morosidad.
- Exportar para su propio ERP.

---

## Matriz de permisos (resumida)

| Acción | SUPER | AUDIT | ADM_E | RRHH | FIN_E | MGR | EMP | ADM_C | CHEF | COC | REP | FIN_C |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Ver dashboard global | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| Crear tenant | ✅ | — | — | — | — | — | — | — | — | — | — | — |
| Impersonar | ✅ | — | — | — | — | — | — | — | — | — | — | — |
| Crear empleado | ✅ | — | ✅ | ✅ | — | — | — | — | — | — | — | — |
| Editar política empresa | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — |
| Ver pedidos empresa | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | — | — | — | — | — | — |
| Ver factura recibida | ✅ | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — |
| Seleccionar menú | — | — | — | — | — | — | ✅ | — | — | — | — | — |
| Reportar incidencia (empresa) | — | — | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — |
| Crear plato | — | — | — | — | — | — | — | ✅ | ✅ | — | — | — |
| Publicar menú semanal | — | — | — | — | — | — | — | ✅ | ✅ | — | — | — |
| Ver Kitchen Display | — | — | — | — | — | — | — | ✅ | ✅ | ✅ | — | — |
| Confirmar entrega | — | — | — | — | — | — | — | ✅ | — | — | ✅ | — |
| Generar factura | — | — | — | — | — | — | — | ✅ | — | — | — | ✅ |

Leyenda: ✅ = puede, — = no puede, ◐ = solo su sede (Manager).

Matriz completa en `lib/auth/permissions.ts`. Se consulta con
`hasPermission(role, 'tenants:create')` que soporta wildcards (`tenants:*`
implica `tenants:read`, `tenants:create`, etc.).
