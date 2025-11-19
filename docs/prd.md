# 13. Estructura del sistema (para todos) + Anexo técnico (para CTO)

## 13.1. Idea clave en una frase

Una **única plataforma** con “portales” personalizados por empresa y por restaurante (cada uno en su **subdominio**), donde cada persona ve **solo lo que necesita** según su rol (empleado, RRHH/finanzas, restaurante o admin). Todo se guarda con **trazabilidad diaria** para cumplir fiscalidad y simplificar contabilidad.

---

## 13.2. Cómo lo usa cada rol (sin tecnicismos)

- **Empleados (portal de su empresa, p. ej. `tuempresa.comida.com`)**
    
    Entran, eligen qué días quieren menú, pueden cancelar hasta las 11:00 y consultan su historial.
    
    Objetivo: **cómodo y claro**.
    
- **RRHH/Finanzas (mismo portal de empresa)**
    
    Activan empleados, fijan el presupuesto diario (≤ 11 €), deciden si hay copago, descargan la **factura mensual** y el **CSV** para contabilidad.
    
    Objetivo: **control, ahorro de tiempo y cumplimiento**.
    
- **Restaurantes (su portal, p. ej. `lacocina.comida.com`)**
    
    Reciben el listado diario, preparan, entregan, marcan entregado y suben su factura.
    
    Objetivo: **previsibilidad y simpleza**.
    
- **Admin de la plataforma (`admin.comida.com`)**
    
    Homologa restaurantes, supervisa calidad, ve incidencias y avala el cumplimiento fiscal.
    
    Objetivo: **que todo fluya y cumpla**.
    

---

## 13.3. Qué datos se guardan y por qué

- **Quién pidió qué y cuándo** (empleado, fecha, restaurante, estado).
- **Precio del menú** (siempre ≤ 11 € para exención fiscal).
- **Entregas y cancelaciones** (prueba ante Hacienda).
- **Facturas y resúmenes** (para contabilidad y auditorías).

Esto permite:

1. justificar la exención de IRPF, 2) descargar una factura clara, 3) importar un CSV al ERP **sin trabajo manual**.

---

## 13.4. Seguridad y privacidad (explicado simple)

- Cada empresa y cada restaurante tienen su **portal aislado** por subdominio.
- Solo ves los datos de tu empresa o tu restaurante.
- Los datos viajan **cifrados** y se guardan **en Europa**.
- Guardamos el histórico **4 años** por obligación fiscal.

---

## 13.5. Qué pasa cada día (ciclo real)

1. Empleado selecciona los días que va a comer y que que quiere de comida→ queda registrado.
2. Hasta las **11:00** puede cancelar → no se cocina de más.
3. A las **11:05** el restaurante recibe lista cerrada.
4. Entrega 12:00–13:30 en una tanda.
5. Marca “entregado” → queda la **trazabilidad**.
6. Si algo falla, se reporta y se gestiona en **< 1h**.

---

## 13.6. Qué pasa cada mes (facturación/contabilidad)

- El restaurante sube su **factura** (IVA 10 %), la plataforma la valida y la empresa la descarga.
- La empresa recibe un **informe** con: total consumos, por empleado, por sede, aportes (empresa/empleado), **CSV** listo para su ERP.
- Si hay **copago**, se genera el dato para descontarlo en nómina.

---

## 13.7. Ventajas de esta estructura (sin tecnicismos)

- **Súper simple**: todo en un único sitio con portales personalizados.
- **A prueba de inspecciones**: cada comida es un registro validable.
- **Sin duplicidades**: una sola fuente de verdad.
- **Escalable**: añadir empresas o restaurantes no complica la vida.
- **Personalizable**: cada empresa ve su marca/colores si se quiere.

---

## 13.8. ¿Por qué no hacemos “tres apps”?

Porque es **más caro, más lento y más frágil**. Con una **única plataforma multi-tenant**:

- Mantenemos un código limpio,
- Reducimos errores,
- Y personalizamos por subdominio sin duplicar nada.

---

## 13.9. Resumen para negocio

Piénsalo como **un edificio con varias entradas** (subdominios).

Cada puerta lleva a un **piso distinto** (empresa, restaurante, admin).

Dentro, cada persona entra solo a su **habitación** (rol) y ve lo que necesita.

El **conserje** (la plataforma) lo registra todo para que **Hacienda y Contabilidad** estén tranquilos.

---

# 13.T — Anexo técnico para CTO

### T1. Tenancy y routing

- **Dominio wildcard** `.comida.com` → **un único despliegue**.
- Middleware detecta subdominio → resuelve `tenant_id` y **tipo** (`empresa` / `restaurante` / `admin`).
- Todo request lleva `tenant_id` en contexto (auth + DB).
- Theming por tenant (CSS variables + assets por ID).

### T2. Roles y permisos

- Roles: `empleado`, `rrhh`, `finanzas`, `chef` (rest.), `admin`.
- Autenticación: **JWT** (NextAuth/OAuth).
- Autorización: **guards** por rol y **filtro por tenant** en cada endpoint y consulta DB.
- **Matriz de permisos**:
    - `empleado`: `/menus:read`, `/pedidos:create|cancel|read-own`.
    - `rrhh/finanzas`: `empleados:crud`, `config:write`, `reports:read`, `facturacion:read`.
    - `chef`: `pedidos:read-tenant`, `pedidos:deliver`, `facturas:upload`.
    - `admin`: global `read/write` + auditoría.

### T3. Datos y modelo (PostgreSQL, multi-tenant lógico)

Tablas mínimas (todas con `tenant_id` donde aplique):

- `tenants(id, subdomain, type, config)`
- `users(id, tenant_id, role, email, password_hash)`
- `employees(id, tenant_id_empresa, user_id)`
- `restaurants(id, tenant_id_restaurante, docs)`
- `menus(id, restaurant_id, date, items, price)`
- `orders(id, employee_id, tenant_empresa, restaurant_id, date, status, price)`
- `invoices(id, restaurant_id, tenant_empresa, period, total, file)`
- `incidents(id, order_id, type, severity, status)`
- `audit_logs(id, actor, action, entity, timestamp, hash)`

**Índices** por `(tenant_id, date)`, `(restaurant_id, date)` y `(employee_id, date)`.

### T4. API y jobs

- **REST** para operaciones transaccionales; **GraphQL** opcional para reporting.
- Endpoints clave: `/auth`, `/menus`, `/orders`, `/invoices`, `/reports`, `/restaurants`.
- **Jobs (BullMQ/Redis)**:
    - 11:05 → consolidación y envío de pedidos al restaurante.
    - Cierre mensual → generación de facturas + CSV ERP.
    - Recordatorios (lunes 08:00 y diarios 09:30).
    - Verificación documental y caducidades.

### T5. Integraciones

- **ERP**: export **CSV** estándar (A3, Sage, SAP, Odoo). API REST si se pide.
- **Nóminas**: fichero de copagos (empleado/mes) para descuento.
- **Comunicación**: email/WhatsApp/Teams (providers intercambiables).
- **Pagos**: si intermedias liquidaciones, Stripe Connect / transferencia SEPA.

### T6. Seguridad, compliance y DR

- **RGPD**: datos en UE, DPA firmado, minimización de datos.
- **Cifrado**: TLS, secretos en vault, PII en reposo cifrada (column-level si necesario).
- **Auditoría**: `audit_logs` con hash y marcas de tiempo (firma lógica).
- **Retención**: 4 años (exigencia fiscal).
- **Backups**: diarios, 30 días, test de restauración mensual.
- **SLA/objetivos**: uptime ≥ 99,9 %, TMR soporte < 2 h, incidencias < 2 %.
- **Rate limiting** y **WAF** (Cloudflare).

### T7. Observabilidad y calidad

- **Sentry** (errores), **Prometheus/Grafana** (métricas), logs centralizados.
- **Testing**: unitarios + integración + E2E (Playwright/Cypress).
- Pruebas específicas de **aislamiento tenant** (no data leak).
- **Feature flags** para activar módulos por tenant.

### T8. Performance y caching

- **Next.js 15 + RSC** para paneles con datos.
- **React Query/Zustand** para caché cliente.
- **Redis** para caché por tenant (menús del día, theming).
- **CDN** para assets (logos, PDFs).
- P99 < 300 ms en lecturas críticas (menús/pedidos).

### T9. DevOps

- **Docker** + orquestación (Coolify/K8s según fase).
- **SSL wildcard** (`.comida.com`) con Caddy automático.
- **DNS**: `.comida.com` (A/CNAME).
- **CI/CD**: tests + deploy atómico.
- **Versionado API**: `v1` estable; cambios mayores detrás de flags.

### T10. Escalabilidad y evolución

- Separar más adelante microservicios con alto throughput (orders/notifications).
- **SSO** corporativo (Google/Microsoft) para onboarding masivo.
- **Custom domain** por empresa (CNAME al subdominio).
- White-label si un partner quiere su marca (misma base multi-tenant).

---

## 13.10. Decisiones críticas (recomendación)

1. **Una sola app multi-tenant con subdominios dinámicos** (no 3 apps).
2. **DB única con aislamiento por `tenant_id`** + tests E2E de aislamiento.
3. **Jobs horarios** para consolidación de pedidos y cierres mensuales.
4. **Export contable** como pilar del producto (CSV impecable y trazable).
5. **Auditoría fiscal por diseño** (logs firmados, registros diarios, límites técnicos ≤ 11 €).

## 🧠 VISIÓN GENERAL

El planteamiento es **coherente, pragmático y viable** para un SaaS inicial.

Pero hay áreas que, vistas desde un CTO experimentado, necesitan **mayor definición técnica o control de riesgo** antes de empezar desarrollo.

Divido la crítica en 5 bloques: arquitectura, seguridad, mantenimiento, negocio técnico y escalabilidad.

---

## 1. 🔩 Arquitectura general — **Buena base, pero riesgo de sobrecarga**

✅ **Lo que está bien**

- Una única app multi-tenant es la decisión correcta: evita deuda técnica y simplifica el onboarding.
- El uso de subdominios es limpio (permite branding, aislamiento visual y routing natural).
- La detección del tenant vía middleware es estándar (Next.js Middleware + header parsing).
- Roles bien diferenciados y base de datos con `tenant_id` en cada entidad.

⚠️ **Críticas / dudas**

- No defines cómo manejarás **cambios de schema** (migraciones) sin afectar todos los tenants.
    
    → Esto es el talón de Aquiles de todo multi-tenant. Si haces una migración errónea, afectas a todos los clientes.
    
    👉 Solución: controlar versiones del schema con migraciones atómicas y tests automatizados por tenant.
    
- El modelo multi-tenant lógico (un solo schema) **escala bien hasta cierto punto**, pero si planeas más de 1.000 empresas con tráfico diario, tendrás que particionar (sharding por tenant o usar schemas por empresa).
- Falta aclarar cómo gestionarás la **persistencia de menús históricos** (¿se archivan o se borran?).
    
    La trazabilidad fiscal requiere conservarlos 4 años, pero si crece rápido el volumen, el rendimiento de consultas puede caer.
    
- El sistema de **roles dinámicos** puede volverse inestable si se abusa de lógica condicional en frontend (layout switching).
    
    👉 Lo ideal es compilar layouts distintos por tipo de tenant, no condicionar todo en runtime.
    

---

## 2. 🔐 Seguridad y cumplimiento — **Correcto en el papel, pero débil en la práctica**

✅ **Lo que está bien**

- Buena separación por tenant.
- Mención explícita a logs de auditoría y cifrado en tránsito y en reposo.
- Awareness de RGPD, DPA y retención.

⚠️ **Críticas / dudas**

- No defines un sistema de **rotación de claves o tokens**.
    
    Si usas JWT, deben tener expiración corta y refresh seguro.
    
    → Si alguien roba un token, puede acceder a toda la data del tenant.
    
- **Column-level encryption** para PII está mencionada “si necesario”, pero debería ser obligatoria si vas a manejar datos personales de empleados (emails, hábitos alimentarios, etc.).
    
    Hacienda no exige esto, pero RGPD sí puede cuestionar el uso de datos sensibles.
    
- No mencionas **tests de pentesting ni auditorías externas**.
    
    En cuanto una empresa grande quiera firmar contrato, te pedirá un informe de seguridad externo o al menos un escaneo OWASP.
    
- El sistema de **copago** implica manejar dinero o transferencias indirectas → ¿Cumples PSD2/KYC si intermedias fondos entre empresa y restaurante?
    
    Si solo eres pasarela de datos, bien. Pero si mueves dinero, necesitas licencia de intermediario de pagos o colaboración con un PSP (ej. Stripe Connect).
    

---

## 3. ⚙️ Mantenimiento, DevOps y despliegue — **Sólido, pero incompleto**

✅ **Lo que está bien**

- Despliegue con Docker y Caddy (válido para MVP).
- Uso de Coolify simplifica mucho el entorno inicial.
- Menciones a backups, logs centralizados y testing E2E.

⚠️ **Críticas / dudas**

- No defines un **entorno staging** o sandbox para empresas grandes que quieran probar antes de producción.
    
    → Esto es crítico si vas a vender a corporativos o administraciones.
    
- No hay plan claro para **escalar horizontalmente** Redis, DB y workers.
    
    Si mañana 500 empresas hacen pedidos simultáneamente a las 10:30, Redis se bloquea y los cron jobs fallan.
    
    → Necesitas colas distribuidas o particionadas por tenant.
    
- No defines **monitorización de SLAs por tenant**.
    
    Si un restaurante tiene caídas recurrentes, debes poder aislar el impacto y mostrar al cliente que su servicio sigue estable.
    
- El uso de **Let’s Encrypt wildcard** es correcto, pero si haces miles de subdominios, necesitas rate limiting management o usar Cloudflare SSL para evitar throttling de certificados.

---

## 4. 💼 Negocio técnico — **Bien orientado, pero falta estructura financiera**

✅ **Lo que está bien**

- Entiendes que la trazabilidad fiscal es la ventaja competitiva.
- Sabes que el “pain point” de RRHH es la integración contable, no el menú en sí.
- Incluyes CSV contable, informes de copago y facturas automatizadas.

⚠️ **Críticas / dudas**

- No defines claramente **qué facturas emite quién** desde el punto de vista legal.
    
    Si la factura la emite el restaurante, pero tú la gestionas y la envías, necesitas contrato de intermediación o representación fiscal.
    
    Si tú emites factura en nombre del restaurante (facturación delegada), Hacienda lo tratará distinto.
    
- No explicas el **flujo contable completo del copago mixto** (empresa/empleado).
    
    ¿El empleado paga a través de la empresa? ¿Se descuenta en nómina?
    
    → Esto tiene impacto directo en cotización y base imponible.
    
    El módulo contable debería reflejarlo con precisión.
    
- No defines una **política de errores financieros**:
    
    ¿qué pasa si un restaurante sube una factura errónea, o un pedido duplicado?
    
    Necesitas un proceso de reversión contable y auditoría de rectificación.
    

---

## 5. 🚀 Escalabilidad y producto — **Buena visión, pero hay puntos ciegos**

✅ **Lo que está bien**

- Multi-tenant escalable, orientado a B2B2C.
- Separación clara de flujos: RRHH ↔ empleado ↔ restaurante.
- Posibilidad de white-label y dominio propio (gran idea).

⚠️ **Críticas / dudas**

- **UX de empleados y restaurantes** en un mismo stack puede crear deuda UX.
    
    El primero usa móvil; el segundo, tablet o PC.
    
    Deberías pensar en **microfronts** o al menos layouts optimizados por device-type.
    
- No defines un **pipeline de control de calidad para restaurantes** (ej. rating, auditorías automáticas, control de certificados).
    
    Si eso falla, tu marca sufre antes que el restaurante.
    
- Falta una **métrica de salud del sistema** por tenant:
    - porcentaje de pedidos entregados,
    - tiempos medios de resolución,
    - fallos en facturación.
        
        Eso te da visibilidad operativa y base para SLAs.
        
- No mencionas el uso de **event sourcing o message bus**.
    
    Dado que manejas trazabilidad diaria y auditoría fiscal, te conviene registrar eventos inmutables (pedido_creado, pedido_cancelado, factura_emitida) en un log separado.
    
    → Simplifica muchísimo auditorías y debugging.
    

---

## 🧮 RESUMEN CRÍTICO CTO

| Área | Evaluación | Comentario |
| --- | --- | --- |
| Arquitectura general | ✅ Buena base | Multi-tenant lógico viable; falta diseño de migraciones y performance. |
| Seguridad | ⚠️ Parcial | Falta gestión de tokens, cifrado por columna y auditorías externas. |
| DevOps | ⚠️ Incompleto | Bien para MVP; carencias en escalado, colas y entorno staging. |
| Fiscal/contable | ⚠️ Ambiguo | Necesita aclarar flujos legales (quién factura, cuándo, a quién). |
| Escalabilidad UX | ⚠️ Riesgo | Empleado vs restaurante tendrán UX opuestos; puede requerir bifurcar front. |
| Observabilidad | ❌ Ausente | No se define SLO/SLI por tenant ni métricas de salud. |

---

## 🧭 Recomendaciones CTO

1. **Diseña un “Tenant SDK interno”**
    
    Un módulo común que gestione el contexto `tenant_id`, auth, logs y auditoría.
    
    Esto evita fugas de datos y facilita testing.
    
2. **Introduce “Event Store” o journaling de operaciones.**
    
    Cada acción (pedido, entrega, factura) → evento inmutable firmado digitalmente.
    
    Te salva en auditorías y debugging fiscal.
    
3. **Crea un entorno staging + dataset sintético**
    
    Para testear cada cierre fiscal sin arriesgar datos reales.
    
4. **Define límites técnicos duros**
    - `pedido.precio ≤ 11` en backend, no solo en UI.
    - Cancelación antes de 11:00 → validación por server cron.
5. **Integra métricas y alertas por tenant.**
    
    Dashboard que muestre si un restaurante o empresa acumula errores o retrasos.
    
6. **Cifrado columnar obligatorio.**
    
    Emails, nombres, alergias, etc. deben cifrarse con AES-256 y rotar claves cada 90 días.
    
7. **Revisa el modelo contable** con un asesor fiscal real antes de automatizar facturas.
    
    Hacienda es estricta con intermediación alimentaria: si facturas o cobras en nombre de otros, se considera prestación de servicios.
    

---

## 🧩 En conclusión

Tu enfoque es **muy bueno para un MVP sólido**.

La arquitectura tiene **sentido técnico y negocio**.

Pero un CTO experimentado levantaría la ceja en los siguientes puntos críticos:

- Migraciones DB sin aislamiento.
- Falta de cifrado y rotación de tokens.
- Flujo legal de facturación poco definido.
- Sin entorno staging.
- Sin observabilidad real por tenant.

