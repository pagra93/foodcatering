# Project Registry — comidas-plataforma

Inventario técnico puro. Una fila = un asset. No es decisiones, es hechos.
Last updated: 2026-04-18 · Total assets: 36 modelos + 45 API routes +
30+ componentes + 25+ queries.

## Reglas de llenado

- **Granularidad**: una fila por asset. Si `empresa-empleados.ts` exporta
  6 funciones, son 6 filas en "Services & Utilities".
- **Ortografía española** en descripciones: acentos, ñ, ¿, ¡.
- **Inventario puro**, no decisiones. Para decisiones: `docs/working-docs/<feature>/architecture.md` o ADR.
- **Categorías base obligatorias** (6): DB Models, API Endpoints, Shared
  Components, Services & Utilities, Types & Interfaces, External
  Integrations. Nunca se eliminan.

## Quick Reference
<!-- SUMMARY -->
**DB**: 36 modelos (tenants, companies, orders, dishes, delivery_routes, invoices, etc.)
**API**: 45 rutas (admin, empresa, catering, empleado, auth, rutas/entregas/facturas)
**Components**: 27 shadcn UI + ~100 de dominio (admin/empresa/catering/empleado/shared)
**Services**: `lib/auth/*`, `lib/db/queries/*` (25+ funciones por dominio), `lib/crypto/pii`, `lib/ratelimit`
**Types**: `types/index.ts`, `types/next-auth.d.ts`, `lib/types/diet-prefs.ts`
**Integrations**: ninguna activa (ERP/SMTP/S3 previstas)
<!-- /SUMMARY -->

## DB Models
<!-- CATEGORY:db -->

### Multi-tenancy (3)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `tenants` | `id`, `type` (ROOT/EMPRESA/CATERING), `subdomain`, `status` | users, companies, restaurants | Multi-tenant core | ✅ |
| `users` | `id`, `tenantId`, `email`, `nameEnc`, `phoneEnc`, `role`, `status` | tenant, employees, deliveryRoutes | Auth | ✅ |
| `employees` | `id`, `tenantId`, `userId`, `siteId`, `employeeNumber`, `dietPrefs`, `status` | user, site, ratings | RRHH + portal empleado | ✅ |

### Empresas (6)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `companies` | `id`, `tenantId`, `legalName`, `cif`, `plan` | tenant, sites, policy, invoices | Portal empresa | ✅ |
| `company_sites` | `id`, `companyId`, `name`, `address`, `latitude`, `longitude` | company, employees, deliveryRouteSites | Sedes | ✅ |
| `company_policies` | `id`, `companyId`, `cutoffTime`, `limitPerDay`, `noShowRule`, `blockAllergensEnabled` | company, history | Política fiscal | ✅ |
| `company_policy_history` | `id`, `policyId`, `previousValues`, `newValues`, `version` | policy, company | Auditoría política | ✅ |
| `company_settings` | `id`, `companyId`, `notificationsEmail`, `notify*` flags | company | Preferencias portal | ✅ |
| `company_catering_assignments` | `id`, `companyId`, `tenantCatering`, `type`, `zones`, `slaPunctuality` | company | Asignación catering | ✅ |

### Catering (4)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `restaurants` | `id`, `tenantId`, `legalName`, `cif`, `cutoffTime`, `zones` | tenant, documents, dishes | Portal catering | ✅ |
| `restaurant_documents` | `id`, `restaurantId`, `type`, `expiresAt`, `status` | restaurant | Docs sanitarios | ✅ |
| `restaurant_audits` | `id`, `tenantCatering`, `auditType`, `score`, `auditedAt` | (sin FK directa) | Auditorías operativas | ✅ |
| `dishes` | `id`, `tenantId`, `restaurantId`, `name`, `course`, `description`, `ingredients`, `labels`, `basePrice` | restaurant, schedules | Menú | ✅ |
| `dish_schedules` | `id`, `tenantId`, `dishId`, `date`, `stockLimit`, `priceOverride`, `status` | dish | Calendario menús | ✅ |