Si corriges eso, tienes una plataforma **lista para escalar y auditar**.

Si no, es probable que el sistema funcione bien hasta 10 empresas, pero empiece a sufrir en la 30 o 40 cuando haya múltiples cierres contables simultáneos.

Tu sistema tiene cuatro roles (empresa, empleado, restaurante, admin),

pero **no necesita cuatro apps**.

Necesita **una sola aplicación multi-tenant** con **layouts y permisos dinámicos**, y un **sistema de routing inteligente por subdominio y rol**.

---

## 🚀 Arquitectura recomendada

### 💡 **Una sola app web full-stack multi-tenant**

- **Frontend:** Next.js 15 (React)
- **Backend:** Node/NestJS o Next API routes
- **DB:** PostgreSQL (multi-tenant con `tenant_id`)
- **Infra:** Supabase / Docker / Coolify
- **Routing:** subdominios + roles dinámicos

---

### 🔹 Estructura de acceso (subdominios)

| Subdominio | Rol principal | Qué ve el usuario |
| --- | --- | --- |
| `empresa.comida.com` | RRHH / Empleados | Portal de empresa: gestión, menús, facturas |
| `restaurante.comida.com` | Restaurante | Panel de pedidos y facturación |
| `admin.comida.com` | Plataforma | Vista global: empresas, restaurantes, auditorías |

👉 Pero todo eso vive **dentro de una sola app Next.js**, no en tres proyectos distintos.

Cada subdominio simplemente activa un **“layout” y permisos diferentes**.

---

### 🔹 Ejemplo técnico

### Estructura de carpetas (simplificada)

```
/app
 ├── (tenant)
 │   ├── layout.tsx     ← Detecta subdominio (empresa/restaurante/admin)
 │   ├── empresa/
 │   │    ├── dashboard/
 │   │    ├── empleados/
 │   │    └── facturas/
 │   ├── restaurante/
 │   │    ├── pedidos/
 │   │    └── menús/
 │   ├── admin/
 │   │    ├── empresas/
 │   │    ├── restaurantes/
 │   │    └── logs/
 └── api/
      ├── auth/
      ├── pedidos/
      ├── facturacion/

```

### Middleware de detección de tenant y rol:

```tsx
export function middleware(req) {
  const host = req.headers.get("host") // ej. facebook.comida.com
  const subdomain = host.split(".")[0]
  const tenant = getTenantBySubdomain(subdomain)
  const role = getUserRole(req.cookies.get("session"))

  req.context = { tenant, role }
}

```

Luego en frontend:

```tsx
if (role === "rrhh") return <DashboardEmpresa />
if (role === "chef") return <PanelRestaurante />
if (role === "admin") return <PanelAdmin />

```

---

## ⚙️ Lógica interna (multi-tenant unificada)

### Base de datos

Todas las tablas tienen un campo `tenant_id` que segmenta datos.

```sql
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  empleado_id UUID,
  restaurante_id UUID,
  fecha DATE,
  estado TEXT,
  precio NUMERIC
);

```

**Tenants:**

- Empresa → tipo: `"empresa"`
- Restaurante → tipo: `"restaurante"`
- Admin → acceso global (sin tenant restriction).

El middleware se encarga de inyectar `tenant_id` automáticamente en cada consulta.

---

## 🧩 Ventajas del modelo unificado

| Categoría | Beneficio |
| --- | --- |
| **Desarrollo** | Un solo código base → menor mantenimiento y bugs. |
| **UX/UI** | Experiencia consistente → cada rol tiene su layout, pero se siente parte de un mismo sistema. |
| **Escalabilidad** | Añadir roles o vistas es modular. |
| **Seguridad** | Una sola capa de auth + middleware de tenant controlando todo. |
| **Operaciones** | Un solo despliegue, un solo SSL wildcard, un solo dominio base. |
| **Futuro white-label** | Fácil de tematizar cada tenant (logo, color, favicon, emails personalizados). |

---

## ⚠️ Riesgos / puntos de atención

| Riesgo | Cómo mitigarlo |
| --- | --- |
| Filtrar datos entre tenants | Middleware que **inyecta siempre el tenant_id** y tests automáticos de aislamiento. |
| Certificados SSL | Usar wildcard (`*.comida.com`) con Caddy → genera y renueva automáticamente. |
| Subdominios mal configurados | Crear un catch-all en DNS (`*.comida.com → IP principal`). |
| Carga de branding dinámico | Cachear temas (logos, colores) por tenant en Redis. |
| Roles mal definidos | Controlar accesos a nivel de endpoint (`@RoleGuard`) y de interfaz (`<PrivateRoute role="admin">`). |

---

## 🧠 Escalabilidad futura

Una vez tengas esta base sólida, puedes añadir:

- **SSO empresarial (Google Workspace / Microsoft)** para login de empleados.
- **Portal público opcional por empresa** (p. ej. `landing.facebook.comida.com` con sus propios beneficios).
- **White-label completo** (permitir `menu.facebook.com` apuntando a `empresa.comida.com` con CNAME).
- **Microservicio fiscal independiente** cuando crezcan las validaciones.

---

## 📊 En resumen

| Opción | Nº apps | Complejidad | Escalabilidad | Branding | Recomendación |
| --- | --- | --- | --- | --- | --- |
| Tres apps separadas | 3 | Alta | Baja | Alta | ❌ No recomendable |
| Una app con rutas y roles | 1 | Media | Alta | Media | ✅ MVP ideal |
| Una app multi-tenant con subdominios dinámicos | 1 | Media-Alta | Muy alta | Muy alta | 🏆 Recomendado (lo tuyo) |
| Instancias por cliente | n | Muy alta | Media | Muy alta | 🚫 Solo para white-label extremo |

---

## 🧩 **Diagrama lógico del sistema multi-tenant (texto visual)**

```
                           ┌────────────────────────────┐
                           │        ADMIN PORTAL        │
                           │ admin.comida.com           │
                           │ ────────                   │
                           │ • Gestiona tenants         │
                           │ • Auditoría y logs         │
                           │ • Validación fiscal        │
                           │ • Homologación restaurantes│
                           └────────────┬───────────────┘
                                        │
                                        │  (API global: gestión y reporting)
                                        ▼
           ┌──────────────────────────────────────────────────────────────┐
           │                   BACKEND API (multi-tenant)                 │
           │──────────────────────────────────────────────────────────────│
           │  • Autenticación JWT / OAuth (NextAuth o NestJS Passport)    │
           │  • Middleware de subdominio → tenant_id                      │
           │  • Control de roles ("empleado", "rrhh", "chef", "admin")    │
           │  • Endpoints REST / GraphQL:                                 │
           │     - /auth/login                                            │
           │     - /menus (listar, seleccionar, cancelar)                 │
           │     - /pedidos (crear, confirmar entrega)                    │
           │     - /facturacion (crear, validar, exportar CSV/ERP)        │
           │     - /reportes (uso, ahorro fiscal, incidencias)            │
           │     - /restaurantes (auditorías, certificados)               │
           │  • Jobs asíncronos (BullMQ/Redis): cierres, notificaciones   │
           └────────────┬────────────────────┬────────────────────────────┘
                        │                    │
                        │                    │
      ┌─────────────────▼────────────────┐   │
      │          EMPRESA TENANT          │   │
      │  empresaX.comida.com             │   │
      │──────────────────────────────────│   │
      │ • RRHH configura:                │   │
      │    - Empleados                   │   │
      │    - Días de servicio            │   │
      │    - Aporte empresa/copago       │   │
      │ • Finanzas descarga factura/CSV  │   │
      │ • Portal de empleados:           │   │
      │    - Selecciona menú semanal     │   │
      │    - Cancela hasta 11:00         │   │
      │    - Historial de consumo        │   │
      │ • Notificaciones automáticas     │   │
      └───────────┬──────────┬───────────┘   │
                  │          │               │
                  │          │               │
   ┌──────────────▼──────┐   │               │
   │   RESTAURANTE TENANT│   │               │
   │ restauranteY.comida.com │               │
   │────────────────────────│               │
   │ • Recibe pedidos por día│               │
   │ • Marca entregas        │               │
   │ • Sube factura (PDF/API)│               │
   │ • Indicadores de rating │               │
   └──────────────┬──────────┘               │
                  │                         │
                  ▼                         ▼
       ┌─────────────────────────────────────────────┐
       │                 BASE DE DATOS               │
       │─────────────────────────────────────────────│
       │  Tables:                                    │
       │  • tenants (id, nombre, subdominio, tipo)   │
       │  • users (id, tenant_id, role, email, hash) │
       │  • menus (id, restaurante_id, fecha, items) │
       │  • pedidos (id, empleado_id, tenant_empresa,│
       │             restaurante_id, estado, precio) │
       │  • facturas (id, restaurante_id, tenant_emp,│
       │             importe_total, periodo)         │
       │  • incidencias (pedido_id, tipo, estado)    │
       │  • logs (timestamp, usuario, acción)        │
       └─────────────────────────────────────────────┘

```

---

## 🔄 **Flujo de interacción entre roles**

### 🏢 **1. Empresa (RRHH / Finanzas)**

1. Accede a `empresa.comida.com` → login.
2. Configura:
    - presupuesto diario (≤ 11 €/día),
    - empleados activos,
    - días operativos (L–J),
    - política de copago.
3. La app crea registros en `tenants` y `users`.
4. Genera **links de invitación** para empleados.
5. Descarga facturas / CSV contable cada mes.

→ Interactúa con módulos:

`/auth`, `/config`, `/facturacion`, `/reportes`.

---

### 👩‍💼 **2. Empleado**

1. Accede a su portal en el mismo subdominio `empresa.comida.com`.
2. Ve los menús de la semana (vía `/menus?fecha=semana_actual`).
3. Selecciona qué días quiere comer y qué plato (API `/pedidos/create`).
4. Puede cancelar hasta las 11:00 → cambia `estado = cancelado`.
5. Cada acción queda registrada (nominativa, diaria, ≤ 11 €).

→ Interactúa con módulos:

`/auth`, `/menus`, `/pedidos`, `/notificaciones`.

---

### 🍳 **3. Restaurante**

1. Accede a `restaurante.comida.com`.
2. Cada día recibe un listado consolidado (`/pedidos/today?restaurante_id=...`).
3. Marca pedidos como entregados o con incidencia.
4. Sube factura del periodo (`/facturacion/upload`).
5. Puede ver indicadores: menús vendidos, incidencias, rating.

→ Interactúa con módulos:

`/pedidos`, `/facturacion`, `/reportes`.

---

### 🧭 **4. Admin plataforma**

1. Accede a `admin.comida.com`.
2. Supervisa empresas activas, restaurantes homologados, incidencias y métricas.
3. Valida auditorías, fiscalidad, cumplimiento de límites.
4. Gestiona usuarios y crea backups.

→ Interactúa con todos los módulos con permisos globales.

---

## 💾 **Flujo de datos típico (pedido semanal)**

1. Empleado selecciona menú → `POST /pedidos`
    
    → guarda en `pedidos` (`tenant_empresa`, `restaurante_id`, `fecha`, `precio`).
    
2. Hasta las 11:00 puede cancelar → `PATCH /pedidos/:id estado=cancelado`.
3. A las 11:05 cron job agrupa por restaurante → `SELECT pedidos WHERE estado='pendiente'`.
4. Restaurante ve su listado y entrega → `PATCH /pedidos/:id estado=entregado`.
5. Al final de mes:
    - Se genera `factura_restaurante.pdf`.
    - Se agrupa y emite `factura_empresa.pdf`.
    - Se genera `informe_mensual.csv` con copagos y consumo.
6. Todo queda vinculado al `tenant_id` → auditoría fiscal validable.

---

## ⚙️ **Flujos técnicos clave**

| Proceso | Tecnología / lógica recomendada |
| --- | --- |
| **Identificación de tenant** | Middleware en Next.js o NestJS detectando `subdominio`. |
| **Autenticación** | NextAuth (JWT con `tenant_id` y `role`). |
| **Permisos** | Middleware `@RequireRole(["rrhh","empleado","chef"])`. |
| **Persistencia** | PostgreSQL con índices por `tenant_id`. |
| **Jobs programados** | BullMQ / Redis: envío de pedidos 11:05, cierre mensual, alertas. |
| **Facturación** | Módulo PDF con ReportLab o servicio externo. |
| **Integraciones ERP** | Exportación CSV estándar; API REST para Sage/A3. |
| **Notificaciones** | Emails (MailerLite) + WhatsApp API (Meta). |

---

## 📱 **Ejemplo de experiencia del empleado**

```
Lunes 8:00 → Recibe recordatorio: “Elige tus menús para esta semana.”
Abre empresa.comida.com/empleado → ve:

[ ] Lunes: Pollo al curry 🍛
[✔] Martes: Lasaña vegetal 🥗
[✔] Miércoles: Pescado al horno 🐟
[ ] Jueves: Paella mixta 🍤

[Guardar elecciones]

→ Puede cancelar antes de las 11:00 cada día.
→ En historial ve: “3 menús consumidos, 0 cancelados”.

```

---

## ✅ **Ventajas de este enfoque**

- Todo bajo **una app única**.
- **Subdominios personalizados** para cada empresa/restaurante.
- **Roles y layouts dinámicos**: cada usuario ve solo lo que le corresponde.
- **Cumplimiento fiscal** (nominativo, diario, ≤ 11 €/día).
- **Escalable** a miles de tenants sin clonar código.

Vamos a analizarlo desde **dos ángulos**:

1. **Visión Product Manager (lógica funcional y de negocio)**
2. **Visión Tech Lead (arquitectura técnica y dependencias)**

Al final te dejaré una **propuesta jerárquica del sistema** que sirva de blueprint.

---

## 🧭 1. VISIÓN PRODUCT MANAGER

### Objetivo de esta capa superior

El **súper admin** no es un rol operativo, sino estratégico y de control.

Debe tener **visibilidad total del ecosistema** (todas las empresas y caterings) y poder **bajar en jerarquía** para resolver, auditar o intervenir.

---

### 1.1. Jerarquía general del sistema (visión producto)

```
NIVEL 1 ──────────────>  Súper Admin (la plataforma)
│
├─ NIVEL 2 ──────────>  Empresas (tenants tipo empresa)
│     ├─ RRHH / Finanzas
│     └─ Empleados
│
└─ NIVEL 2 ──────────>  Restaurantes (tenants tipo catering)
      ├─ Gestores / Jefes cocina
      └─ Personal operativo

```

Cada nivel tiene autonomía en su propio “espacio”, pero el **Súper Admin** puede:

- **Ver** todos los datos de los niveles inferiores.
- **Intervenir** (forzar cambios, reasignar empresas a un restaurante, corregir facturas).
- **Configurar políticas globales** (IVA, copago máximo, horario de corte, etc.).

---

### 1.2. Lo que debe poder hacer el Súper Admin

### a) **Visibilidad y métricas**

Dashboard global con KPIs:

- Nº empresas activas / total registradas.
- Nº restaurantes activos / homologados.
- Nº de menús diarios servidos (hoy / semana / mes).
- Incidencias abiertas / resueltas.
- Porcentaje de cancelaciones diarias.
- Valor total facturado y comisiones totales.

→ Este panel debe actuar como **centro de control operacional y fiscal**.

---

### b) **Gestión jerárquica**

Desde el dashboard, el admin puede:

- Entrar a cualquier **portal de empresa** (modo “ver como”)
- Entrar a cualquier **portal de catering**
- Editar o suspender cuentas
- Crear nuevos tenants (empresas o restaurantes)
- Revisar auditorías y logs por tenant

→ Es lo que en producto se llama **“switch tenant mode”**, muy común en SaaS B2B multi-cliente.

---

### c) **Gestión de políticas globales**

Definir variables que afectan a todos:

- Límite exento diario (por defecto 11 €).
- Hora límite de cancelación (11:00).
- IVA aplicable por defecto (10 %).
- Política de retención de datos (años).
- Reglas de comisiones (% por pedido, o por empresa).

---

### d) **Supervisión y control de calidad**

- Validar auditorías de restaurantes (documentos, certificados sanitarios).
- Revisar incidencias por nivel crítico.
- Ver métricas por restaurante (tiempo de entrega, satisfacción).
- Detectar inactividad (empresas sin pedidos, caterings sin actividad).

---

### e) **Gestión fiscal / contable**

- Descarga global de facturación agrupada por mes/empresa/restaurante.
- Revisión de discrepancias contables.
- Generación de informes consolidados (útil para contabilidad de la propia plataforma).

---

### 1.3. Principios de UX y gobernanza

- El Súper Admin debe poder **navegar jerárquicamente** sin cambiar de sesión (impersonación segura).
- Cada nivel tiene su **identidad visual** (branding del tenant) pero el admin ve una **barra superior gris/neutral** que indica el contexto actual (ej. “Viendo: Facebook S.L. — Modo admin”).
- Todo lo que haga el súper admin queda registrado en logs de auditoría (nunca enmascarado).

---

## ⚙️ 2. VISIÓN TECH LEAD

Ahora traduzcamos esa jerarquía funcional a **una arquitectura de software** limpia, escalable y segura.

---

### 2.1. Jerarquía técnica (multi-tenant extendido)

```
┌──────────────────────────────┐
│     Súper Admin Tenant       │
│  (tenant_id = "root")        │
│  Acceso global (read/write)  │
└──────────┬───────────────────┘
           │
           ├──► Empresas Tenants (type: "empresa")
           │       ├── RRHH / Finanzas
           │       └── Empleados
           │
           └──► Restaurantes Tenants (type: "restaurante")
                   ├── Chef principal
                   └── Personal operativo

```

**Clave técnica:**

En la base de datos, el **Súper Admin** tiene `tenant_id = root`, con permisos sobre todos los demás tenants.

Cada entidad (`empresa`, `restaurante`, `pedido`, `factura`) incluye `tenant_id` para aislar datos, pero el admin puede omitir el filtro.

---

### 2.2. Auth y jerarquía de acceso

- Todos los usuarios se autentican con el mismo sistema (NextAuth/NestJS).
- Los JWT contienen:
    
    ```json
    {
      "user_id": "...",
      "tenant_id": "...",
      "role": "rrhh",
      "scope": ["read:tenant", "switch:tenant", "manage:global"]
    }
    
    ```
    
- El Súper Admin tiene `"tenant_id": "root"` y `"scope": ["*"]`.
- Función `switchTenant(target_tenant_id)` cambia contexto sin nuevo login (solo para admin autorizado).

---

### 2.3. Frontend y routing

La app principal (`app.comida.com`) tiene:

- `/admin` → panel del súper admin (root tenant).
- `/[tenant]/` → portal del tenant (empresa o restaurante).

El admin puede entrar a `/[tenant]/dashboard` con un parámetro `?asAdmin=true`.

Internamente el middleware carga ese tenant en modo lectura/escritura según permisos.