### Pedidos (5)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `orders` | `id`, `tenantEmpresa`, `tenantCatering`, `employeeId`, `siteId`, `serviceDate`, `selection`, `status`, `notes`, `routeId`, `invoiceId`, `integrityHash` | route, invoice, history, deliveryEvents, incidents, deliveryProof, rating | Core del sistema | ✅ |
| `order_history` | `id`, `orderId`, `version`, `prevValues`, `newValues`, `integrityHash` | order | Versionado | ✅ |
| `order_ratings` | `id`, `orderId`, `employeeId`, `rating` (1-5), `comment` | order, employee | Valoración empleado | ✅ |
| `delivery_events` | `id`, `orderId`, `event`, `timestamp`, `markedBy` | order | Tracking entrega | ✅ |
| `delivery_proofs` | `id`, `orderId`, `deliveredAt`, `proofType`, `proofUrl`, `recipientName`, `latitude`, `longitude`, `verificationHash` | order | Justificante entrega | ✅ |

### Rutas de reparto (3 — nuevas en migración 20260418)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `delivery_routes` | `id`, `tenantId`, `name`, `date`, `deliveryUserId`, `status`, `startedAt`, `completedAt` | deliveryUser, sites, orders, events | Planificación rutas | ✅ |
| `delivery_route_sites` | `id`, `routeId`, `companySiteId`, `sequence` | route, companySite | Paradas por ruta | ✅ |
| `delivery_route_events` | `id`, `routeId`, `type`, `timestamp`, `metadata` | route | Tracking rutas (GPS, inicio, fin, incidencias) | ✅ |

### Facturación (4)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `invoices` | `id`, `tenantCatering`, `tenantEmpresa`, `companyId`, `period`, `number`, `subtotal`, `total`, `snapshot`, `integrityHash`, `status` | company, lines, orders | Facturación mensual | ✅ |
| `invoice_lines` | `id`, `invoiceId`, `date`, `orderId`, `employeeId`, `concept`, `amount`, `facturableFlag` | invoice | Línea por pedido | ✅ |
| `fiscal_reports` | `id`, `tenantEmpresa`, `periodYear`, `periodMonth`, `deductibilityRate`, `signatureHash` | (sin FK) | Informe fiscal mensual | ✅ |
| `company_exports` | `id`, `tenantEmpresa`, `period`, `type` (ERP_CSV, PAYROLL_CSV, SUMMARY_PDF), `fileUrl` | (sin FK) | Exports ERP | ✅ |

### Operación (2)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `kitchen_sheets` | `id`, `tenantCatering`, `serviceDate`, `content`, `signatureHash` | (sin FK) | Lista platos cocina | ✅ |
| `packing_sheets` | `id`, `tenantCatering`, `tenantEmpresa`, `serviceDate`, `content`, `signatureHash` | (sin FK) | Lista empaquetado | ✅ |

### Incidencias y compliance (3)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `incidents` | `id`, `tenantEmpresa`, `tenantCatering`, `orderId`, `type`, `severity`, `description`, `metadata`, `reportedBy`, `status` | order | Incidencias calidad/reparto | ✅ |
| `audit_logs` | `id`, `tenantId` (nullable para root), `actorId`, `action`, `entity`, `entityId`, `diff`, `hash` | - | Auditoría inmutable | ✅ |
| `daily_snapshots` | `id`, `tenantEmpresa`, `tenantCatering`, `serviceDate`, `ordersSummary`, `signHash`, `fileUrl` | - | Snapshot diario compliance | ✅ |

### Notificaciones y integraciones (5)
| Table | Key Fields | Relations | Feature | Status |
|-------|-----------|-----------|---------|--------|
| `notifications` | `id`, `tenantId`, `userId`, `type`, `title`, `message`, `read` | - | Inbox notificaciones | ✅ |
| `employee_invitations` | `id`, `tenantId`, `companyId`, `email`, `token`, `status` | - | Invitar empleados | ✅ |
| `integrations` | `id`, `tenantId`, `type` (ERP/SSO/PAYMENTS/MESSAGING), `config`, `status` | - | Integraciones (futuro) | ⏳ |
| `webhooks` | `id`, `tenantId`, `event`, `targetUrl`, `secret`, `active` | deliveries | Webhooks salientes | ✅ |
| `webhook_deliveries` | `id`, `webhookId`, `eventId`, `status` (HTTP code), `retries`, `payload` | webhook | Log de envíos | ✅ |

## API Endpoints
<!-- CATEGORY:api -->

### Auth (1)
| Method | Path | Auth | Feature | Status |
|--------|------|------|---------|--------|
| ALL | `/api/auth/[...nextauth]` | - | NextAuth handler | ✅ |

### Admin (7)
| Method | Path | Auth | Feature | Status |
|--------|------|------|---------|--------|
| GET | `/api/admin/tenants` | SUPER_ADMIN | Listar tenants | ✅ |
| POST | `/api/admin/tenants` | SUPER_ADMIN | Crear tenant | ✅ |
| GET | `/api/admin/tenants/[id]` | SUPER_ADMIN | Detalle tenant | ✅ |
| PATCH | `/api/admin/tenants/[id]` | SUPER_ADMIN | Actualizar tenant | ✅ |
| PATCH | `/api/admin/tenants/[id]/status` | SUPER_ADMIN | Cambiar estado tenant | ✅ |
| POST | `/api/admin/impersonate/start` | SUPER_ADMIN | Iniciar impersonación (rate limited 3/h) | ✅ |
| POST | `/api/admin/impersonate/stop` | SUPER_ADMIN | Terminar impersonación | ✅ |
| GET | `/api/admin/impersonate/status` | SUPER_ADMIN | Consultar estado impersonación | ✅ |

### Empresa (11)
| Method | Path | Auth | Feature | Status |
|--------|------|------|---------|--------|
| PATCH | `/api/empresa/configuracion/general` | ADMIN_EMPRESA | Datos generales empresa | ✅ |
| PATCH | `/api/empresa/configuracion/plan` | ADMIN_EMPRESA | Política fiscal | ✅ |
| PATCH | `/api/empresa/configuracion/preferencias` | ADMIN_EMPRESA | Settings portal | ✅ |
| GET/POST | `/api/empresa/configuracion/sedes` | ADMIN_EMPRESA, RRHH | Gestión sedes | ✅ |
| GET/PATCH | `/api/empresa/configuracion/sedes/[id]` | ADMIN_EMPRESA, RRHH | Detalle sede | ✅ |
| GET/POST | `/api/empresa/configuracion/documentos` | ADMIN_EMPRESA, RRHH, FINANZAS | Docs empresa | ✅ |
| POST | `/api/empresa/empleados` | RRHH, ADMIN_EMPRESA | Crear empleado | ✅ |
| PUT/PATCH | `/api/empresa/empleados/[id]` | RRHH, ADMIN_EMPRESA | Editar empleado | ✅ |
| GET | `/api/empresa/pedidos/export` | RRHH, ADMIN_EMPRESA, FINANZAS | CSV pedidos (rate 10/h) | ✅ |
| GET | `/api/empresa/facturacion/export` | ADMIN_EMPRESA, FINANZAS | CSV ERP | ✅ |
| GET | `/api/empresa/catering/menus` | empresa roles | Ver menús catering | ✅ |
| GET | `/api/empresa/catering/ratings` | empresa roles | Ver ratings catering | ✅ |
| GET | `/api/empresa/catering/sla` | empresa roles | Ver SLA catering | ✅ |