---

### 2.4. Flujo de acceso del súper admin

1. Entra a `admin.comida.com`
2. Ve métricas globales (de todas las tablas, sin filtro `tenant_id`).
3. Al hacer clic en una empresa → `switchTenant(empresa_id)`
    
    → abre `empresa.comida.com/dashboard?adminView=true`.
    
4. Puede realizar acciones (activar usuarios, corregir pedidos, etc.).
5. Todas las acciones quedan en `audit_logs` con campo `impersonated_tenant`.

---

### 2.5. Seguridad jerárquica

- **Nadie** fuera del tenant root puede listar tenants.
- Los cambios hechos “en modo admin” se auditan doble: `actor_id` (admin) + `on_behalf_of` (tenant).
- Token impersonado tiene expiración < 15 min.
- Prohibido el acceso directo por subdominio sin validación del token.

---

### 2.6. Ejemplo de consultas

```sql
-- Super admin ve todos los pedidos del mes:
SELECT * FROM pedidos WHERE fecha >= '2025-10-01';

-- Empresa ve solo sus pedidos:
SELECT * FROM pedidos WHERE tenant_empresa = 'uuid_empresa_123';

-- Restaurante ve solo sus entregas:
SELECT * FROM pedidos WHERE restaurant_id = 'uuid_restaurante_456';

```

---

### 2.7. Integración del dashboard global

### Fuentes:

- `empresas` (tenants tipo empresa)
- `restaurantes` (tenants tipo restaurante)
- `pedidos` (actividad diaria)
- `facturas` (movimiento contable)
- `incidencias` (estado del servicio)

### Métricas:

- `COUNT(empresas_activas)`
- `COUNT(restaurantes_activas)`
- `SUM(pedidos_hoy)`
- `AVG(tiempo_entrega)`
- `SUM(facturas_total_mes)`
- `COUNT(incidencias_abiertas)`

### Visualización:

- Tarjetas con KPIs.
- Gráficos de líneas para actividad diaria.
- Tabla drill-down (empresa → pedidos → empleados).
- Filtros por rango de fechas, sede o restaurante.

---

## 🧩 3. Riesgos y recomendaciones

| Riesgo | Mitigación |
| --- | --- |
| Confusión entre “modo admin” y “modo tenant” | Barra visual que indique contexto actual + confirmación al cambiar. |
| Acceso accidental a datos de otro tenant | Validar `tenant_id` en backend siempre, incluso en modo admin. |
| Carga alta del dashboard global | Cachear KPIs con Redis (refresco cada 5 min). |
| Múltiples impersonaciones simultáneas | Limitar a una sesión activa por admin. |
| Logs masivos | Almacenar logs en bucket S3 o servicio ELK (no en DB principal). |

---

## 📊 4. Resumen estructural final

```
                      ┌──────────────────────────────┐
                      │  SUPER ADMIN DASHBOARD       │
                      │ admin.comida.com             │
                      │ - KPIs globales              │
                      │ - Auditoría / Logs           │
                      │ - Switch tenant              │
                      └──────────────┬───────────────┘
                                     │
        ┌────────────────────────────┼───────────────────────────┐
        │                                                    │
┌────────────────────┐                              ┌────────────────────┐
│ EMPRESA PORTAL     │                              │ RESTAURANTE PORTAL │
│ empresaX.comida.com│                              │ lacocina.comida.com│
│ - RRHH/Finanzas    │                              │ - Chef / Logística │
│ - Empleados         │                              │ - Facturación      │
│ - Pedidos semanales │                              │ - Incidencias      │
└────────────────────┘                              └────────────────────┘
                                     │
                      ┌──────────────┴───────────────┐
                      │          BASE DE DATOS       │
                      │ - tenants, users, pedidos    │
                      │ - facturas, incidencias      │
                      │ - audit_logs, config global  │
                      └──────────────────────────────┘

```

---

## ✅ Conclusión Product + Tech Lead

Tu intuición es totalmente correcta:

el **Súper Admin debe ser la capa superior de control total**, con capacidad de:

- visualizar el ecosistema completo,
- entrar en cada tenant como “modo administrador”,
- y mantener trazabilidad total.

A nivel técnico, eso no requiere más apps, sino una **extensión lógica de la capa multi-tenant**: un **tenant raíz (`root`)** con permisos sobre los demás.

Bien hecho, este enfoque te permite tener una **plataforma de clase enterprise** con control total sin perder simplicidad.

# Visión: qué debe resolver el Súper Admin

- **Gobernanza total** del multi-tenant: alta/baja/edición de empresas y caterings, permisos, planes y límites.
- **Configuración global** que heredan los tenants (y posibilidad de overrides por tenant).
- **Calidad de servicio**: SLAs, auditorías, incidencias, reputación de proveedores, cobertura geográfica.
- **Compliance**: fiscal, sanitario, RGPD, trazabilidad, retención, logs, políticas.
- **Facturación/planes**: comisiones, cuotas, liquidaciones, métricas de MRR/ARR y cobros.
- **Integraciones**: SSO, ERP, nómina, e-mail/WhatsApp, webhooks, API keys.
- **Operación**: impersonación segura, plantillas de comunicación, mantenimiento, migraciones.

---

# Estructura de la pantalla (IA de información)

Barra lateral con 10 módulos. Cada módulo tendrá lista, buscador, filtros, vistas guardadas y acciones masivas.

1. **Dashboard**
2. **Tenants** (Empresas y Caterings)
3. **Usuarios y Roles (RBAC)**
4. **Catálogos globales** (alérgenos, menús tipo, festivos, zonas/logística)
5. **Calidad y SLAs** (auditorías, incidencias, rating, penalizaciones)
6. **Facturación & Planes** (planes, comisiones, liquidaciones, impuestos)
7. **Integraciones** (ERP, SSO, pagos, webhooks, API keys)
8. **Compliance** (retención, DPA, política de datos, auditoría fiscal)
9. **Plantillas y Branding** (e-mails/WhatsApp, temas, dominios)
10. **Operación** (impersonación, backups, migraciones, mantenimiento)

---

## 1) Dashboard (visión ejecutiva + operación en tiempo real)

**KPIs en tarjetas:**

- Empresas activas / total, Restaurantes homologados / activos.
- Pedidos de hoy (entregados, pendientes, cancelados).
- Incidencias abiertas / TMR (tiempo medio resolución).
- % puntualidad restaurantes (rolling 7 días).
- Volumen facturado mes (por empresas / por restaurantes / comisiones).
- Adopción por tenant (% empleados que piden ≥2 días/semana).
- Alertas: documentos sanitarios a punto de caducar, picos de cancelaciones, fallos de facturación.

**Gráficas y tablas:**

- Línea de pedidos/día por zona.
- Top 10 empresas por uso / por crecimiento.
- Top 10 restaurantes por rating / por incidencias.
- Mapa de cobertura con “zonas calientes” (demanda vs capacidad).

**Acciones rápidas:**

- “Crear empresa”, “Crear restaurante”, “Abrir modo impersonación”, “Poner sistema en mantenimiento”, “Enviar anuncio global”.

---

## 2) Tenants (Empresas & Caterings)

**Listado** con filtros (estado, zona, plan, actividad, fechas).

**Ficha de tenant** con pestañas:

- **Resumen:** estado, plan, sedes, responsables, actividad, últimas incidencias, KPIs de uso.
- **Configuración:**
    - Subdominio y branding (logo, color).
    - Política de servicio (días activos, hora corte, copago, límite € por día).
    - Centros de coste, moneda, idioma.
    - Overrides (anular configuración global para este tenant).
- **Usuarios**: RRHH/Finanzas/Empleado (altas/invitaciones, estado, MFA).
- **Restaurantes vinculados**: uno o varios, reglas de asignación, prioridades.
- **Contabilidad**: tipo de export (CSV A3/Sage/SAP), periodicidad, mapping de cuentas (640, 755, 472, 400), prefijos de factura.
- **Integraciones**: SSO (Google/Microsoft), ERP, nómina, Teams/Slack/WhatsApp.
- **Facturación**: comisiones aplicadas, cuota mensual, histórico de facturas, impagos.
- **Compliance**: DPA firmado, política de retención, consentimiento.
- **Logs**: acciones recientes (alta usuarios, cambios de política, cierres).

**Acciones críticas:**

- Suspender / reactivar, borrar (soft-delete), congelar facturación, forzar cierre mensual, regenerar CSV.

---

## 3) Usuarios y Roles (RBAC)

**Modelo RBAC granular** con roles predefinidos y permisos editables:

- **Globales:** super_admin (root), auditor (solo lectura, incluye logs).
- **Empresa:** rrhh, finanzas, manager_sede, empleado.
- **Restaurante:** chef, operaciones, facturacion.
- **Permisos finos:** lectura/escritura por módulo (pedidos, facturas, integraciones, configuración, impersonación).

**Controles:**

- MFA obligatorio para roles sensibles (super_admin, finanzas, facturación).
- Políticas de contraseña, rotación de tokens, caducidad de sesiones.
- “Ver como” (impersonación) con límites temporales y doble registro en `audit_logs`.

---

## 4) Catálogos globales (normalizan el sistema)

- **Taxonomía de alérgenos** (UE 1169/2011) y etiquetas nutricionales.
- **Menús tipo / plantillas** (equilibrado, vegetariano, sin gluten, etc.) y porciones mínimas.
- **Calendarios laborales** (por país/comunidad), festivos, jornada intensiva.
- **Zonas y logística**: radios de cobertura, ventanas de entrega, SLA por zona, matrices de asignación empresa↔restaurante.
- **Motivos de incidencia** normalizados (retraso, pedido incorrecto, deterioro, no entregado).
- **Umbrales de penalización** (retraso >15 min = crédito 100%, 3 graves/mes = suspensión auto).

---

## 5) Calidad y SLAs

**Auditorías:**

- Estado documental por restaurante (registro sanitario, RC, manipuladores, caducidades con alertas).
- Auditoría sanitaria anual / operativa semestral / satisfacción trimestral (configurable).
- **IR (Índice de Rendimiento)**: fórmula editable (satisfacción, puntualidad, incidencias inversas, documentación). Reglas automáticas de downgrade/suspensión.

**Incidencias:**

- Bandeja global con filtros por severidad, edad, tenant, causa.
- SLA: TMR objetivo y real; escalado automático a admin a partir de X horas.
- Plantillas de compensación (bonos, reembolso, crédito).
- Informes por proveedor y por empresa.

---

## 6) Facturación & Planes

**Planes del SaaS:**

- Starter / Growth / Enterprise: comisión y cuota base; add-ons (API, integraciones, ESG).
- Reglas de precio por volumen, sedes/empleados, geografía.

**Liquidaciones:**

- Comisión por pedido (8–12%), cuota mensual por empresa, fee por menú gestionado (copago).
- **Motor de impuestos**: IVA 10% (hostelería), 21% (servicios plataforma), reglas por país.
- Ciclos de liquidación: quincenal a restaurantes, mensual a empresas.

**Métricas y cobros:**

- MRR/ARR, churn, expansión/contracción por tenant.
- Estado de cobros (Stripe/SEPA), reintentos, dunning, alertas de impago.

---

## 7) Integraciones

- **ERP/contabilidad:** plantillas de CSV (A3, Sage, SAP, Odoo) + API REST por si la empresa la prefiere.
- **Nómina:** fichero de copagos, reglas de redondeo y mes de imputación.
- **SSO:** Google Workspace, Microsoft Entra.
- **Mensajería:** Mail/SMS/WhatsApp/Teams; plantillas y envíos programados.
- **Pagos:** Stripe Connect / SEPA si intermedias fondos (si no, off).
- **API keys** por tenant y **webhooks** (pedidos, cierres, incidencias, facturas).
    
    Registra delivery, reintentos, DLQ (cola de fallos).
    

---

## 8) Compliance (fiscal + RGPD)

- **Retención**: 4 años (fiscal), configurable por país.
- **Data residency**: UE por defecto.
- **DPA** (acuerdo de tratamiento) versionado y firmable desde el panel.
- **Derechos RGPD**: export/borrado por usuario (con excepciones fiscales).
- **Auditoría fiscal por diseño**: descargar “Informe de Consumo Diario Firmado” por tenant/periodo.
- **Pentest / OWASP**: carga de informes, estado, fecha próxima auditoría.
- **Políticas** globales y por tenant (ex: prohibir pedidos >11 € en backend).

---

## 9) Plantillas y Branding

- **Branding por tenant**: tema (colores, logo, favicon), subdominio, CNAME opcional, emisión de certificados automatizada (wildcard).
- **Plantillas de comunicación**: alta empleados, recordatorio semanal, hora límite, incidencias, cierre de mes.
- **A/B Testing** en recordatorios para subir adopción (opcional).
- **Avisos en-app** y anuncios globales (banner, modal).

---

## 10) Operación

- **Impersonación controlada** (“ver como”) con expiración y doble log (actor y on_behalf_of).
- **Backups** (programación, retención, test de restauración).
- **Migraciones**: estado, versión de schema, rollback seguro, “ventana de mantenimiento”.
- **Modo mantenimiento** por zona/tenant; colas pausadas y mensajes al usuario.
- **Health checks**: servicios (DB, Redis, colas, correo, WhatsApp, webhooks) y latencia por región.
- **Rate limiting / WAF**: reglas y excepciones por tenant/IP.

## 🧩 ESTRUCTURA PRINCIPAL DEL PANEL DE SÚPER ADMIN (REVISADA Y AMPLIADA)

### 1. DASHBOARD GENERAL

📊 *Objetivo:* visión global del negocio + control operacional + detección temprana de problemas.

**Elementos:**

- **KPIs principales:** empresas activas, caterings activos, pedidos de hoy, % puntualidad, incidencias abiertas, ingresos totales, consumo medio por empleado.
- **Gráficas:**
    - Evolución de pedidos diarios/semana/mes
    - Empresas nuevas vs churn
    - Restaurantes activos por zona
    - Ingresos por tipo de plan o comisión
- **Alertas:** documentos sanitarios a punto de vencer, caterings inactivos, empresas sin pedidos, errores de facturación.
- **Panel de actividad reciente:** últimos registros (empresas, caterings, usuarios, incidencias).
- **Botones rápidos:** Crear empresa | Crear catering | Ver incidencias | Descargar informes.

> 🔸 Descendencia funcional:
> 
> - Todos los tenants reciben KPIs locales (mini-dashboard por empresa o catering).
> - Las métricas globales alimentan el motor de reporting y las gráficas de cada subnivel.

---

### 2. LISTADO DE CATERINGS (Proveedores)

🍳 *Objetivo:* administrar toda la red de proveedores y la lógica de servicio que heredan las empresas.

**Vista general:**

- Tabla con columnas: nombre, subdominio, zona, menús activos, documentación, estado (activo/suspendido), rating medio, últimas entregas, incidencias (7d).
- Filtros: zona, tipo de comida, actividad, documentación caducada, SLA roto.

**Ficha / formulario de catering (registro y configuración completa):**

1. **Datos generales:** nombre, CIF, contacto, subdominio.
2. **Días disponibles y horario de corte** (heredado o personalizado).
3. **Cobertura:** zonas (códigos postales, radios, empresas asignadas).
4. **Menús:** carga o edición de menús, precios, etiquetas (vegetariano, sin gluten, etc.).
5. **Condiciones especiales:** alérgenos, formatos, tamaño de porción, políticas de sustitución.
6. **Documentación:** registro sanitario, seguro RC, certificados manipuladores, fecha de caducidad.
7. **Facturación:** cuenta bancaria, frecuencia liquidación, IVA aplicado, comisiones plataforma.
8. **Histórico de auditorías y penalizaciones.**

**Acciones:**

- Activar/suspender | Forzar auditoría | Enviar aviso | Ver incidencias.

> 🔸 Descendencia funcional:
> 
> - Los menús creados aquí alimentan los que ven los empleados.
> - Los días/horarios definen la lógica de pedidos para empresas asociadas.
> - Los certificados sanitarios y SLAs alimentan la capa de calidad global.

---

### 3. LISTADO DE EMPRESAS

🏢 *Objetivo:* administrar clientes corporativos, empleados, configuraciones y políticas específicas.

**Vista general:**

- Tabla: nombre, subdominio, plan, empleados, catering asignado, consumo promedio, incidencias, estado de pago.
- Filtros: plan, zona, catering asociado, actividad (últimos 7 días), facturación pendiente.

**Ficha / formulario de empresa:**

1. **Datos generales:** razón social, CIF, subdominio, logo, plan contratado.
2. **Configuración de servicio:**
    - Días activos, hora límite, política de copago (empresa X €, empleado Y €).
    - Centros de coste o sedes.
    - Menú permitido (empresa puede restringir menús por tipo).
3. **Usuarios y roles:** RRHH, Finanzas, Manager, Empleados (importación CSV o SSO).
4. **Asignación de catering:** automático o manual; reglas de fallback.
5. **Facturación:** datos fiscales, export contable (A3/Sage/SAP), cuenta bancaria.
6. **Integraciones:** ERP, nómina, mensajería, SSO.
7. **Histórico de pedidos y consumo.**
8. **Logs y auditoría.**

**Acciones:**

- Impersonar | Editar | Suspender | Generar CSV contable | Enviar aviso | Cambiar plan.

> 🔸 Descendencia funcional:
> 
> - Los empleados se crean aquí y bajan a la capa de portal de empleado.
> - Las configuraciones (días, copago, hora límite) se propagan a los workflows de pedidos.
> - Las facturas emitidas desde aquí alimentan el sistema contable y los informes globales.

---

### 4. SECCIÓN DE PAGOS Y ESTADO FINANCIERO

💳 *Objetivo:* consolidar todos los flujos económicos (facturas, comisiones, pagos, impagos).

**Elementos:**

- Panel global de **ingresos por empresa**, **pagos pendientes a caterings**, **comisiones retenidas**, **MRR/ARR**.
- **Listado de facturas:**
    - Filtro por estado (pendiente, pagada, error, reembolsada).
    - Ver PDF, reenviar, descargar CSV contable.
- **Liquidaciones a caterings:**
    - Por ciclo (semanal, mensual).
    - Estado: en proceso, completado, retenido.
- **Pagos empresa:**
    - Stripe/SEPA integrado.
    - Reintentos, dunning, alertas de impago.
- **Dashboard financiero:**
    - Margen neto, comisión media, retrasos de cobro, cashflow proyectado.
- **Alertas:** caterings sin cuenta bancaria, discrepancias, facturas duplicadas.

> 🔸 Descendencia funcional:
> 
> - Las liquidaciones afectan la visibilidad de ingresos en el panel del catering.
> - Los estados de pago alimentan la visibilidad del RRHH en su panel.
> - El dashboard genera reportes automáticos de facturación mensual.

---

### 5. SECCIÓN DE INCIDENCIAS

⚠️ *Objetivo:* centralizar todas las anomalías del sistema (operativas, sanitarias, logísticas, contables).

**Elementos:**

- **Vista global:** tabla de incidencias con filtros por tipo (entrega, pedido, facturación, documento, usuario), severidad y tenant.
- **Estados:** abierta, en revisión, resuelta, compensada.
- **Asignación:** responsable (empresa, catering, admin).
- **Plantillas de resolución:** crédito, reembolso, notificación, suspensión temporal.
- **Alertas automáticas:** si SLA > 24h o >3 incidencias del mismo tipo.
- **Gráficas:** incidencias por catering, por empresa, por tipo, por zona.
- **Integración:** comunicación automática al tenant afectado y cierre automático cuando catering confirma resolución.

> 🔸 Descendencia funcional:
> 
> - Cada tenant ve solo sus incidencias (empresa o catering).
> - Los estados cambian dinámicamente en todos los niveles.
> - Las penalizaciones de caterings se aplican desde aquí (impactan su rating).

---

## 🔧 MÓDULOS QUE FALTAN (Y SON ESTRUCTURALES)

Estos son los que un PM o CTO veterano añadiría sí o sí porque sustentan a todos los anteriores:

### 6. **Catálogos Globales (fundación de datos compartidos)**

- Días festivos y zonas geográficas.
- Tipos de menús (para validación de menús por catering).
- Alérgenos, intolerancias, etiquetas nutricionales.
- Motivos de incidencia estandarizados.
- Reglas de penalización automáticas (ej. 3 incidencias graves = suspensión).

> 🔸 Descendencia:
> 
> - Estos catálogos se heredan por todos los tenants y validan datos de formularios.

---

### 7. **Calidad y Auditorías**

- Estado documental de cada catering (certificados, fechas, alertas).
- Sistema de rating automático (entregas puntuales, incidencias, feedback empleados).
- Registro de auditorías manuales (checklist, resultado, comentarios).
- Bloqueo automático si documentación expira.

> 🔸 Descendencia:
> 
> - Impacta en la visibilidad del catering, su puntuación y la confianza de las empresas.

---

### 8. **Configuración global y políticas**

- Hora límite global de pedidos y cancelaciones (overrideable por tenant).
- Límite máximo exento fiscal (por defecto 11 €).
- IVA aplicado (10 % hostelería, 21 % servicio).
- Retención fiscal, periodos contables, días hábiles.
- Políticas de privacidad y retención RGPD.
- Plantillas de emails, notificaciones y WhatsApp.
- Comisiones estándar por plan.

> 🔸 Descendencia:
> 
> - Todo el sistema hereda estos valores por defecto.
> - Cambiar algo aquí impacta en toda la plataforma.

---

### 9. **Integraciones / Automatizaciones**

- Conectores ERP (A3, Sage, SAP, Odoo).
- Nómina (export de copagos).
- API keys por tenant.
- Webhooks (pedidos creados, entregados, facturados).
- Integración con mensajería (Brevo, MailerLite, WhatsApp).
- Automatización de cierres y notificaciones (cron jobs configurables).

> 🔸 Descendencia:
> 
> - Permite a las empresas integrar su ERP y a los caterings automatizar facturas.
> - Reduce soporte y errores humanos.

---

### 10. **Logs y Auditoría (transparencia total)**

- Registro de todas las acciones administrativas:
    
    quién, qué, cuándo, antes/después, IP.
    
- Filtros por usuario, tenant, fecha, tipo de cambio.
- Export para auditorías fiscales o seguridad.

> 🔸 Descendencia:
> 
> - Garantiza trazabilidad legal y fiscal.
> - Permite reconstruir incidentes o errores operativos.

---

### 11. **Herramientas de Soporte / Impersonación**

- “Ver como” empresa o catering.
- “Modo mantenimiento” por tenant o global.
- Sistema de tickets internos (soporte o comunicación entre niveles).
- Chat o módulo de mensajes admin → tenant.

> 🔸 Descendencia:
> 
> - Permite intervenir sin acceder manualmente a bases de datos.
> - Mejora soporte sin romper el aislamiento entre tenants.

---

## 🧭 Síntesis visual jerárquica

```
SÚPER ADMIN
│
├─ Dashboard global (KPIs, gráficos, alertas)
├─ Caterings (listado + ficha + config completa)
├─ Empresas (listado + ficha + roles)
├─ Pagos / Facturación (global + por tenant)
├─ Incidencias (todas las capas)
│
├─ Catálogos globales
├─ Calidad / Auditorías
├─ Configuración global / Políticas
├─ Integraciones / Automatizaciones
├─ Logs y Auditoría
└─ Soporte / Impersonación

```

# Diseño de la UI (resumen práctico)

**Dashboard (home)**

- Hero con KPIs + Alertas (documentos por caducar, impagos, SLAs rotos).
- Gráfica pedidos 30 días + heatmap por zona.
- Top 5 empresas y restaurantes, y “pozos” (baja adopción/alta incidencia).
- Acciones rápidas (crear empresa/catering, anuncio global, mantenimiento).

**Tenants (tabla)**

- Columnas: Nombre, Tipo, Plan, Estado, Sedes, Uso (%), Incidencias (7d), Última actividad.
- Acciones en fila: Impersonar, Editar, Suspender, Facturación, Integraciones.

**Ficha de tenant**

- Tabs: Resumen | Configuración | Usuarios | Rest. vinculados | Contabilidad | Integraciones | Facturación | Compliance | Logs.

**Calidad/SLAs**

- Tableros: ranking de restaurantes, auditorías pendientes, TMR, penalizaciones ejecutadas.

**Facturación/Planes**

- Vista de planes, margen por plan, MRR/ARR, dunning queue (cobros fallidos), liquidaciones a proveedores.

**Integraciones**

- Catálogo (ERP, SSO, Mensajería, Pagos).
- Estado por tenant, errores, últimas llamadas, reintentos.

**Compliance**

- Retención, DPA, auditorías externas, RGPD requests, export por usuario.

**Plantillas/Branding**

- Editor de plantillas (placeholders), vista previa por canal, temas por tenant, dominios/CNAME.

**Operación**

- Impersonación, backups, migraciones (changelog), mantenimiento por zona, health status.

---

# Guardarraíles (lo que rompen muchos B2B y aquí prevenimos)

- **Límites duros en backend** (nunca >11 €; cancelación post-11:00 solo por admin con motivo).
- **Impersonación con expiración y aviso** (“Estás actuando como Facebook S.L.”).
- **Logs inmutables** de toda acción administrativa (quién, cuándo, qué, antes/después).
- **Cierre contable** con reconciliación antes de soltar facturas (no factures si hay gaps).
- **Caducidad documental** con bloqueo automático de proveedores no conformes.
- **Rate limiting y colas por tenant** (que el pico de uno no tumbe a todos).
- **Plantillas ERP bloqueadas** (no dejar que un RRHH rompa el mapping contable).

---

# Prioridades (MVP de Súper Admin)

1. Dashboard con KPIs + alertas básicas.
2. Tenants CRUD completo + impersonación + configuración esencial (días, hora corte, copago, ERP CSV).
3. Usuarios/RBAC con MFA y roles finos.
4. Catálogos: alérgenos, festivos, zonas, motivos de incidencia.
5. Calidad/SLAs: auditorías documentales + incidencias con SLA y penalización.
6. Facturación: planes, comisión, cuota, liquidaciones y CSV.
7. Integraciones: ERP CSV + E-mail/WhatsApp.
8. Compliance: retención, DPA, export fiscal.
9. Plantillas y Branding por tenant.
10. Operación: impersonación, backups, modo mantenimiento, health.

---

## 🍳 PERFIL Y MENTALIDAD DEL USUARIO “CATERING”

- Es una **empresa local**, pequeña o mediana (10–50 empleados).
- Tienen uno o varios **puntos de producción** y reparten a distintas empresas.
- El **volumen diario de pedidos** fluctúa y el margen es estrecho.
- Lo que más les preocupa:
    1. Saber **cuántas raciones preparar** (por tipo de menú).
    2. Entregar a tiempo.
    3. Evitar desperdicio.
    4. Cobrar rápido y sin errores de facturación.

Su portal debe ser una mezcla entre un **sistema de producción ligera**, un **panel de logística**, y un **módulo contable mínimo**.

---

## 🧩 ESTRUCTURA GENERAL DEL PORTAL DEL CATERING

```
CATERING DASHBOARD
│
├─ Dashboard operativo (día a día)
├─ Pedidos (listado y preparación)
├─ Menús (creación, gestión y publicación)
├─ Empresas y zonas asignadas
├─ Incidencias
├─ Facturación y pagos
├─ Documentación y cumplimiento
└─ Configuración

```

---

## 1️⃣ DASHBOARD OPERATIVO (la pantalla principal)

🎯 **Objetivo:** que el catering vea de un vistazo qué tiene que cocinar y entregar hoy.

### Secciones:

- **Pedidos de hoy:**
    - Total de menús por tipo (normal, vegetariano, sin gluten, etc.)
    - Total por empresa o zona (ej. “Oficina Facebook: 32 menús”)
    - Estado: pendientes / en preparación / entregados / incidencias.
- **Resumen del día:**
    - Hora límite de modificaciones (ej. “Pedidos cerrados a las 11:00”)
    - Siguiente ventana de entrega
    - Empresas activas hoy / rutas previstas
- **Alertas:**
    - Cambios de última hora
    - Cancelaciones post límite
    - Documentos por caducar
    - Facturas pendientes o rechazadas
- **Botones rápidos:**
    - Ver hoja de producción
    - Marcar entregas
    - Reportar incidencia
    - Crear factura del día

**Mentalidad de diseño:**

La pantalla debe poderse leer **desde una tablet en cocina** o en la furgoneta, con botones grandes y colores claros (verde = preparado, naranja = en curso, rojo = problema).

---

## 2️⃣ PEDIDOS

📦 **Objetivo:** saber qué cocinar, empaquetar y entregar.

### Vistas:

- **Listado diario** (por fecha) → tabla agrupada:
    - Empresa | Sede | Tipo menú | Nº unidades | Hora entrega | Estado
    - Totales al final: “Vegetariano: 12”, “Sin gluten: 3”, etc.
- **Modo preparación (cocina):**
    - Lista con platos y cantidades.
    - Botón “Imprimir hoja de cocina”.
    - Botón “Marcar preparado”.
- **Modo reparto:**
    - Asignar repartidor / vehículo.
    - Marcar entregado / incidencia.
    - Firma digital (opcional) o confirmación del RRHH.

### Funcionalidades:

- Filtros por fecha, empresa, estado.
- Descarga en CSV o PDF.
- Registro de incidencias (pedido no recogido, error en cantidad, etc.).
- Histórico: poder ver y duplicar pedidos pasados.

**Insight de producto:**

El catering no piensa en “usuarios” ni “sistemas”: piensa en “qué tengo que cocinar y a quién entrego”.

Por eso el lenguaje del producto debe ser operativo: *“preparar”, “entregar”, “facturar”*.

---

## 3️⃣ MENÚS

🍽️ **Objetivo:** definir qué opciones hay para cada día y qué empresas las verán.

### Estructura:

- **Calendario semanal o mensual** → cada día tiene 1–3 menús disponibles.
- Cada menú tiene:
    - Nombre (“Menú Casero del Día”)
    - Descripción (entrante, principal, postre)
    - Precio (≤ 11 € recomendado)
    - Etiquetas (vegetariano, sin gluten, sin lactosa, etc.)
    - Imagen (opcional)
    - Disponibilidad (fechas, días, empresas o zonas).
- Botones:
    - “Duplicar menú de otro día”
    - “Publicar semana siguiente”
    - “Cerrar día” (ya no admite cambios).

**Extras:**

- Indicar **platos agotados** (automático o manual).
- Estadísticas: menús más vendidos, devoluciones, cancelaciones.
- Control de **stock estimado** (raciones preparadas vs servidas).

> El módulo de menús es clave porque alimenta directamente la interfaz de los empleados en las empresas.
> 

---

## 4️⃣ EMPRESAS Y ZONAS ASIGNADAS

🏢 **Objetivo:** saber para quién trabajan y en qué zonas operan.

### Secciones:

- **Listado de empresas activas**:
    - Nombre | Dirección | Contacto | Nº empleados | Pedidos promedio | SLA cumplimiento.
- **Mapa de cobertura**:
    - Mostrar las zonas donde entregan (radio o códigos postales).
- **Configuración por empresa**:
    - Horario de entrega preferido.
    - Persona de contacto.
    - Reglas especiales (ej. “empresa con alérgenos”, “solo menús sin cerdo”).

**Insight:**

Les interesa ver quiénes son sus clientes recurrentes, cuántos menús hacen a la semana, y si hay empresas inactivas (para volver a ofrecerles).

---

## 5️⃣ INCIDENCIAS

⚠️ **Objetivo:** resolver problemas sin llamadas ni WhatsApp caótico.

### Vistas:

- Tabla: fecha | empresa | tipo (entrega / comida / factura) | estado | notas.
- Filtros: abierto / cerrado / pendiente empresa.
- Acciones:
    - Marcar resuelto.
    - Enviar mensaje a empresa o admin.
    - Adjuntar foto (plato dañado, firma).
    - Añadir crédito o descuento (si política lo permite).

**Insight:**

El catering quiere **proteger su reputación**.

Un sistema claro de incidencias evita sanciones y mejora la relación con la empresa y el admin.

---

## 6️⃣ FACTURACIÓN Y PAGOS

💰 **Objetivo:** saber qué han facturado, qué falta cobrar, y tener trazabilidad clara.

### Secciones:

- **Facturas emitidas**: tabla (fecha, empresa, periodo, importe, estado).
- **Crear factura manual o automática** (por periodo o empresa).
- **Pagos recibidos:** estado (pendiente, pagado, error, reembolso).
- **Alertas:** discrepancias, falta de datos fiscales, cuenta bancaria sin validar.
- **Exportar a PDF o CSV.**

**Insight:**

Lo que más les irrita es no saber cuándo cobran.

Tu plataforma debe darles **certeza y control**: “factura generada el 5, cobro previsto el 15”.

---

## 7️⃣ DOCUMENTACIÓN Y CUMPLIMIENTO

📄 **Objetivo:** mantenerse homologados sin tener que enviar mails a la administración.

### Secciones:

- **Certificados:** registro sanitario, seguro RC, manipuladores, alergias, etc.
- **Alertas de caducidad.**
- **Subida de documentos (PDF/JPG).**
- **Historial de auditorías.**
- **Estado de cumplimiento:** verde (OK), naranja (por vencer), rojo (bloqueado).

> Si no tienen los documentos al día, no deben poder publicar menús nuevos.
> 

---

## 8️⃣ CONFIGURACIÓN

⚙️ **Objetivo:** mantener todo en orden sin depender del súper admin.

### Secciones:

- Datos generales: logo, dirección, contacto, cuenta bancaria.
- Usuarios: añadir cocineros, repartidores, gestores.
- Notificaciones: email, WhatsApp, SMS.
- Integraciones: ERP, contabilidad, WhatsApp Business.
- Preferencias: formato de impresión, unidad de medida, idioma, moneda.

---

## 🔁 FUNCIONALIDADES TRANSVERSALES

| Función | Qué hace | Por qué importa |
| --- | --- | --- |
| **Modo preparación / reparto** | Cambia vista a “operativa” con foco en cocina o logística | Reduce errores en cocina y mejora entregas |
| **Notificaciones automáticas** | Aviso al catering de cancelaciones, cambios, incidencias | Reacción rápida |
| **Impresión rápida** | Imprimir hoja de cocina o albarán diario | Agiliza la producción |
| **Historial y estadísticas** | Menús más vendidos, puntualidad, incidencias, satisfacción | Autoevaluación y mejora |
| **Integración contable** | Exportar CSV con facturas o pedidos | Simplifica cierre mensual |
| **Feedback loop** | Empresas califican al catering, catering ve puntuaciones | Incentiva calidad |

---

## 🧠 RESUMEN DE PRODUCT THINKING

**Mentalidad:**

- El catering no quiere “un CRM”, quiere **una herramienta de producción diaria**.
- Su uso es constante, no eventual: abrirá este panel todos los días a las 9:00.
- El éxito del producto no se mide por funciones, sino por **minutos ahorrados y errores evitados**.

**Diseño UX:**

- Vista principal = lista de tareas del día.
- Todo a máximo 2 clics.
- Diseño limpio, con botones grandes, indicadores claros (verde preparado, rojo pendiente).
- Sin jerga técnica ni términos fiscales: “factura pendiente” > “documento no conciliado”.

---

## 💡 BONUS: IDEAS QUE LES ENCANTARÍAN

- **“Hoja de producción automática”**: exporta PDF con totales diarios (por plato, cantidad, empresa).
- **Modo sin conexión (tablet en cocina)**: puede marcar menús preparados offline.
- **App simple para repartidores**: ver entregas del día, marcar entregado, firmar.
- **Panel de feedback:** empresas o empleados califican la comida (para mejorar).
- **Alertas proactivas:** “mañana tienes 80 pedidos, 20 más que la semana pasada”.

Corrección de una cosa:

Tu modelo ya **no es un menú cerrado diario**, sino un **sistema de combinaciones de platos dinámicas** (tipo “menú del día modular”), que afecta directamente a:

- Cómo el **catering configura su oferta diaria**,
- Cómo el **empleado selecciona su comida**, y
- Cómo la **cocina y la organización logística** gestionan la preparación y empaquetado.

Vamos a rediseñar el flujo completo de **“Gestión de menús y pedidos”** desde la perspectiva del **catering**, pero asegurando que **encaje con el flujo descendente (empleado y empresa)**.

Voy a estructurarlo en 3 capas:

---

# 🧩 1. Lógica funcional revisada: “menús modulares”

Cada día el catering **no define menús cerrados**, sino un **catálogo de opciones**:

| Tipo | Ejemplo de configuración diaria |
| --- | --- |
| Primeros | Ensalada César · Gazpacho · Pasta al pesto |
| Segundos | Pollo al horno · Merluza plancha · Lentejas veganas |
| Postres | Yogur natural · Fruta · Natillas |

El **empleado** (desde el portal de empresa) elige su combinación:

> Gazpacho + Merluza + Yogur
> 

La **plataforma agrupa todos esos pedidos diarios** y genera automáticamente para el catering:

- Un **resumen de producción por plato** (“12 gazpachos, 8 pastas al pesto…”),
- Un **resumen por empresa/destino** (“5 menús para Facebook, 4 para Iberdrola…”),
- Y **etiquetas personalizadas** con nombres de empleados para la fase de empaquetado/logística.

---

# 🧠 2. Módulo “Gestión de Menús” (desde el panel del catering)

## Vista general