### Catering (15)
| Method | Path | Auth | Feature | Status |
|--------|------|------|---------|--------|
| GET | `/api/catering/dashboard` | catering roles | Dashboard catering | ✅ |
| GET/POST | `/api/catering/platos` | CHEF, ADMIN_CATERING | CRUD platos | ✅ |
| GET/PATCH/DELETE | `/api/catering/platos/[id]` | CHEF, ADMIN_CATERING | Detalle plato | ✅ |
| POST | `/api/catering/platos/[id]/clonar` | CHEF, ADMIN_CATERING | Clonar plato | ✅ |
| GET/POST/PATCH | `/api/catering/menus/*` | CHEF, ADMIN_CATERING | Calendario menús | ✅ |
| GET | `/api/catering/facturas` | FINANZAS_CATERING | Listar facturas | ✅ |
| GET | `/api/catering/facturas/[id]` | FINANZAS_CATERING | Detalle factura | ✅ |
| POST | `/api/catering/facturas/generar` | FINANZAS_CATERING | Generar factura mensual | ✅ |
| POST | `/api/catering/facturas/[id]/pagar` | FINANZAS_CATERING | Marcar pagada | ✅ |
| PATCH | `/api/catering/facturas/[id]` | FINANZAS_CATERING | Actualizar estado | ✅ |
| DELETE | `/api/catering/facturas/[id]` | FINANZAS_CATERING | Cancelar factura | ✅ |
| GET/POST/PATCH | `/api/catering/rutas/*` | ADMIN_CATERING | CRUD rutas reparto | ✅ |
| POST | `/api/catering/rutas/[id]/iniciar` | REPARTIDOR, ADMIN_CATERING | Iniciar ruta | ✅ |
| POST | `/api/catering/rutas/[id]/completar` | REPARTIDOR, ADMIN_CATERING | Completar ruta | ✅ |
| GET/POST | `/api/catering/produccion/*` | CHEF, COCINERO | Kitchen/packing sheets | ✅ |
| POST | `/api/catering/entregas/confirmar` | REPARTIDOR | Confirmar entrega | ✅ |
| POST | `/api/catering/entregas/incidencia` | REPARTIDOR | Reportar incidencia | ✅ |
| GET/POST | `/api/catering/incidencias/*` | ADMIN_CATERING | CRUD incidencias | ✅ |

### Empleado (4)
| Method | Path | Auth | Feature | Status |
|--------|------|------|---------|--------|
| POST | `/api/empleado/pedidos` | EMPLEADO | Crear/actualizar pedido | ✅ |
| POST | `/api/empleado/incidencias` | EMPLEADO | Reportar incidencia | ✅ |
| PATCH | `/api/empleado/alergenos` | EMPLEADO | Actualizar alergenos | ✅ |
| POST | `/api/empleado/cambiar-password` | EMPLEADO | Cambiar contraseña | ✅ |

## Shared Components
<!-- CATEGORY:components -->

### shadcn/ui (27) — `components/ui/`
alert, alert-dialog, avatar, badge, button, calendar, card, checkbox, command, dialog, dropdown-menu, form, input, label, loading-link, popover, progress, radio-group, select, separator, sheet, skeleton, switch, table, tabs, textarea, sonner/toast.

### Compartidos de dominio
| Component | Path | Feature | Status |
|-----------|------|---------|--------|
| `ImpersonationBanner` | `components/ImpersonationBanner.tsx` | Banner super admin impersonando | ✅ |
| `LogoutButton` | `components/LogoutButton.tsx` | Logout | ✅ |
| `Providers` | `components/providers.tsx` | QueryClient + Session + Theme | ✅ |
| `EmployeeFormComplete` | `components/shared/EmployeeFormComplete.tsx` | Form reutilizado dos portales | ✅ |

### Por portal (~100 total)
Resumen: admin (30), empresa (34), catering (23), empleado (14). Ver los
subdirectorios `components/<portal>/` para el detalle.

## Services & Utilities
<!-- CATEGORY:services -->

### `lib/auth/`
| Service | Path | Exports | Feature | Status |
|---------|------|---------|---------|--------|
| Config NextAuth | `lib/auth/config.ts` | `authConfig` | Auth multi-tenant JWT | ✅ |
| Auth handler | `lib/auth/index.ts` | `auth`, `handlers`, `signIn`, `signOut` | NextAuth v5 | ✅ |
| Session helpers | `lib/auth/session.ts` | `getRequiredSession`, `requireRole`, `requirePermission`, `requireTenantAccess`, `getScopedTenantId`, `TenantMismatchError`, `isSuperAdmin` | Protección rutas | ✅ |
| RBAC permissions | `lib/auth/permissions.ts` | `PERMISSIONS`, `hasPermission`, `canAccessTenant`, `hasRole` | RBAC 14 roles | ✅ |
| Audit log | `lib/auth/audit.ts` | `logAudit`, `logLogin`, `logLogout`, `logImpersonation` | Auditoría inmutable SHA-256 | ✅ |
| Impersonation | `lib/auth/impersonation.ts` | `startImpersonation`, `stopImpersonation`, `getImpersonationInfo`, `isImpersonating`, `canImpersonate` | Super admin impersona (15min) | ✅ |