Calendario semanal con días activos (L–V).

Cada día tiene una estructura editable:

### Día Lunes 20 de Octubre

- **Primeros (3 de 3)**
    - ✅ Gazpacho (sin gluten, vegetariano)
    - ✅ Ensalada César (contiene gluten, huevo)
    - ✅ Pasta al pesto (vegetariano)
- **Segundos (3 de 3)**
    - ✅ Pollo al horno (sin gluten)
    - ✅ Merluza plancha (sin gluten)
    - ✅ Lentejas veganas
- **Postres (2 de 3)**
    - ✅ Yogur natural
    - ✅ Fruta de temporada
    - (🕓 Natillas – agotado o no disponible)
- **Precio base del menú:** 10,00 €
- **IVA aplicado:** 10 %
- **Hora límite para pedidos:** 11:00 AM

**Botones principales:**

- ➕ Añadir plato
- 📆 Duplicar día
- 🧾 Exportar hoja de cocina
- 📤 Publicar semana siguiente

---

## Estructura de un plato

Cada plato tiene su ficha editable:

- **Nombre del plato**
- **Tipo:** primero / segundo / postre
- **Precio individual (opcional)**
- **Etiquetas:** vegetariano, sin gluten, etc.
- **Descripción breve**
- **Foto (opcional)**
- **Activa del:** 20/10/2025 al 24/10/2025
- **Disponibilidad por empresa o zona**
- **Cantidad máxima diaria (stock límite)**

---

## Inteligencia del módulo

- Si un plato alcanza su **stock máximo**, el sistema lo marca como “agotado” y deja de ofrecerlo a los empleados.
- Cada cambio se **refleja en tiempo real** en el portal de los empleados (vía API/websocket).
- Se puede **duplicar una semana completa** y editar platos puntuales.

---

# 🔪 3. Módulo “Producción y Cocina”

Una vez cerrada la hora de pedidos (ej. 11:00 AM), el catering ve un **panel operativo automático** generado a partir de las elecciones de los empleados.

---

## 📋 Vista “Hoja de Cocina” (resumen por plato)

| Plato | Tipo | Cantidad total | Etiquetas |
| --- | --- | --- | --- |
| Gazpacho | Primero | 12 | Vegano, sin gluten |
| Ensalada César | Primero | 8 | Contiene huevo |
| Pasta al pesto | Primero | 4 | Vegetariano |
| Pollo al horno | Segundo | 10 | Sin gluten |
| Merluza plancha | Segundo | 6 | Sin gluten |
| Lentejas veganas | Segundo | 8 | Vegano |
| Yogur natural | Postre | 12 | - |
| Fruta | Postre | 10 | - |

**Botones:**

- 📄 Imprimir hoja de cocina
- ✅ Marcar lote preparado
- 📦 Pasar a logística

---

## 🧳 Vista “Organización y Empaquetado”

Una vez la cocina termina, el siguiente paso es **montar los pedidos por empresa y empleado**:

### Pantalla “Organización del día”

**Filtro:** por empresa →

**Ejemplo: Facebook S.L.**

| Empleado | Pedido | Observaciones |
| --- | --- | --- |
| Laura G. | Gazpacho + Merluza + Fruta | Sin gluten |
| Pedro M. | Ensalada César + Pollo + Yogur | - |
| Marta F. | Lentejas + Fruta | Vegetariano |

**Botones:**

- 🏷️ Imprimir etiquetas con nombre (autogeneradas, QR opcional).
- 🧾 Imprimir listado por empresa.
- 📦 Marcar lote empaquetado.
- 🚚 Asignar entrega / repartidor.

> Aquí la interfaz debe ser muy visual y simple. Idealmente cada pedido individual tenga una pequeña “ficha” con nombre y platos seleccionados.
> 

---

## 📦 Vista “Entregas”

Panel tipo tabla o kanban:

| Empresa | Total pedidos | Hora entrega | Estado |
| --- | --- | --- | --- |
| Facebook S.L. | 18 | 13:00 | ✅ Entregado |
| Iberdrola | 12 | 13:30 | 🕓 En reparto |
| CaMon Digital | 6 | 14:00 | ❗ Incidencia |

Cada empresa tiene un resumen imprimible:

“Lote Facebook — 18 pedidos — Vehículo 2 — Repartidor: Carlos”.

---

# 🧾 4. Facturación adaptada al modelo modular

Ya no se facturan “menús cerrados”, sino **unidades servidas** derivadas de las elecciones diarias:

- Cada plato tiene su ID, precio y registro de consumo.
- El sistema genera automáticamente las líneas de factura:
    
    ```
    12 Gazpachos (Lunes 20/10) @ 3,50 €
    10 Pollos al horno (Lunes 20/10) @ 6,50 €
    8 Frutas (Lunes 20/10) @ 1,00 €
    Total: 185,00 € + IVA
    
    ```
    
- Factura agrupada por empresa y periodo.

> 💡 En facturación se conserva trazabilidad completa: cada línea se vincula al pedido y al empleado (nominativo), cumpliendo con la exención IRPF.
> 

---

# ⚙️ 5. Lógica descendente (cómo impacta esto en las otras capas)

| Capa | Impacto |
| --- | --- |
| **Empleado** | En su app, elige 1 primer plato + 1 segundo + 1 postre del catálogo diario (hasta la hora límite). |
| **Empresa (RRHH)** | Ve qué empleados han pedido, puede descargar el listado diario y filtrar por alergias. |
| **Catering** | Recibe la demanda consolidada por plato + listado nominativo para empaquetar. |
| **Super Admin** | Ve métricas de variedad, satisfacción, y cumplimiento nutricional. |

---

# 🧠 6. Detalles críticos para producto

### ✅ Reglas clave

- Un plato puede estar disponible **varios días** (reutilizable).
- Se puede configurar **límite diario por plato** (por escasez de materia prima).
- Las cancelaciones antes de las 11:00 restan del conteo automáticamente.
- A partir de las 11:01 el menú queda bloqueado.

### 📅 Automatizaciones útiles

- Copiar automáticamente la estructura de la semana pasada.
- Sugerir “rotación de platos” (si un plato se repite demasiado).
- Generar informe nutricional (opcional, para empresas grandes).

### 🧾 Extras UX

- Colores por tipo de plato (azul = primero, rojo = segundo, verde = postre).
- Indicadores de demanda: 🔥 plato más pedido, ❄️ plato menos pedido.
- “Modo cocina” (tablet horizontal, solo muestra cantidades totales).

---

# 💬 En resumen

El **catering no publica menús cerrados, sino catálogos diarios de platos** que luego el sistema:

1. Agrupa en combinaciones únicas (empleado por empleado),
2. Consolida en un resumen de cocina por plato,
3. Ordena por empresa y empleado para empaquetar,
4. Y termina facturando por unidades reales servidas.

Este modelo:

- 💡 Mejora la personalización (cada empleado come lo que quiere),
- 🔄 Aumenta la eficiencia operativa (cocina produce por plato, no por menú),
- 📦 Simplifica logística (paquetes por empresa y nombre),
- 📊 Y mantiene control fiscal total (pedido nominativo + límite diario).

# 🍳 ESTRUCTURA DEL PORTAL DEL CATERING

Subdominio: `nombrecatering.comida.com`

## VISIÓN GENERAL

El panel del catering se divide en **7 secciones principales**, cada una con permisos diferenciados según rol.

El diseño está pensado para que:

- Los **gestores** controlen toda la operación (configuración, facturas, documentación, etc.).
- Los **cocineros y repartidores** usen vistas simplificadas (operativas y visuales).
- Los **administradores del catering** mantengan trazabilidad completa y conexión con la plataforma global.

---

## 🧭 SECCIONES PRINCIPALES

### 1️⃣ Dashboard Operativo (Inicio)

📋 **Qué es:**

Vista general del día. Muestra lo que hay que cocinar, empaquetar y entregar.

**Contenido:**

- Total de pedidos del día.
- Resumen de platos por tipo (“12 gazpachos, 8 merluzas…”).
- Empresas y zonas de entrega.
- Estado de entregas (pendiente / en reparto / entregado).
- Alertas: platos agotados, pedidos modificados, incidencias, documentos por caducar.

**Roles con acceso:**

👑 Admin Catering · 👨‍🍳 Cocina (solo vista operativa) · 🚚 Repartidor (vista logística simplificada)

---

### 2️⃣ Pedidos

📦 **Qué es:**

Gestión de los pedidos diarios y su estado operativo.

**Contenido:**

- Listado de pedidos filtrable por fecha, empresa o estado.
- Vista *Hoja de cocina*: resumen consolidado por plato (para producción).
- Vista *Empaquetado*: pedidos por empresa y empleado, con etiquetas nominativas.
- Control de entregas: marcar entregado, incidencias, reasignar ruta.

**Roles con acceso:**

👑 Admin Catering (total) · 👨‍🍳 Cocina (solo vista “Hoja de cocina”) · 🚚 Repartidor (solo vista “Entregas”)

---

### 3️⃣ Menús

🍽️ **Qué es:**

Planificación semanal de platos (primeros, segundos y postres).

**Contenido:**

- Calendario semanal o mensual.
- Gestión de platos por tipo, con precios, etiquetas (sin gluten, vegetariano, etc.).
- Reglas de disponibilidad (por días, zonas o empresas).
- Stock máximo por plato.
- Duplicación automática de semanas y sugerencias de rotación.

**Roles con acceso:**

👑 Admin Catering · 🧑‍🍳 Chef principal (gestión de platos y disponibilidad)

---

### 4️⃣ Empresas y Zonas Asignadas

🏢 **Qué es:**

Gestión de clientes corporativos y su cobertura geográfica.

**Contenido:**

- Listado de empresas activas.
- Datos: dirección, contacto, nº empleados, pedidos promedio.
- Configuración: horarios de entrega, preferencias, restricciones alimentarias.
- Mapa de zonas de cobertura y rutas.

**Roles con acceso:**

👑 Admin Catering · 🧑‍🍳 Chef principal (solo lectura)

---

### 5️⃣ Incidencias

⚠️ **Qué es:**

Centro de resolución de problemas operativos.

**Contenido:**

- Tabla con incidencias por tipo: entrega, comida, facturación, documento.
- Filtros por estado (abierta, resuelta, pendiente empresa).
- Comunicación directa con empresa o administrador.
- Subida de fotos y comentarios.
- Registro de acciones (quién la resolvió, cuándo, cómo).

**Roles con acceso:**

👑 Admin Catering (total) · 👨‍🍳 Cocina (solo reportar nuevas) · 🚚 Repartidor (solo marcar incidencias de entrega)

---

### 6️⃣ Facturación y Pagos

💰 **Qué es:**

Gestión económica del catering.

**Contenido:**

- Facturas emitidas (por empresa y periodo).
- Estado de cobros (pendiente, pagado, error, reembolso).
- Creación manual o automática de facturas.
- Exportación CSV/PDF.
- Alertas de discrepancias.
- Historial de liquidaciones con la plataforma.

**Roles con acceso:**

👑 Admin Catering · 📊 Finanzas (rol específico)

---

### 7️⃣ Documentación y Cumplimiento

📄 **Qué es:**

Gestión de certificados y requisitos sanitarios.

**Contenido:**

- Registro sanitario, seguro RC, manipuladores, controles de higiene.
- Estado (vigente / próximo a caducar / vencido).
- Subida de nuevos documentos.
- Histórico de auditorías y penalizaciones.
- Bloqueo automático de publicación de menús si algo vence.

**Roles con acceso:**

👑 Admin Catering · 📋 Responsable de Calidad

---

### 8️⃣ Configuración

⚙️ **Qué es:**

Ajustes generales del portal del catering.

**Contenido:**

- Datos básicos (CIF, dirección, contacto, cuenta bancaria).
- Gestión de usuarios internos (altas/bajas, roles y permisos).
- Notificaciones (correo, WhatsApp).
- Preferencias: formato de impresión, idioma, moneda.
- Integraciones (ERP, WhatsApp Business, contabilidad).

**Roles con acceso:**

👑 Admin Catering

---

## 👥 ROLES Y PERMISOS

| Rol | Descripción | Accesos principales |
| --- | --- | --- |
| 👑 **Admin Catering** | Gestiona todo el sistema. Puede editar menús, empresas, facturas, usuarios, documentación. | Todas las secciones |
| 🧑‍🍳 **Chef principal / Cocina** | Responsable de la planificación de platos y preparación diaria. | Dashboard, Pedidos (modo cocina), Menús |
| 👨‍🍳 **Cocinero / Producción** | Solo ve la hoja de cocina del día. | Dashboard (resumen) y Pedidos (modo cocina) |
| 🚚 **Repartidor / Logística** | Encargado de entregas y confirmaciones. | Dashboard (entregas), Pedidos (modo reparto), Incidencias (crear) |
| 📊 **Finanzas / Contabilidad** | Responsable de facturas y cobros. | Facturación, Configuración (solo datos bancarios) |
| 📋 **Calidad / Documentación** | Gestiona certificados, controles y auditorías. | Documentación y Cumplimiento |

---

## 🔒 LÓGICA DE PERMISOS

- Roles configurables por el **admin del catering**, pero definidos dentro de límites globales (no puede dar más permisos que los previstos).
- Cada acción crítica (crear factura, publicar menú, cerrar pedidos) se registra en `audit_logs`.
- Los usuarios con rol operativo **no pueden ver datos financieros ni documentación confidencial**.
- Cada usuario accede solo a **su vista personalizada** (modo cocina, modo reparto, modo oficina).

---

## 🧠 UX / Diseño

- Modo “operativo” por defecto: lo primero que ve un cocinero o repartidor es el **Dashboard de hoy**.
- Modo “gestión” (para administradores) con navegación lateral completa.
- Colores por rol:
    - Verde = Cocina
    - Azul = Logística
    - Gris = Gestión
    - Naranja = Alertas

---

---

# 🏢 PORTAL DE EMPRESA

(Subdominio: `facebook.comida.com`)

## 🔍 VISIÓN GENERAL

El portal de empresa está diseñado para:

- **RRHH y Finanzas:** configurar políticas, revisar facturación y supervisar participación.
- **Managers o responsables de sede:** ver pedidos, controlar asistencia y coordinar entregas.
- **Empleados:** elegir sus platos, gestionar su calendario y recibir su comida sin fricción.

El sistema **centraliza la gestión alimentaria** dentro del marco de beneficio social, con trazabilidad nominativa (clave para deducciones fiscales).

---

# 🧩 ESTRUCTURA PRINCIPAL

```
EMPRESA DASHBOARD
│
├─ Dashboard general
├─ Empleados y roles
├─ Pedidos y consumo
├─ Configuración del beneficio
├─ Facturación y pagos
├─ Incidencias
└─ Comunicación y feedback

```

---

## 1️⃣ DASHBOARD GENERAL

🎯 **Objetivo:** ofrecer a RRHH y responsables una vista ejecutiva de participación, gasto y estado operativo.

### Contenido

- **Resumen del día:**
    - Empleados que han pedido hoy / total.
    - Empresas de catering asignadas y sus entregas.
    - Estado de pedidos (pendientes, confirmados, cancelados, entregados).
- **Gráficas clave:**
    - Evolución semanal de consumo.
    - Gasto empresa vs copago empleado.
    - Ranking de platos más pedidos (para entender preferencias).
    - Participación por sede o departamento.
- **Alertas y notificaciones:**
    - Documentos fiscales pendientes.
    - Incidencias activas.
    - Cambios en políticas de copago o límites diarios.

### Accesos rápidos

- “Añadir empleado”
- “Ver pedidos de hoy”
- “Descargar factura mensual”
- “Enviar recordatorio de menú semanal”

**Roles con acceso:** RRHH · Finanzas · Manager de sede

---

## 2️⃣ EMPLEADOS Y ROLES

👥 **Objetivo:** administrar usuarios y roles internos.

### Contenido

- **Listado de empleados:** nombre, email, departamento, estado (activo/inactivo), promedio de pedidos/semana, copago acumulado.
- **Filtros:** estado, frecuencia de uso, sede, fecha de alta.
- **Acciones:**
    - Invitar nuevo empleado (email o CSV).
    - Resetear contraseña.
    - Desactivar temporalmente.
    - Ver historial de consumo individual.

### Roles internos

| Rol | Función | Acceso |
| --- | --- | --- |
| 👑 RRHH/Administrador | Configura políticas, gestiona usuarios, revisa facturas | Total |
| 📊 Finanzas | Acceso a facturas, CSV contable, copagos | Parcial |
| 🏢 Manager de sede | Controla pedidos de su oficina, incidencias | Parcial |
| 👤 Empleado | Selecciona platos, gestiona su menú | Limitado |

### Extras

- **Integración SSO:** importar usuarios desde Microsoft/Google.
- **Automatización:** baja automática si no pide durante X semanas (opcional).

---

## 3️⃣ PEDIDOS Y CONSUMO

📦 **Objetivo:** dar trazabilidad completa de lo que se ha pedido y entregado.

### Vista 1: “Pedidos diarios”

- Tabla por fecha: empleado | pedido | catering asignado | estado | hora entrega | coste total.
- Filtros: fecha, sede, estado, catering.
- Acciones: ver detalles, descargar CSV, reportar incidencia.
- Botón “Ver hoja de entrega del día” (para recepción física).

### Vista 2: “Pedidos por empleado”

- Histórico personal de cada trabajador.
- Totales de consumo mensual.
- % días que ha pedido (para medir adopción).

### Vista 3: “Consumo agregado”

- Gráfica interactiva: gasto total, media por persona, tendencia.
- Comparativa con meses anteriores.

> 💡 Insight PM: Esta vista es clave para justificar el ROI del programa ante dirección.
> 

**Roles con acceso:** RRHH · Finanzas · Manager sede (limitado a su ubicación)

---

## 4️⃣ CONFIGURACIÓN DEL BENEFICIO

⚙️ **Objetivo:** definir las reglas del programa de comida dentro de la empresa.

### Contenido

- **Parámetros fiscales:**
    - Límite diario exento (€11 por defecto).
    - Política de copago: empresa 5 €, empleado 5 €.
    - Días activos del programa (L–J, por ejemplo).
    - Hora límite para pedir/cancelar.
- **Asignación de catering:**
    - Automático por zona o manual.
    - Preferencias (ej. priorizar “Comidas Veganas Madrid”).
- **Sedes o centros de trabajo:**
    - Dirección, horario de comida, capacidad.
    - Asignación de responsables.
- **Visibilidad del programa:**
    - Activar/desactivar comunicación interna.
    - Personalizar mensaje de bienvenida.

**Acciones clave:**

- Guardar cambios globales.
- Clonar configuración entre sedes.
- Enviar actualización a empleados.

**Roles con acceso:** RRHH / Admin empresa

---

## 5️⃣ FACTURACIÓN Y PAGOS