### `lib/db/`
| Service | Path | Exports | Feature | Status |
|---------|------|---------|---------|--------|
| Prisma client | `lib/db/prisma.ts` | `prisma`, `withTenantContext`, `disconnect` | Cliente + middleware dev + RLS wrapper | ✅ |
| Index re-export | `lib/db/index.ts` | re-export de prisma.ts | Atajo | ✅ |

### `lib/db/queries/`
Una función por operación. 25+ archivos. Ver `lib/db/queries/` para el
inventario completo. Nombrado `<portal>-<dominio>.ts` (ej.
`empresa-empleados.ts`, `catering-invoices.ts`).

### Otros helpers
| Service | Path | Exports | Feature | Status |
|---------|------|---------|---------|--------|
| PII crypto | `lib/crypto/pii.ts` | `encryptPII`, `decryptPII`, `looksEncrypted` | AES-256-GCM | ✅ (no cableado) |
| Rate limiter | `lib/ratelimit.ts` | `authRateLimiter`, `impersonationRateLimiter`, `exportRateLimiter`, `getRateLimitKey` | In-memory (swap a Upstash en cluster) | ✅ |
| Tenant resolver | `lib/tenant/get-tenant.ts` | `getCurrentTenant`, `getCurrentTenantId`, `isEmpresaTenant`, `isCateringTenant`, `getTenant` | Lee headers inyectados por middleware | ✅ |
| Headers middleware | `lib/middleware/headers.ts` | helpers read tenant headers | Request headers | ✅ |
| Tenant middleware | `lib/middleware/tenant.ts` | `getSubdomainFromRequest`, `resolveTenantFromSubdomain`, `clearTenantCache` | Resolución subdomain → tenant | ✅ |
| Guards API | `lib/guards/api.ts` | `requireAuth`, `requireRoles`, `requirePermission`, `withAuth`, etc. | HOCs para rutas API | ✅ |
| Guards Component | `lib/guards/RoleGuard.tsx`, `PermissionGuard.tsx` | HOCs Server Components | Protección páginas | ✅ |
| Env validation | `lib/env.ts` | `env` (Zod validated) | Fail-fast env | ✅ |
| Utils | `lib/utils.ts` | `cn` (Tailwind class merger) | UI | ✅ |
| Dashboard utils | `lib/utils/dashboard.ts` | `getDashboardPath`, `isDashboardRoute` | Routing por rol | ✅ |
| Validations | `lib/validations/*.ts` | Zod schemas por dominio (tenant, dish, menu, delivery, invoice, production, company) | Validación inputs | ✅ |

### `lib/types/`
| Type | Path | Exports | Feature | Status |
|------|------|---------|---------|--------|
| Diet preferences | `lib/types/diet-prefs.ts` | `DietPrefs`, `dietPrefsSchema`, `parseDietPrefs` | JSON typing Employee.dietPrefs | ✅ |

## Types & Interfaces
<!-- CATEGORY:types -->
| Type | Path | Key Fields | Feature | Status |
|------|------|-----------|---------|--------|
| `TenantWithRelations` | `types/index.ts` | Prisma payload con users+companies+restaurants | Admin | ✅ |
| `TenantBasic` | `types/index.ts` | id, type, name, subdomain, status | Listados | ✅ |
| `UserSession` | `types/index.ts` | id, email, name, role, tenantId, tenantType | Session shape | ✅ |
| `DishSelection` | `types/index.ts` | first, second, dessert (dishId + name), menuType | Selección pedido | ✅ |
| `OrderStatus` | `types/index.ts` | draft, confirmed, cancelled, locked, delivered, etc. | FSM pedido | ✅ |
| `OrderWithDetails` | `types/index.ts` | Order + selection + price + timestamps | Detalle pedido | ✅ |
| `ApiResponse<T>` | `types/index.ts` | success, data, error, meta | Response API genérica | ✅ |
| `PaginatedResponse<T>` | `types/index.ts` | items, pagination | Listados paginados | ✅ |
| `FormState<T>` | `types/index.ts` | isSubmitting, isSuccess, error, data | State forms cliente | ✅ |
| `KPI`, `DashboardData` | `types/index.ts` | label, value, trend, format | Dashboards | ✅ |
| `Session` / `JWT` extends | `types/next-auth.d.ts` | `impersonationToken?` añadido | NextAuth v5 | ✅ |