💰 **Objetivo:** gestionar todo lo económico del beneficio.

### Contenido

- **Resumen mensual:**
    - Total facturado.
    - % empresa vs % empleados.
    - Número total de menús servidos.
- **Listado de facturas:**
    - Fecha | catering | periodo | importe | estado (pendiente, pagado).
- **Export contable:**
    - Formatos compatibles: CSV (A3, Sage, SAP).
    - Detalle por centro de coste.
    - Códigos contables preconfigurados (640, 755, 472, etc.).
- **Copagos empleados:**
    - Visualización individual o agregada.
    - Informe para nómina (descuento automático).
- **Histórico de liquidaciones.**

> 💡 Insight PM: esto debe ser “self-service contable”; sin depender de la plataforma.
> 

**Roles con acceso:** Finanzas · RRHH

---

## 6️⃣ INCIDENCIAS

⚠️ **Objetivo:** centralizar la gestión de problemas entre empleados, catering y administración.

### Contenido

- **Listado global:** fecha | empleado | catering | tipo | estado | comentarios.
- **Tipos:** entrega tarde, plato incorrecto, falta de pedido, facturación, etc.
- **Filtros:** tipo, gravedad, estado.
- **Acciones:** abrir incidencia, añadir nota, escalar al catering, marcar resuelta.
- **Notificaciones automáticas:**
    - Cuando catering responde.
    - Cuando se aplica compensación (ej. crédito).

**Roles con acceso:** RRHH (todas) · Manager sede (solo de su oficina)

---

## 7️⃣ COMUNICACIÓN Y FEEDBACK

💬 **Objetivo:** fomentar uso y medir satisfacción.

### Contenido

- **Mensajes internos:**
    - Enviar avisos a empleados (“Recuerda pedir antes de las 11:00”).
    - Enviar feedback al catering (“Muy buena la comida de hoy”).
- **Encuestas automáticas:**
    - Satisfacción semanal o mensual.
    - Preguntas NPS (“¿Recomendarías este servicio?”).
    - Resultados agregados y comparativas.
- **Panel de métricas de bienestar:**
    - Participación media.
    - Valoración general de comidas.
    - Impacto en presencialidad.

**Roles con acceso:** RRHH · Manager sede

---

# 👥 ROLES Y PERMISOS DE EMPRESA

| Rol | Función principal | Accesos |
| --- | --- | --- |
| 👑 **Admin Empresa / RRHH** | Configura política, gestiona usuarios, supervisa consumo, maneja facturación | Todas las secciones |
| 📊 **Finanzas** | Revisa facturas, copagos y exportaciones contables | Facturación, Configuración fiscal |
| 🏢 **Manager de Sede** | Supervisa pedidos de su oficina y comunica con catering | Dashboard, Pedidos, Incidencias |
| 👤 **Empleado** | Elige platos, gestiona su calendario, ve su histórico | Portal empleado (limitado) |

---

# 🧭 FLUJOS CLAVE

### 🔹 Flujo 1: Publicación semanal

1. Catering publica sus platos por día.
2. Empleados de cada empresa ven sus opciones (primeros, segundos, postres).
3. RRHH recibe alertas si hay baja participación o problemas logísticos.

### 🔹 Flujo 2: Pedido diario

1. Empleado elige platos hasta hora límite.
2. Sistema bloquea elección y genera resumen diario por catering.
3. Empresa puede descargar listado de empleados con pedido.
4. Catering recibe los nombres para etiquetar cajas.

### 🔹 Flujo 3: Facturación

1. Catering sube factura del periodo (con detalle por empleado).
2. Empresa la valida o la marca como observación.
3. Finanzas exporta CSV con copagos.
4. Se sincroniza con nómina y contabilidad.

### 🔹 Flujo 4: Incidencia

1. Empleado o RRHH reporta problema.
2. Catering responde y propone compensación.
3. Admin revisa y cierra.
4. Registro queda auditado.

---

# 🧠 DISEÑO DE PRODUCTO (INSIGHTS REALES)

### UX/Flow

- RRHH ve **todo lo que pasa en su empresa**, sin necesitar soporte.
- Empleados solo ven **lo que pueden elegir o revisar**.
- Toda la interfaz de empresa debe parecer **una extensión natural del entorno corporativo** (branding, subdominio, logo).

### Datos que importan al cliente empresa:

- Ahorro fiscal y coste real del beneficio.
- % de uso del programa (adopción).
- Feedback de empleados.
- Satisfacción con los caterings.
- Cumplimiento legal (facturas nominativas y límites).

---

# 🔒 SEGURIDAD Y COMPLIANCE

- Toda la información fiscal y de consumo es **nominativa y encriptada**.
- Accesos segregados por rol, sede y tenant.
- RRHH puede exportar informes de auditoría (para Hacienda o Seguridad Social).
- Los empleados pueden ejercer derechos RGPD (descargar o borrar sus datos).
- Logs de auditoría en cada acción sensible (configuración, pagos, usuarios).

---

# 🧾 SISTEMA DE TRAZABILIDAD DE MENÚS Y CAMBIOS

## 🎯 Objetivo

Garantizar que **cada cambio, cancelación o modificación** de pedidos queda:

- Registrado con precisión (quién, cuándo, qué cambió).
- Reflejado automáticamente en **el cálculo de facturación**.
- Visible de forma sencilla para **empresa y catering**, sin necesidad de comparar hojas de Excel.

---

## 🧩 1. ESTRUCTURA DE DATOS DE CADA PEDIDO

Cada pedido diario tiene su propio **registro auditable**, por empleado.

### Campos base:

| Campo | Descripción |
| --- | --- |
| `pedido_id` | UUID único |
| `empleado_id` | Referencia a empleado |
| `empresa_id` | Tenant empresa |
| `catering_id` | Tenant catering |
| `fecha_pedido` | Día del servicio |
| `hora_creacion` | Cuándo se creó |
| `platos` | Lista JSON: primeros, segundos, postres |
| `importe_total` | Calculado automáticamente según platos |
| `tipo_menu` | Completo / Medio menú |
| `estado` | Confirmado / Cancelado / Entregado / Reembolsado |
| `hora_estado` | Último cambio de estado |
| `usuario_modificador` | Quién lo cambió (empleado, RRHH, catering, admin) |
| `motivo_cambio` | Texto libre o tag (cancelación, error, sustitución, stock agotado) |
| `registro_version` | Versión del pedido (v1, v2, v3…) |
| `firma_hash` | Hash SHA256 del pedido para integridad de auditoría |

---

## 🧠 2. LÓGICA DE VERSIONADO AUTOMÁTICO

Cada vez que alguien (empleado, RRHH o catering) cambia algo en el pedido, el sistema no sobrescribe, sino que:

- **Clona la versión anterior**.
- **Crea una nueva versión** con `registro_version + 1`.
- Registra una línea en una tabla de trazabilidad: `pedido_history`.

### Ejemplo de trazabilidad:

| Versión | Fecha cambio | Usuario | Cambio | Valor anterior | Valor nuevo |
| --- | --- | --- | --- | --- | --- |
| v1 | 18/10 09:12 | Empleado | Creó pedido | — | Gazpacho + Pollo + Yogur |
| v2 | 18/10 09:45 | Empleado | Cambió postre | Yogur | Fruta |
| v3 | 18/10 10:10 | Empleado | Canceló pedido | — | Estado=Cancelado |
| v4 | 18/10 10:50 | RRHH | Reabrió pedido (excepción) | Cancelado | Confirmado |

> 🔹 Esto es crucial: ninguna modificación destruye el histórico.
> 
> 
> 🔹 Permite saber exactamente **qué se pidió, qué se cambió y cuándo.**
> 

---

## ⚙️ 3. CÁLCULO AUTOMÁTICO DE IMPORTE FACTURABLE

El sistema calcula automáticamente **qué debe cobrarse al catering y a la empresa** según el estado y versión final del pedido.

### Lógica:

- Si `estado = Confirmado` antes de hora límite → ✅ facturable completo.
- Si `estado = Cancelado` antes de hora límite → ❌ no facturable.
- Si `estado = Cancelado` después de hora límite → ⚠️ facturable parcial (ej. 50 %).
- Si `tipo_menu = Medio menú` → aplica `precio_medio`.
- Si `catering_modifica_plato` (por falta de stock) → nuevo valor con nota automática “Cambio por disponibilidad”.

Esto evita manualidades: la **factura se genera directamente del histórico auditable**.

---

## 👀 4. INTERFAZ EN PANEL DE EMPRESA

### En la sección “Pedidos y Consumo”

Cada pedido debe tener un pequeño icono 🕓 (historial).

Al abrirlo:

- Timeline visual de cambios (quién, qué, cuándo).
- Tooltip con motivo (“Canceló antes de hora límite”, “Cambio de postre”).
- Estado final: “Facturable completo / medio / no facturable”.

> ✅ RRHH puede ver exactamente por qué se cobra o no se cobra un menú.
> 

### Exportación contable

Al generar CSV contable o factura:

- El sistema **solo toma las versiones finales** marcadas como “facturables”.
- Incluye una columna `motivo_no_facturable` para justificar descuentos o no cobros.

---

## 👨‍🍳 5. INTERFAZ EN PANEL DEL CATERING

En “Pedidos del día”:

- Columna “Cambios recientes” con icono 🕓.
- Al pulsar, se abre un resumen rápido:
    
    > “Laura G. canceló a las 10:52 (parcialmente facturable)”
    > 
    > 
    > “Pedro M. cambió plato principal (stock agotado)”
    > 

En “Facturación”:

- Los pedidos facturables se marcan automáticamente según reglas.
- Si hay cancelaciones parciales, el sistema lo prorratea.
- No hay necesidad de revisar manualmente uno por uno.

---

## 💼 6. INTERFAZ EN PANEL DEL SÚPER ADMIN

El admin puede auditar cualquier pedido en disputa:

- Filtro: empresa + catering + fecha.
- Ver pedido completo y todas sus versiones.
- Ver diferencias de importe.
- Ver qué usuario o API hizo el cambio.
- Descargar informe en PDF firmado (para auditoría o conflicto comercial).

Esto resuelve de raíz las discusiones tipo:

> “Mi empleado canceló a tiempo, no debería cobrarse.”
> 
> 
> “No, el catering ya lo había preparado.”
> 
> → Basta con abrir el historial y se ve claramente el minuto exacto y quién lo ejecutó.
> 

---

## 📅 7. AUTOMATISMOS Y PREVENCIÓN DE CONFLICTOS

- **Bloqueo automático a la hora límite:**
    
    nadie puede cancelar después sin justificación.
    
    Si lo hace un RRHH, se marca explícitamente “modificación manual”.
    
- **Alertas automáticas:**
    - Si un catering modifica menús después del cierre, notificación a empresa.
    - Si una empresa cancela en masa, alerta al súper admin.
- **Resúmenes diarios automáticos:**
    
    Cada noche se genera un reporte firmado por el sistema:
    
    - Platos totales por tipo.
    - Pedidos confirmados vs cancelados.
    - Valor facturable total por empresa y catering.

> Ese archivo PDF diario se guarda como prueba legal y se puede consultar desde los paneles.
> 

---

## 🔒 8. CAPA DE SEGURIDAD Y AUDITORÍA

- Tabla `pedido_history` nunca se puede editar ni borrar (append-only).
- Todos los cambios llevan **firma digital interna (hash)** y timestamp de servidor.
- En los informes, se muestran **minutos exactos con zona horaria**.
- Logs sincronizados en almacenamiento inmutable (S3 o equivalente).

> Esto es estándar tipo “ledger audit trail”, como hacen Stripe, Brevo o Notion para compliance.
> 

---

## 💬 9. BENEFICIOS REALES

| Para quién | Beneficio directo |
| --- | --- |
| **Empresa (RRHH)** | Prueba irrefutable de cada cancelación o modificación. |
| **Catering** | Facturación automática sin discusiones. |
| **Empleado** | Transparencia total (“cancelé antes de hora, no me lo cobran”). |
| **Super Admin** | Trazabilidad completa para auditorías o conflictos. |
| **Contabilidad** | CSV o factura exacta sin revisión manual. |

---

## ⚡ 10. SÍNTESIS DE PRODUCTO

**El principio rector:**

> “Nada se borra, todo se versiona y todo tiene responsable.”
> 

La plataforma se convierte así en **un sistema de confianza entre tres partes**:

- Cada cambio deja huella.
- Cada huella tiene consecuencia contable.
- Nadie necesita reconciliar datos manualmente.

---

# 👤 PORTAL DEL EMPLEADO

Subdominio: `facebook.comida.com/[usuario]`

---

## 🔍 1. OBJETIVO DEL PORTAL

Que el empleado:

- Pueda **elegir qué comer, cuándo y cómo**, en segundos.
- Reciba **recomendaciones inteligentes y personalizadas**.
- Tenga **visibilidad y control total** de su consumo, hábitos y gasto.
- Y perciba el servicio como algo **cómodo, saludable y flexible**, no como “una imposición de empresa”.

---

# 🧩 ESTRUCTURA PRINCIPAL DEL PORTAL DEL EMPLEADO

```
PORTAL EMPLEADO
│
├─ Dashboard personal
├─ Selección semanal (menús)
├─ Mis pedidos
├─ Nutrición y bienestar (IA)
├─ Historial y gasto
└─ Soporte e incidencias

```

---

## 1️⃣ DASHBOARD PERSONAL

🎯 **Objetivo:** mostrar lo relevante del día y motivar la participación.

### Contenido

- **Mensaje del día:**
    
    > “Hoy la ensalada de lentejas está entre las favoritas. Pide antes de las 11:00.”
    > 
- **Pedidos de la semana:** visual tipo calendario (L, M, X, J, V).
- **Estado de hoy:** “Tu pedido de hoy: Gazpacho + Pollo al horno + Yogur. Entrega 13:15h.”
- **Recomendación IA rápida:** “Basado en tus preferencias, te sugerimos merluza + ensalada.”
- **Botón central:** “Elegir mi menú semanal 🍽️”

UX clave: sin fricción.

Debe ser una experiencia tipo **Apple Fitness + Glovo**, con botones grandes, colores suaves y animaciones sutiles (progreso, badges, recomendaciones).

---

## 2️⃣ SELECCIÓN SEMANAL

📅 **Objetivo:** que el lunes (o cualquier día anterior) elija su menú completo de la semana en menos de 3 minutos.

### Flujo:

1️⃣ **Pantalla de calendario semanal**

- Días disponibles según política de la empresa (L–J, por ejemplo).
- Cada día con estado:
    - ⚪ sin elegir
    - 🟢 confirmado
    - 🔴 cancelado
- Botones: “Elegir”, “Duplicar día anterior”, “Cancelar”.

2️⃣ **Pantalla de selección por día**

- Secciones:
    - 🥗 Primeros platos (elegir 1)
    - 🍗 Segundos platos (elegir 1)
    - 🍮 Postres (elegir 1)
- Muestra:
    - Foto del plato
    - Descripción breve
    - Etiquetas: sin gluten, bajo en calorías, vegetariano…
    - Calorías totales y macronutrientes estimados
- Botones de acción:
    - “Añadir al menú”
    - “Cambiar segundo plato”
    - “Ver sugerencia IA”

3️⃣ **Resumen de menú diario:**

> “Martes 21: Gazpacho + Merluza plancha + Yogur (520 kcal, 38g proteína).”
> 
- Botones: Guardar · Editar · Cancelar día

---

## 3️⃣ MIS PEDIDOS

📦 **Objetivo:** ver todo lo que ha pedido, su estado y poder modificar/cancelar.

### Vistas:

- **“Pedidos de esta semana”** → lista tipo timeline con cada día.
- **Estado de entrega:** pendiente / confirmado / entregado / cancelado.
- **Hora límite visible:** “Puedes modificar hasta las 11:00.”
- **Acción directa:** cambiar plato o cancelar menú.
- **Etiquetas claras:**
    - ✅ Confirmado (verde)
    - ❌ Cancelado (gris)
    - ⏰ Cerrado (rojo)

**Detalle del pedido (clic en un día):**

- Lista de platos seleccionados.
- Total de calorías.
- Coste total (€ empresa / € empleado).
- Recomendaciones para próxima semana (IA).

---

## 4️⃣ NUTRICIÓN Y BIENESTAR (IA INTELIGENTE)

💡 **Objetivo:** convertir el acto de pedir comida en una experiencia de bienestar personalizada.

### Datos base:

El sistema conoce:

- Tu edad, género y objetivos (mantener peso, perder grasa, ganar músculo).
- Tus restricciones (alérgenos, dieta vegetariana, sin gluten).
- Tu histórico de pedidos y consumo promedio (proteínas, calorías, grasas).

### Funciones inteligentes:

1. **Recomendación automática de platos:**
    - Según tus objetivos (“Hoy te falta proteína, prueba este plato”).
    - Según preferencias pasadas (“Te gustó la merluza la semana pasada”).
    - Según calorías del día (“Este menú te mantiene en balance con tus 2100 kcal diarias”).
2. **Modo “plan semanal sugerido”**
    
    > “Te preparamos un menú equilibrado para la semana. ¿Confirmarlo o modificarlo?”
    > 
3. **Resumen nutricional visual**
    - Barras: calorías, proteínas, carbohidratos, grasas.
    - “Has mantenido una dieta equilibrada 3 de 4 días.”
    - Comparativa con la media de tus compañeros (anónimo).
4. **Gamificación ligera**
    - Logros (“3 semanas seguidas comiendo equilibrado 🍎”).
    - Badge “Top saludable del mes”.
    - Integración con el programa de bienestar corporativo (opcional).

---

## 5️⃣ HISTORIAL Y GASTO

📊 **Objetivo:** dar visibilidad total de consumo y costes.

### Vistas:

- **Resumen mensual:**
    - Total de menús pedidos.
    - Copago acumulado.
    - Ahorro gracias a la empresa.
    - Calorías totales ingeridas (opcional).
- **Histórico de platos favoritos:**
    - Ranking personal (“Has pedido 5 veces merluza”).
    - Botón “Volver a pedir este menú”.

### Descargas:

- “Informe de consumo mensual” (PDF nominativo, útil para auditoría).

---

## 6️⃣ SOPORTE E INCIDENCIAS

⚠️ **Objetivo:** permitir que el empleado gestione incidencias sin crear caos operativo.

### Tipos de incidencias:

- Pedido no entregado.
- Plato incorrecto.
- Comida fría o en mal estado.
- Error en cobro.

### Flujo:

1️⃣ Selecciona el pedido afectado.

2️⃣ Elige tipo de incidencia.

3️⃣ Describe o sube foto.

4️⃣ Envío directo al catering + notificación a RRHH.

El sistema automáticamente **bloquea la facturación de ese pedido** hasta que el caso se resuelva.

---

# 👥 ROLES Y PERMISOS (nivel empleado)

| Rol | Accesos | Descripción |
| --- | --- | --- |
| 👤 **Empleado estándar** | Dashboard, selección semanal, mis pedidos, nutrición, soporte | Usuario final |
| 🧑‍💼 **Líder de equipo / Manager sede** | + visualización de pedidos de su equipo, sin edición | Control operativo local |
| 🧑‍⚕️ **Asesor bienestar (opcional)** | + panel nutricional agregado (sin datos personales) | Programa de salud corporativo |

---

# ⚙️ AUTOMATISMOS Y TAREAS INTELIGENTES

| Automatismo | Descripción |
| --- | --- |
| **Recordatorio IA diario** | Si no ha elegido antes de las 10:30, recibe push: “¿Quieres que te propongamos el menú de hoy?” |
| **Autoselección inteligente** | Si no responde, el sistema elige automáticamente una opción equilibrada dentro de sus preferencias. |
| **Feedback post-comida** | A las 15:00 recibe: “¿Cómo estuvo tu menú de hoy?” ⭐⭐⭐⭐⭐ |
| **Reporte semanal a RRHH** | Adopción (% empleados que pidieron al menos 1 día). |
| **Adaptación continua** | La IA aprende sus hábitos y propone menús acordes a sus objetivos y restricciones. |

---

# 🧠 PRINCIPIOS DE DISEÑO UX/UI

1. **Velocidad = éxito** → pedir menú semanal < 3 minutos.
2. **Visual first** → fotos grandes, etiquetas claras (sin texto técnico).
3. **Predicción, no elección** → sugerir antes que forzar al usuario a pensar.
4. **Gamificación sutil** → sin parecer una app de fitness, pero con progreso y logros.
5. **Comunicación transparente** → mostrar siempre hora límite y estado (evita discusiones).
6. **Multiplataforma** → móvil, web y kiosko físico (para fábricas o oficinas grandes).

---

# 🔒 TRAZABILIDAD AUTOMÁTICA (aplicada al empleado)

- Cada cambio del empleado (editar plato, cancelar, aceptar menú IA) genera una versión en `pedido_history`.
- Si cancela antes de hora límite → sin cargo.
- Si después → el sistema marca “facturable parcial” automáticamente.
- Todo visible para RRHH y Catering desde sus paneles.
- No hay “ediciones invisibles”: cada acción del empleado deja registro firmado con hora exacta.

---

# 💬 CONCLUSIÓN

El **portal del empleado** debe sentirse como una app de bienestar corporativo, no un formulario de pedidos:

- Inteligente, predictiva y visual.
- Que ahorra tiempo y cuida su salud.
- Que genera automáticamente la trazabilidad fiscal y operativa para los otros dos niveles (empresa y catering).

En este punto, el servicio deja de ser “pedir comida” y se convierte en una **plataforma de bienestar y eficiencia fiscal** para la empresa.

---

# arquitectura por eventos

el **mapa de conexión Empleado ↔ Empresa ↔ Catering** con enfoque de **producto + arquitectura de eventos**: qué se comunica, cuándo, con qué datos, dependencias temporales (11:00/11:05/entrega/cierre mensual), estados, errores y SLAs. Listo para convertir en PRD técnico.

---

# 1) Visión general (arquitectura por eventos)

- **Modelo:** event-driven + API REST.
- **Tenancy:** todos los eventos llevan `tenant_empresa` y `tenant_catering`.
- **Relojes del sistema (cron):**
    - **10:30** recordatorio “elige menú”.
    - **11:00** cierre de pedidos del día (cutoff).
    - **11:05** consolidación y envío a catering.
    - **13:00–14:00** ventana de entrega.
    - **23:59** snapshot diario (PDF/CSV firmado).
    - **Día 1** de mes: generación de facturas/resúmenes.

---

# 2) Estados del pedido (máquina de estados única)

```
DRAFT → CONFIRMED → (CANCELLED_BEFORE_CUTOFF | LOCKED_AFTER_CUTOFF)
LOCKED_AFTER_CUTOFF → (DELIVERED | NO_SHOW | ISSUE_REPORTED)
ISSUE_REPORTED → (COMPENSATED | REJECTED)

```

- **Reglas**:
    - Cancelación libre hasta **11:00** → `CANCELLED_BEFORE_CUTOFF` (no factura).
    - Desde **11:00** → `LOCKED_AFTER_CUTOFF` (posible cobro parcial).
    - Entrega confirmada por catering → `DELIVERED` (facturable).
    - No recogido → `NO_SHOW` (política empresa: cobrar/no cobrar).
    - Incidencia abre “hold” de facturación hasta resolución.

---

# 3) Catálogo de eventos (qué dispara qué)

## A) Eventos del empleado → impacto en empresa y catering

1. **`menu.selected`** (empleado elige platos día X)
    - Efecto: pedido pasa a `CONFIRMED`.
    - Notifica: Empresa (dashboard adopción), IA nutri recalcula semana.
2. **`menu.changed`** (cambia plato dentro del día)
    - Efecto: nueva versión del pedido (v+1).
    - Notifica: nada al catering hasta cutoff.
3. **`menu.cancelled`** (antes de 11:00)
    - Efecto: `CANCELLED_BEFORE_CUTOFF`, se descuenta del conteo.
    - Notifica: Empresa (opcional).
4. **`menu.cancel_attempted_after_cutoff`**
    - Efecto: bloqueado por backend; si RRHH lo fuerza → se marca `LOCKED_AFTER_CUTOFF` con “excepción RRHH”.

## B) Eventos automáticos del sistema

1. **`orders.cutoff.locked`** (11:00)
    - Efecto: todos los `CONFIRMED` pasan a `LOCKED_AFTER_CUTOFF`.
    - Calcula conteos definitivos por plato/destino.
2. **`orders.consolidated_for_kitchen`** (11:05)
    - Efecto: se genera **Hoja de Cocina** (por plato) + **Hoja de Empaquetado** (por empresa y empleado).
    - Entrega al catering (API push o pull seguro).
3. **`orders.daily_snapshot_generated`** (23:59)
    - Efecto: PDF/CSV firmado (por tenant) con totales y desglose nominativo.

## C) Eventos del catering

1. **`kitchen.batch.prepared`** (lote de platos preparado)
    - Efecto: avanza el tablero de cocina, habilita empaquetado.
2. **`delivery.marked_delivered`** (por empresa/destino)
    - Efecto: pedidos → `DELIVERED` (elegibles facturación).
    - Notifica: Empresa (para recepción).
3. **`delivery.issue_reported`**
    - Efecto: `ISSUE_REPORTED`, hold facturación.
    - Dispara flujo de incidencias (SLA).

## D) Eventos de empresa (RRHH/Finanzas)

1. **`company.policy.updated`** (copago, días, cutoff, límites)
    - Efecto: afecta validaciones futuras, nunca retroactivas.
2. **`company.export.payroll_requested`** (copagos)
    - Efecto: genera CSV nómina con copagos por empleado/mes.
3. **`company.invoice.validated`**
    - Efecto: desbloquea liquidación al catering.

## E) Cierre mensual

1. **`billing.monthly_closed`**
    - Efecto: emite factura(s), exporta CSV ERP, genera resumen legal.
    - Notifica: Empresa (Finanzas) y Catering.

---

# 4) Contratos de datos (payloads mínimos)

## `orders.consolidated_for_kitchen`

```json
{
  "tenant_empresa": "uuid-empresa",
  "tenant_catering": "uuid-catering",
  "service_date": "2025-10-21",
  "cutoff_at": "2025-10-21T11:00:00+02:00",
  "kitchen_sheet": [
    {"dish_id":"d1","name":"Gazpacho","course":"first","qty":12,"tags":["vegan","gf"]},
    {"dish_id":"d2","name":"Merluza plancha","course":"second","qty":6,"tags":["gf"]}
  ],
  "packing_sheet": [
    {"employee_id":"e1","employee_name":"Laura G.","company":"Facebook",
     "selection":{"first":"Gazpacho","second":"Merluza","dessert":"Fruta"},
     "label_qr":"qr-token"},
    {"employee_id":"e2","employee_name":"Pedro M.","company":"Facebook",
     "selection":{"first":"Ensalada","second":"Pollo","dessert":"Yogur"}}
  ]
}

```

## `delivery.marked_delivered`

```json
{
  "tenant_empresa": "uuid-empresa",
  "tenant_catering": "uuid-catering",
  "service_date": "2025-10-21",
  "delivered_list": [
    {"order_id":"o1","employee_id":"e1","timestamp":"2025-10-21T13:12:10+02:00"},
    {"order_id":"o2","employee_id":"e2","timestamp":"2025-10-21T13:14:03+02:00"}
  ],
  "by": {"role":"courier","user_id":"u123"}
}

```

## `billing.monthly_closed`

```json
{
  "period":"2025-10",
  "tenant_empresa":"uuid-empresa",
  "tenant_catering":"uuid-catering",
  "lines":[
    {"date":"2025-10-21","employee_id":"e1",
     "selection":{"first":"Gazpacho","second":"Merluza","dessert":"Fruta"},
     "menu_type":"full","status":"DELIVERED","amount":10.00}
  ],
  "totals":{"amount":3200.00,"company_share":2000.00,"employee_share":1200.00},
  "exports":{"invoice_pdf":"url","erp_csv":"url","payroll_csv":"url"}
}

```

---

# 5) APIs mínimas (por dominio)

## Empleado (portal)

- `POST /orders` (crear/confirmar).
- `PATCH /orders/{id}` (cambiar plato/cancelar).
- `GET /orders?week=YYYY-WW` (listado semanal).
- `GET /menus?date=YYYY-MM-DD` (opciones diarias).
- **Restricciones server-side**: nunca > 11 €, bloqueo tras cutoff.

## Empresa (RRHH/Finanzas)

- `GET /company/orders?date=…`
- `GET /company/consumption?period=…`
- `GET /company/invoices`
- `GET /company/exports/{type}` (erp_csv, payroll_csv)
- `PATCH /company/policy` (copago, cutoff, etc.)

## Catering

- `GET /kitchen/sheet?date=…`
- `GET /packing/sheet?date=…`
- `POST /delivery/mark` (entregas masivas)
- `POST /issues` (reportar)
- `POST /invoices` (subir/emitir)

---

# 6) Dependencias temporales (core del flujo)

- **Antes de 11:00**: todo es editable por el empleado (y visible para RRHH).
- **11:00**: el sistema **bloquea**; solo RRHH puede forzar cambios con marca de excepción.
- **11:05**: el sistema **consolida** y **empuja** al catering (cocina + empaquetado).
- **Entrega**: el catering reporta estado por empleado; esto alimenta facturación.
- **23:59**: snapshot firmado (base fiscal).
- **Mes siguiente Día 1**: facturación/exports.

---

# 7) Errores y compensaciones (controles duros)

| Caso | Regla | Consecuencia |
| --- | --- | --- |
| Empleado cancela 10:58 | Válido | no facturable |
| Empleado intenta 11:02 | Bloqueado | sugerir incidencia si hay causa |
| RRHH fuerza 11:10 | Permitido con motivo | `LOCKED_AFTER_CUTOFF`, reglas de cobro parcial |
| Catering sin stock segunda | Cambio con justificación | etiqueta “sustitución” en factura |
| Pedido marcado entregado pero no recogido | `NO_SHOW` | política de empresa define cobro |
| Incidencia abierta | hold | línea no se liquida hasta cierre |

**Idempotencia y duplicados**: todos los endpoints de escritura aceptan `Idempotency-Key`.

**Reintentos**: colas con backoff exponencial (5, 30, 120s) y DLQ.

---

# 8) Visibilidad y trazabilidad (lo que ve cada rol)

- **Empleado:** su calendario, estado, hora límite, historial y calorías.
- **Empresa (RRHH):** lista de día/semana, quién cambió qué y cuándo (timeline por pedido), motivo y regla aplicada.
- **Catering:** hoja de cocina consolidada por plato, empaquetado por empleado, entregas y cambios post-cutoff destacados.
- **Súper admin:** auditoría completa + PDFs/CSV firmados + comparativas.

---

# 9) SLAs y alertas (operación)

- **Recordatorios automáticos**: 10:30 (selección), 10:55 (último aviso).
- **Alertas de ruptura**:
    - Catering no recoge consolidado 11:10.
    - Empresa con >20% de cancelaciones post-cutoff.
    - Entregas con puntualidad < 95% 7d.
- **SLOs**:
    - Consolidación ≤ 2 min tras cutoff.
    - Entrega de hojas al catering ≤ 60s.
    - Tiempo medio de resolución de incidencias < 24h.

---

# 10) Privacidad y cumplimiento

- **Nominatividad** visible solo para su tenant y catering asignado.
- **Hash de integridad** por registro de pedido y por snapshot diario.
- **Logs inmutables** (`append-only`) con sello horario.
- **Retención**: 4 años (fiscal); RGPD: derecho de acceso/olvido (con custodia fiscal).

---

# 11) Resumen accionable

1. Implementa **máquina de estados** única y eventos clave (cutoff/consolidado/entrega/cierre).
2. Todo cambio genera **versión** y alimenta facturación automáticamente.
3. Define **contratos JSON** mínimos (kitchen/packing/delivery/billing).
4. Refuerza **controles temporales** (11:00/11:05) como columna vertebral del sistema.
5. Cierra cada día con **snapshot firmado** y cada mes con **exports** (ERP + nómina).
6. Alerta proactiva de **desviaciones** (stock, puntualidad, cancelaciones).

---

# Diseño la BBDD

**de arriba abajo**, multi-tenant, auditable y preparada para escalado. Incluyo **tablas, claves, relaciones, índices, versionado**, snapshots, y notas de seguridad. Usa PostgreSQL.

# 0) Principios de diseño (imprescindibles)

- **Multi-tenant lógico**: casi todas las tablas con `tenant_id`. Dos tipos de tenant: `empresa` y `catering`. El **súper admin** opera con `tenant_id = root`.
- **RBAC**: roles/permissions por tenant.
- **Append-only para auditoría**: nada “desaparece”; se versiona.
- **PII cifrada** (column-level) y **hash de integridad** en pedidos/snapshots.
- **Índices por acceso real**: fecha, tenant, estado.
- **Soft delete** (`deleted_at`) salvo en logs/snapshots.
- **Particionado** por fecha en tablas de alto volumen (pedidos, eventos, logs, snapshots).

---

# 1) Núcleo de multitenencia y usuarios

### tenants

- `id (uuid, PK)`
- `type (empresa|catering|root)`
- `name`
- `subdomain` (único)
- `config jsonb` (branding, idioma, moneda, límites…)
- `status (active|suspended)`
- `created_at, updated_at`

**Índices**: `UNIQUE(subdomain)`, `type`, `status`

### users

- `id (uuid, PK)`
- `tenant_id (fk tenants)`
- `email (unique within tenant)`
- `password_hash` (o SSO id)
- `name_enc` (cifrado)
- `phone_enc` (opcional, cifrado)
- `mfa_enabled bool`
- `status (active|disabled)`
- `created_at, updated_at`

**Índices**: `(tenant_id, email)`, `status`

### roles

- `id`
- `tenant_id`
- `name` (admin_empresa, finanzas, manager_sede, empleado, chef, logística, admin_catering…)
- `permissions jsonb` (lista granular)

### user_roles

- `user_id (fk users)`
- `role_id (fk roles)`
- `assigned_by, created_at`

### api_keys (para integraciones / webhooks ingresos)

- `id`
- `tenant_id`
- `name`
- `key_hash`
- `scopes jsonb`
- `created_at, last_used_at, revoked_at`

---

# 2) Catálogos globales (heredables)

### catalog_allergens

- `id`
- `code` (UE 1169/2011)
- `name`

### catalog_labels

- `id`
- `code` (vegano, sin_gluten…)
- `name`

### catalog_holidays

- `id`
- `country`, `region`, `date`, `name`

### catalog_incident_types

- `id`, `code`, `name`, `severity (low|med|high)`

### catalog_zones

- `id`
- `name`
- `geo jsonb` (polígono, CPs)

> Estas tablas no llevan tenant. Se referencian o se copian como configuración por tenant cuando aplique.
> 

---

# 3) Estructura del catering (oferta de platos y logística)

### restaurants (alias caterings)

- `id (uuid, PK)`
- `tenant_id (fk tenants, type=catering)`
- `display_name`
- `zones jsonb` (ids de catalog_zones o CPs)
- `documents_status (ok|warning|blocked)`
- `created_at, updated_at`

### restaurant_documents

- `id`
- `tenant_id` (catering)
- `type (registro_sanitario|RC|manipuladores…)`
- `file_url`
- `issued_at, expires_at`
- `status (valid|expiring|expired)`
- `verified_by, verified_at`

**Índices**: `(tenant_id, status)`, `expires_at`

### dishes (platos)

- `id`
- `tenant_id` (catering)
- `name`
- `course (first|second|dessert)`
- `labels jsonb` (alérgenos/etiquetas)
- `nutri jsonb` (kcal, macros)
- `base_price numeric(8,2)`
- `active bool`
- `created_at, updated_at`

**Índices**: `(tenant_id, course, active)`

### dish_schedules (disponibilidad del plato por día)

- `id`
- `tenant_id` (catering)
- `dish_id`
- `date`
- `stock_limit int` (opcional)
- `visible_to jsonb` (todas|empresas específicas|zonas)
- `price_override numeric(8,2)` (opcional)
- `status (published|hidden)`

**Claves/Índices**: `UNIQUE(tenant_id, dish_id, date)`, `(date, tenant_id)`

> Con esto el catering configura “x primeros, x segundos, x postres por día”.
> 

---

# 4) Estructura de empresa (políticas y personal)

### companies

- `id`
- `tenant_id (empresa)`
- `legal_name, cif`
- `billing_address`
- `plan (starter|growth|enterprise)`
- `created_at`

### company_sites (sedes/centros)

- `id`
- `tenant_id (empresa)`
- `name`
- `address`
- `zone_id (fk catalog_zones, opcional)`
- `delivery_window (time range)`
- `manager_user_id (fk users)`
- `active bool`

### company_policy

- `id`
- `tenant_id (empresa)`
- `cutoff_time (time)` (ej. 11:00)
- `days_active jsonb` (ej. [L,M,X,J])
- `limit_per_day numeric(8,2)` (default 11.00)
- `copay_company numeric(8,2)` (ej. 5.00)
- `copay_employee numeric(8,2)` (ej. 5.00)
- `no_show_rule (charge|no_charge|partial)`
- `applies_to_sites jsonb` (scope)
- `effective_from, effective_to (opcional)`

### employees