## External Integrations
<!-- CATEGORY:integrations -->
| Service | Purpose | Status |
|---------|---------|--------|
| SMTP (futuro) | Envío emails invitaciones, notificaciones, facturas | ⏳ No configurado |
| S3/Object Storage (futuro) | Almacenamiento PDFs facturas, contratos, snapshots | ⏳ No configurado |
| ERP (futuro) | Export nómina/contabilidad vía `company_exports` | ⏳ Modelo listo, sin adapter |
| Sentry (futuro) | Error tracking | ⏳ Variable env prevista |
| Upstash Redis (futuro) | Rate limiting distribuido (swap del in-memory) | ⏳ Interfaz lista |

<!-- ═══════════════ CATEGORÍAS OPCIONALES ═══════════════ -->

## Hooks
<!-- CATEGORY:hooks -->
| Hook | Path | Purpose | Feature | Status |
|------|------|---------|---------|--------|
| `useAuth` | `hooks/use-auth.ts` | useSession tipado | Auth cliente | ✅ |
| `useTenant` | `hooks/use-tenant.ts` | tenantId, tenantType, flags | Multi-tenant cliente | ✅ |
| `useImpersonation` | `hooks/use-impersonation.ts` | Status + refresh | Banner impersonación | ✅ |
| `usePagination` | `hooks/use-pagination.ts` | Paginación sincronizada con URL | Tablas | ✅ |
| `useDebounce` | `hooks/use-debounce.ts` | Debounce genérico | Buscadores | ✅ |
| `useToast` | `hooks/use-toast.ts` | Wrapper sobre Sonner | Notificaciones UI | ✅ |

## Pages
<!-- CATEGORY:pages -->

50 páginas distribuidas en 6 route groups. Resumen:

| Group | Path | Páginas | Feature |
|-------|------|---------|---------|
| `(admin)` | `/admin/*` | 16 | Súper admin (dashboard, tenants, empresas, caterings, users) |
| `(empresa)` | `/empresa/*` | 15 | Portal empresa (dashboard, empleados, pedidos, facturación, incidencias, catering, auditoría, actividad, configuración) |
| `(catering)` | `/catering/*` | 14 | Portal catering (dashboard, platos, menús, producción, rutas, entregas, facturas, incidencias) |
| `(empleado)` | `/empleado/*` | 5 | Portal empleado (menús semanal, menú día, historial, perfil, incidencias) |
| `(auth)` | 6 paths | 6 | Auth (login, register, forgot-password, reset-password, verify, error) |
| `(landing)` | `/` | 1 | Landing pública |
| Global | `/unauthorized`, `/layout.tsx`, root `/page.tsx` | 3 | Páginas globales |

## Jobs (futuro)
<!-- CATEGORY:jobs -->
| Job | Trigger | Purpose | Status |
|-----|---------|---------|--------|
| `backup-prod` | Cron 3am diario en servidor | `pg_dump` de `comidas_prod` con retención 30d | ⏳ setup manual pendiente |
| Cutoff 11:00 | Cron scheduler (futuro) | Cerrar pedidos del día | ⏳ Modelo + FSM listos, scheduler pendiente |
| Consolidación 11:05 | Cron | Generar kitchen/packing sheets | ⏳ |
| Snapshot diario 23:59 | Cron | Firmar snapshot compliance IRPF | ⏳ |
| Facturas mensuales 01:00 día 1 | Cron | Generar facturas mes anterior | ⏳ Query `generateInvoice` lista, scheduler pendiente |