- `id`
- `tenant_id (empresa)`
- `user_id (fk users)` ← empleado usa su usuario
- `site_id (fk company_sites)`
- `status (active|inactive)`
- `diet_prefs jsonb` (alergias, vegetariano, cal objetivo)
- `created_at, updated_at`

**Índices**: `(tenant_id, site_id, status)`

---

# 5) El pedido (nominativo, versionado y auditable)

### orders (estado **actual** del pedido)

- `id (uuid, PK)`
- `tenant_empresa` (fk tenants)
- `tenant_catering` (fk tenants)
- `employee_id (fk employees)`
- `service_date (date)`
- `site_id (fk company_sites)`
- `selection jsonb`
    
    ```json
    {
      "first": {"dish_id":"...", "name":"Gazpacho"},
      "second":{"dish_id":"...", "name":"Merluza"},
      "dessert":{"dish_id":"...", "name":"Yogur"},
      "menu_type":"full|half"
    }
    
    ```
    
- `price numeric(8,2)` (valor final usado para factura, calculado)
- `status (draft|confirmed|cancelled_before_cutoff|locked_after_cutoff|delivered|no_show|issue_reported|compensated|rejected)`
- `status_changed_at`
- `locked_at` (cuando pasa cutoff)
- `created_by (user_id)`
- `last_modified_by (user_id)`
- `version int` (última)
- `integrity_hash` (sha256 de campos clave)
- `created_at, updated_at`

**Claves/Índices**:

- `UNIQUE(tenant_empresa, employee_id, service_date)` (1 pedido por día/empleado)
- `(tenant_catering, service_date)`
- `(service_date, status)`

### order_history (todas las **versiones**)

- `id`
- `order_id`
- `version int`
- `changed_at`
- `changed_by (user_id)`
- `change_reason (enum)` (user_edit, rrhh_override, stock_substitution, cancel_before_cutoff, cancel_after_cutoff, delivery_mark…)
- `prev_values jsonb` (diff opcional)
- `new_values jsonb`
- `integrity_hash`

**Índices**: `(order_id, version)`

### delivery_events (entregas/logística)

- `id`
- `order_id`
- `timestamp`
- `marked_by (user_id/role courier)`
- `event (packed|out_for_delivery|delivered|failed)`
- `notes`

**Índices**: `(order_id)`, `(timestamp)`

# 6) Consolidación diaria y empaquetado

### kitchen_sheets (resumen por plato)

- `id`
- `tenant_catering`
- `service_date`
- `generated_at`
- `content jsonb`
    
    ```json
    [{"dish_id":"...","course":"first","qty":12}, ...]
    
    ```
    
- `signature_hash`

**Índices**: `(tenant_catering, service_date)`

### packing_sheets (nominativo por empresa)

- `id`
- `tenant_catering`
- `tenant_empresa`
- `service_date`
- `generated_at`
- `content jsonb` (empleado → selección; etiquetas)
- `signature_hash`

**Índices**: `(tenant_catering, tenant_empresa, service_date)`

> Estas se regeneran tras cutoff (11:05) y se persisten como prueba.
> 

---

# 7) Incidencias y calidad

### incidents

- `id`
- `tenant_empresa`
- `tenant_catering`
- `order_id (nullable)` (incidencias de pedido)
- `type_id (fk catalog_incident_types)`
- `severity`
- `opened_by (user_id|system)`
- `status (open|in_progress|resolved|compensated)`
- `resolution jsonb` (crédito, reembolso, sustitución)
- `created_at, updated_at, resolved_at`

**Índices**: `(tenant_empresa, status)`, `(tenant_catering, status)`

### restaurant_audits

- `id`
- `tenant_catering`
- `audit_type (sanitaria|operativa|satisfaccion)`
- `score int`
- `report_url`
- `audited_at`
- `audited_by`

---

# 8) Facturación y pagos

### invoices (emitidas por el catering a la empresa)

- `id`
- `tenant_catering`
- `tenant_empresa`
- `period (YYYY-MM)`
- `number` (serie + correlativo)
- `issue_date`
- `due_date`
- `subtotal numeric`
- `tax_rate numeric` (IVA 10% hostelería)
- `tax_amount numeric`
- `total numeric`
- `status (draft|issued|sent|paid|void)`
- `pdf_url`
- `created_at, updated_at`

**Índices**: `(tenant_empresa, period)`, `(tenant_catering, period)`

### invoice_lines

- `id`
- `invoice_id`
- `date`
- `order_id`
- `employee_id`
- `concept` (texto: Gazpacho+Merluza+Yogur)
- `amount`
- `facturable_flag (full|half|none)`
- `note` (sustitución, cancelación tardía…)

**Índices**: `(invoice_id)`, `(date)`

### payouts (liquidaciones a catering) – si intermedias pagos

- `id`
- `tenant_catering`
- `period`
- `amount`
- `status (pending|processing|paid|failed)`
- `processed_at`

### company_exports (contabilidad / nómina)

- `id`
- `tenant_empresa`
- `period`
- `type (erp_csv|payroll_csv|summary_pdf)`
- `file_url`
- `created_at`

---

# 9) Políticas, plantillas e integraciones

### policies_global (root)

- `id`
- `key` (cutoff_default, iva_food, iva_service, retention_years…)
- `value jsonb`
- `effective_from, effective_to`

### tenant_overrides

- `id`
- `tenant_id`
- `key`
- `value jsonb`

### integrations

- `id`
- `tenant_id`
- `type (ERP|SSO|Payments|Messaging)`
- `config jsonb`
- `status`

### webhooks

- `id`
- `tenant_id`
- `event (orders.consolidated|delivery.marked|billing.closed…)`
- `target_url`
- `secret`
- `active bool`
- `created_at`

### webhook_deliveries

- `id`
- `webhook_id`
- `event_id`
- `status (200|…)`
- `retries int`
- `last_attempt_at`
- `payload jsonb`

---

# 10) Auditoría, eventos y snapshots legales

### audit_logs (inmutable / append-only)

- `id`
- `tenant_id (nullable para root/global)`
- `actor_user_id`
- `action (create|update|delete|impersonate|policy_change|billing_run…)`
- `entity (orders|invoices|policy|user|dish…)`
- `entity_id`
- `diff jsonb` (antes / después)
- `ip, ua`
- `timestamp`
- `hash` (hash encadenado para tamper-evidence)

**Índices**: `(tenant_id, entity, entity_id)`, `timestamp`

### event_store (si quieres event sourcing light)

- `id`
- `tenant_id`
- `event_type`
- `payload jsonb`
- `occurred_at`
- `processed bool`

**Índices**: `(tenant_id, event_type, occurred_at)`

### daily_snapshots (cierre diario)

- `id`
- `tenant_empresa`
- `tenant_catering`
- `service_date`
- `generated_at`
- `orders_summary jsonb` (por plato, por empleado, por estado)
- `sign_hash`
- `file_url (pdf/csv)`

**Índices**: `(tenant_empresa, service_date)`, `(tenant_catering, service_date)`

---

# 11) Rendimiento, índices y partición

**Particionar por rango de fecha**:

- `orders` por mes (`service_date`).
- `order_history` por mes (`changed_at`).
- `audit_logs` y `event_store` por mes (`timestamp/occurred_at`).
- `daily_snapshots` por mes.

**Índices clave adicionales**:

- `orders (tenant_empresa, service_date, employee_id)`
- `orders (tenant_catering, service_date, status)`
- `invoices (tenant_empresa, period, status)`
- `invoice_lines (invoice_id, date)`
- `incidents (tenant_empresa, status, created_at)`

**Vistas materializadas** (refresco horario):

- `vw_kpis_tenant_empresa(period)` (adopción, gasto, copago)
- `vw_kpis_tenant_catering(period)` (volumen, puntualidad, incidencias)
- `vw_top_dishes(period)`

---

# 12) Seguridad y privacidad (DB)

- **Cifrado por columna**: `users.name_enc`, `users.phone_enc`, datos personales en `employees`, cualquier PII.
- **Separación de secretos**: claves en vault; no en DB.
- **Row Level Security (opcional)**: RLS por `tenant_id` para añadir otra barrera (además del middleware).
- **Temporalidad explícita**: todas las fechas con TZ; guarda `cutoff_time` aplicado en cada pedido (por si cambia la policy).
- **Retención**: `daily_snapshots` y `invoices` mín. 4 años.

---

# 13) Flujo de datos crítico (cómo encaja todo)

1. **Catering** publica `dish_schedules` por día.
2. **Empleado** crea/edita `orders` (selection jsonb) → `order_history` registra versiones.
3. **11:00 cutoff** → update masivo `locked_at`, `status` → genera `kitchen_sheets` y `packing_sheets`.
4. **Entrega** → `delivery_events` marca `delivered`.
5. **23:59** → `daily_snapshots` con `sign_hash`.
6. **Fin de mes** → `invoices` + `invoice_lines` (usa `orders` facturables y su `price`) → `company_exports`.
7. **Incidencias** ajustan `invoice_lines.facturable_flag`.

---

# 14) Qué evita disputas (reglas en DB)

- **Constraint**: `orders.price <= company_policy.limit_per_day` en el **momento de confirmación** (guarda copia del límite aplicado).
- **Trigger** en `orders` que, tras cutoff, **prohíbe** updates salvo por `role in (rrhh, admin)` y registra `change_reason = rrhh_override`.
- **Factura** solo incluye `orders.status IN ('delivered','locked_after_cutoff' con regla de cobro parcial)` y **excluye** `issue_reported` hasta `resolved`.

---

# 15) Roadmap técnico corto (DB)

1. Núcleo: tenants, users, roles, companies, employees.
2. Catering: dishes, dish_schedules.
3. Pedidos: orders + order_history + delivery_events.
4. Consolidación: kitchen_sheets + packing_sheets.
5. Facturación: invoices + invoice_lines + exports.
6. Incidencias + documentos + auditorías.
7. Auditoría global, event_store, daily_snapshots.
8. Particionado e índices finos (cuando haya volumen).

# Plan de ejecución

Vamos a ordenar **el desarrollo por paneles**, de arriba abajo, sin olvidar nada. Para que funcione, meto **una capa base previa** que todos comparten y, en cada panel, te doy: alcance MVP, vistas, APIs, permisos, dependencias y “definition of done” (DoD). Así construyes en cadena: **Súper Admin → Catering → Empresa → Empleado** (con stubs donde haga falta).

---

# 0) Base común (antes de tocar paneles)

Imprescindible y mínima.

- **Multitenancy + Auth + RBAC**: subdominio→`tenant_id`, JWT con `tenant_id` y `role`, impersonación segura.
- **Esquema BBDD**: `tenants, users, roles, companies, restaurants, dishes, dish_schedules, orders, order_history, invoices…` (el que ya definimos).
- **Jobs/cron**: `cutoff` 11:00, `consolidación` 11:05, snapshot 23:59.
- **Auditoría**: `audit_logs` append-only, `integrity_hash` en pedidos/snapshots.
- **UI kit**: layouts, tablas, filtros, export CSV/PDF, toasts, modales.
- **Feature flags**: IA nutrición off al principio.

**DoD base**: login multi-tenant, creación de tenant, roles activos, logs y cutoff funcionando en vacío.

---

# 1) Panel **Súper Admin** (capa superior)

## Alcance MVP (operable)

- **Dashboard** global: empresas activas, caterings activos, pedidos hoy, incidencias abiertas, % puntualidad, ingresos mes.
- **Tenants**: listado + alta/edición/suspensión de **empresa** y **catering**.
- **Impersonación**: “Ver como” empresa/catering con barra de contexto.
- **Catálogos globales**: alérgenos, tipos de incidencia, festivos, zonas.
- **Políticas globales**: hora cutoff por defecto, IVA, retención, SLA incidencias.
- **Logs** y auditoría visibles y filtrables.

## Vistas

- Dashboard, Tenants, Catálogos, Políticas, Auditoría/Logs, Salud del sistema.

## APIs mínimas

- `POST/GET/PATCH /admin/tenants`
- `GET /admin/kpis`
- `GET/PUT /admin/policies`
- `GET /admin/logs?tenant=…`
- `POST /admin/impersonate`

## Permisos

- `super_admin`: todo.
- `auditor`: solo lectura.

## Dependencias

Base común lista. No necesita pedidos reales (puedes mostrar KPIs=0).

## DoD

- Crear/editar tenants, impersonar sin fuga de datos, catálogos/políticas persistidas, logs filtrables, dashboard con KPIs correctos.

---

# 2) Portal **Catering**

*Pensado para operación real de cocina y logística. Como aún no existe el empleado, usaremos **stubs** para generar pedidos de prueba desde Súper Admin.*

## Alcance MVP

- **Menús/platos**: CRUD de platos (nutrición, etiquetas) y **programación diaria** por tipo (primeros/segundos/postres), con stock opcional.
- **Consolidación** (consume cron): **Hoja de cocina** (conteo por plato) y **Hoja de empaquetado** (por empresa/empleado).
- **Operación**: marcar **preparado / empaquetado / entregado**, incidencias de entrega.
- **Facturación básica**: generar factura del periodo (con líneas por pedido entregado).
- **Documentación**: subir/estado de certificados con alertas de caducidad.

## Vistas

- **Dashboard operativo** (hoy): totales por plato, empresas de entrega, alertas.
- **Pedidos**: día→ hoja de cocina / empaquetado / entregas.
- **Menús**: calendario de platos por día (x primeros, x segundos, x postres).
- **Empresas & zonas** (lectura + notas operativas).
- **Incidencias** (del catering).
- **Facturación** (emitidas / borrador).
- **Documentación**.

## APIs mínimas

- `POST/GET /catering/dishes`
- `POST/GET /catering/dish-schedules`
- `GET /catering/kitchen-sheet?date=…`
- `GET /catering/packing-sheet?date=…`
- `POST /catering/deliveries/mark`
- `POST/GET /catering/invoices`
- `POST /catering/incidents`

## Roles

- **Admin catering**: todo.
- **Chef**: menús + hoja de cocina.
- **Cocinero**: solo hoja de cocina.
- **Reparto**: empaquetado/entregas + incidencias.
- **Finanzas**: facturas.

## Dependencias

- Base + Súper Admin.
- **Stub de pedidos**: desde admin, botón “generar pedidos fake” por fecha/empresa para probar consolidación y facturas hasta que exista el empleado.

## DoD

- Publicar semana de platos, ver consolidación a las 11:05, imprimir cocina/empaquetado, marcar entregas, emitir factura básica; todo auditable.

---

# 3) Portal **Empresa** (RRHH/Finanzas/Manager)

*Una vez catering produce hojas, la empresa necesita gobernanza y contabilidad.*

## Alcance MVP

- **Configuración del beneficio**: días activos, cutoff, copago (empresa/empleado), centros de coste/sedes, catering asignado.
- **Empleados**: alta por CSV/SSO, asignación de sede, preferencias alimentarias.
- **Pedidos & consumo**: vista diaria/semanal por empleado y por sede (lectura en MVP).
- **Facturación & export**: ver facturas, **export ERP (CSV)**, **export nómina (copagos)**.
- **Incidencias**: abrir/gestionar con catering; bloqueo de facturación línea mientras esté abierta.
- **Comunicaciones**: recordatorios (elige antes 11:00) y avisos.

## Vistas

- Dashboard empresa (adopción, gasto empresa vs empleado, incidencias).
- Empleados y roles.
- Pedidos/Consumo (día/semana/mes).
- Configuración (políticas, sedes, copagos).
- Facturación (facturas + export ERP/Nómina).
- Incidencias.

## APIs mínimas

- `POST/GET /company/policy`
- `POST/GET /company/employees`
- `GET /company/orders?range=…`
- `GET /company/invoices`
- `GET /company/exports?type=erp_csv|payroll_csv`
- `POST/GET /company/incidents`

## Roles

- **RRHH/Admin**: todo.
- **Finanzas**: facturas/exports.
- **Manager sede**: pedidos de su sede + incidencias.

## Dependencias

- Catering listo (para ver consolidaciones y facturas), trabajos de cutoff y consolidación operativos.

## DoD

- Crear política y sedes, cargar empleados, ver pedidos/consumo, descargar ERP CSV y nómina, abrir/cerrar incidencias; datos coherentes con catering.

---

# 4) Portal **Empleado**

*Último porque depende de todo lo anterior y es donde validas adopción real.*

## Alcance MVP

- **Selección semanal** por días (L–J) con **catálogo modular** (elige 1º, 2º, postre).
- **Reglas duras**: límite ≤ 11€, hora límite visible y aplicada; cancelación hasta 11:00.
- **Mis pedidos**: estado, cambios, cancelación, trazabilidad simple.
- **IA básica** (fase 1): sugerencia “equilibrada” según preferencias y calorías objetivo (sin auto-selección).
- **Soporte**: abrir incidencia sobre pedido concreto.

## Vistas

- Dashboard personal (hoy + semana).
- Selección por día (fotos, etiquetas, calorías).
- Mis pedidos (timeline).
- Nutrición (resumen simple).
- Soporte.

## APIs mínimas

- `GET /menus?date=…` (desde dish_schedules del catering)
- `POST /orders` (crear/confirmar)
- `PATCH /orders/{id}` (cambiar/cancelar)
- `GET /orders?week=…`
- `POST /incidents`

## Dependencias

- Catering (platos programados), Empresa (política y sedes), cron de cutoff, consolidación.

## DoD

- El lunes el usuario puede configurar la semana en <3 min, ver restricciones, recibir confirmación, y la consolidación del catering refleja sus elecciones. Incidencias abiertas bloquean facturación de esa línea.

---

## Cómo encajan los **stubs** sin romper el flujo

- Entre **Súper Admin** y **Catering**, genera pedidos dummy por fecha para probar cocina/empaquetado y facturas.
- Cuando “Empleado” esté listo, desactiva el stub y usa pedidos reales.

---

## Riesgos y cómo los mitigas

- **Trazabilidad:** actívala desde el MVP (order_history append-only).
- **Facturación:** reglas de facturabilidad desde el MVP (cancel antes/después de cutoff).
- **Seguridad:** impersonación con expiración y logs; RLS opcional por `tenant_id`.
- **Escalado:** particiona `orders` por mes; cachea menús diarios (Redis).
- **UX del empleado:** reduce fricción (duplicar día, IA sugerida, recordatorios 10:30/10:55).

---

## Orden de construcción (resumen ejecutable)

1. **Base** (auth, tenants, RBAC, cron, logs).
2. **Súper Admin** (tenants, catálogos, políticas, impersonación).
3. **Catering** (menús, consolidación, cocina/empaquetado, entregas, factura básica) + **stub pedidos**.
4. **Empresa** (políticas, empleados, consumo, export ERP/nómina, incidencias).
5. **Empleado** (selección semanal, reglas, mis pedidos, IA básica, soporte).
6. **Cierre**: integrar todo, quitar stub, pruebas E2E de cutoff→consolidación→entrega→factura→export.