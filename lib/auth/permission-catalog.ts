/**
 * CATÁLOGO COMPLETO DE PERMISOS — fuente de verdad del RBAC dinámico.
 *
 * Cada funcionalidad/sección de los 4 portales = un permiso `recurso:accion`.
 * El seed (prisma/seed-rbac.ts) inserta esto en la tabla `Permission` y crea los
 * 12 roles del sistema con sus permisos. La UI de roles deja editar/crear roles
 * sobre este catálogo.
 *
 * Convención: `recurso:accion` (en minúsculas, guiones). `view` = acceso a la
 * sección (lo usa el enforcement por sección/portal).
 */

export type PermissionPortal = 'ADMIN' | 'EMPRESA' | 'CATERING' | 'EMPLEADO'

type ActionSpec = { action: string; desc: string }
type ResourceSpec = { resource: string; label: string; actions: ActionSpec[] }

// Helpers de acciones comunes para no repetir descripciones.
const VIEW = (label: string): ActionSpec => ({ action: 'view', desc: `Ver ${label}` })
const CRUD = (label: string): ActionSpec[] => [
  { action: 'view', desc: `Ver ${label}` },
  { action: 'create', desc: `Crear ${label}` },
  { action: 'edit', desc: `Editar ${label}` },
  { action: 'delete', desc: `Eliminar ${label}` },
]

// ─── ESPECIFICACIÓN POR PORTAL ──────────────────────────────────────────────
const SPEC: Record<PermissionPortal, ResourceSpec[]> = {
  ADMIN: [
    { resource: 'dashboard', label: 'el dashboard', actions: [VIEW('el dashboard')] },
    {
      resource: 'empresa',
      label: 'empresas',
      actions: [
        VIEW('empresas'),
        { action: 'create', desc: 'Crear empresa' },
        { action: 'edit', desc: 'Editar empresa' },
        { action: 'edit-status', desc: 'Suspender/activar empresa' },
        { action: 'assign-catering', desc: 'Asignar/quitar caterings a una empresa' },
        { action: 'view-reports', desc: 'Ver reportes de empresas' },
        { action: 'view-alerts', desc: 'Ver alertas de empresas' },
      ],
    },
    {
      resource: 'catering',
      label: 'caterings',
      actions: [
        VIEW('caterings'),
        { action: 'create', desc: 'Crear catering' },
        { action: 'edit', desc: 'Editar catering' },
        { action: 'edit-status', desc: 'Suspender/activar catering' },
        { action: 'add-document', desc: 'Añadir documentos del catering' },
        { action: 'impersonate', desc: 'Impersonar usuarios del catering' },
      ],
    },
    {
      resource: 'user',
      label: 'usuarios',
      actions: [
        VIEW('usuarios'),
        { action: 'create', desc: 'Crear usuario' },
        { action: 'edit', desc: 'Editar usuario' },
        { action: 'edit-role', desc: 'Cambiar el rol de un usuario' },
        { action: 'reset-password', desc: 'Resetear contraseña' },
        { action: 'edit-status', desc: 'Suspender/reactivar usuario' },
        { action: 'delete', desc: 'Eliminar usuario' },
      ],
    },
    {
      resource: 'role',
      label: 'roles',
      actions: [
        VIEW('roles'),
        { action: 'create', desc: 'Crear rol' },
        { action: 'edit', desc: 'Editar rol y sus permisos' },
        { action: 'delete', desc: 'Eliminar rol personalizado' },
      ],
    },
    { resource: 'allergen', label: 'alérgenos', actions: CRUD('alérgenos') },
    { resource: 'calendar', label: 'calendarios', actions: CRUD('calendarios') },
    { resource: 'incident-reason', label: 'motivos de incidencia', actions: CRUD('motivos de incidencia') },
    {
      resource: 'audit',
      label: 'auditorías',
      actions: [VIEW('auditorías'), { action: 'create', desc: 'Crear auditoría' }, { action: 'edit', desc: 'Editar auditoría' }, { action: 'export', desc: 'Exportar auditoría' }],
    },
    {
      resource: 'incident',
      label: 'incidencias',
      actions: [VIEW('incidencias'), { action: 'assign', desc: 'Asignar incidencia' }, { action: 'close', desc: 'Cerrar incidencia' }],
    },
    { resource: 'rating', label: 'ratings', actions: [VIEW('ratings')] },
    {
      resource: 'penalty',
      label: 'penalizaciones',
      actions: [VIEW('penalizaciones'), { action: 'create', desc: 'Crear penalización' }, { action: 'edit', desc: 'Editar penalización' }],
    },
    { resource: 'plan', label: 'planes SaaS', actions: [VIEW('planes SaaS'), { action: 'create', desc: 'Crear plan' }, { action: 'edit', desc: 'Editar plan' }, { action: 'delete', desc: 'Eliminar plan' }] },
    { resource: 'settlement', label: 'liquidaciones', actions: [VIEW('liquidaciones'), { action: 'create', desc: 'Generar liquidación' }] },
    { resource: 'admin-invoice', label: 'facturas de comida (todas)', actions: [VIEW('todas las facturas de comida')] },
    { resource: 'saas-invoice', label: 'facturas SaaS', actions: [VIEW('facturas SaaS')] },
    { resource: 'commission', label: 'comisiones', actions: [VIEW('comisiones'), { action: 'edit', desc: 'Editar comisiones' }] },
    { resource: 'metric', label: 'métricas MRR/ARR', actions: [VIEW('métricas')] },
    { resource: 'business-plan', label: 'el modelo financiero', actions: [VIEW('el modelo financiero'), { action: 'edit', desc: 'Editar supuestos y escenarios del modelo financiero' }] },
    { resource: 'tax', label: 'impuestos', actions: [VIEW('impuestos'), { action: 'edit', desc: 'Editar impuestos' }] },
    { resource: 'integration', label: 'integraciones', actions: [VIEW('integraciones'), { action: 'configure', desc: 'Configurar integraciones' }] },
    { resource: 'webhook', label: 'webhooks', actions: CRUD('webhooks') },
    { resource: 'api-key', label: 'API keys', actions: [VIEW('API keys'), { action: 'create', desc: 'Generar API key' }, { action: 'delete', desc: 'Revocar API key' }] },
    { resource: 'retention', label: 'retención de datos', actions: [VIEW('retención'), { action: 'edit', desc: 'Editar retención' }] },
    { resource: 'dpa', label: 'DPA', actions: [VIEW('DPA'), { action: 'create', desc: 'Crear DPA' }, { action: 'edit', desc: 'Editar DPA' }] },
    { resource: 'fiscal-audit', label: 'auditoría fiscal', actions: [VIEW('auditoría fiscal'), { action: 'export', desc: 'Exportar auditoría fiscal' }] },
    { resource: 'gdpr', label: 'solicitudes RGPD', actions: [VIEW('solicitudes RGPD'), { action: 'process', desc: 'Procesar solicitud RGPD' }] },
    { resource: 'security', label: 'seguridad', actions: [VIEW('seguridad'), { action: 'run-test', desc: 'Ejecutar pentest' }] },
    { resource: 'audit-log', label: 'traza de auditoría', actions: [VIEW('la traza de auditoría')] },
    { resource: 'template-branding', label: 'branding', actions: [VIEW('branding'), { action: 'create', desc: 'Crear tema' }, { action: 'edit', desc: 'Editar tema' }] },
    { resource: 'template-communication', label: 'plantillas de comunicación', actions: [VIEW('plantillas'), { action: 'create', desc: 'Crear plantilla' }, { action: 'edit', desc: 'Editar plantilla' }] },
    { resource: 'announcement', label: 'avisos', actions: [VIEW('avisos'), { action: 'create', desc: 'Crear aviso' }, { action: 'edit', desc: 'Editar aviso' }, { action: 'publish', desc: 'Publicar aviso' }] },
    { resource: 'impersonate', label: 'impersonación', actions: [VIEW('impersonación'), { action: 'start', desc: 'Iniciar impersonación' }, { action: 'stop', desc: 'Finalizar impersonación' }] },
    { resource: 'backup', label: 'backups', actions: [VIEW('backups'), { action: 'create', desc: 'Crear backup' }, { action: 'download', desc: 'Descargar backup' }, { action: 'restore', desc: 'Restaurar backup' }] },
    { resource: 'migration', label: 'migraciones', actions: [VIEW('migraciones'), { action: 'start', desc: 'Iniciar migración' }, { action: 'cancel', desc: 'Cancelar migración' }] },
    { resource: 'maintenance', label: 'mantenimiento', actions: [VIEW('mantenimiento'), { action: 'run', desc: 'Ejecutar mantenimiento' }] },
    { resource: 'health', label: 'health checks', actions: [VIEW('health checks')] },
    { resource: 'rate-limit', label: 'rate limiting', actions: [VIEW('rate limiting'), { action: 'edit', desc: 'Editar rate limiting' }] },
  ],

  EMPRESA: [
    { resource: 'emp-dashboard', label: 'el dashboard de empresa', actions: [VIEW('el dashboard')] },
    {
      resource: 'employee',
      label: 'empleados',
      actions: [
        ...CRUD('empleados'),
        { action: 'edit-status', desc: 'Activar/suspender empleado' },
        { action: 'export', desc: 'Exportar empleados' },
        { action: 'gdpr', desc: 'Exportar/eliminar datos personales (RGPD)' },
      ],
    },
    { resource: 'emp-order', label: 'pedidos', actions: [VIEW('pedidos'), { action: 'export', desc: 'Exportar pedidos' }] },
    {
      resource: 'emp-incident',
      label: 'incidencias',
      actions: [VIEW('incidencias'), { action: 'create', desc: 'Reportar incidencia' }, { action: 'close', desc: 'Cerrar incidencia' }, { action: 'escalate', desc: 'Escalar a catering' }],
    },
    { resource: 'emp-billing', label: 'facturación', actions: [VIEW('facturación'), { action: 'export', desc: 'Exportar facturas' }] },
    { resource: 'emp-fiscal', label: 'auditoría fiscal', actions: [VIEW('auditoría fiscal'), { action: 'export', desc: 'Exportar auditoría fiscal' }] },
    { resource: 'emp-activity', label: 'actividad', actions: [VIEW('actividad')] },
    { resource: 'emp-catering', label: 'el catering asignado', actions: [VIEW('el catering'), { action: 'rate', desc: 'Calificar al catering' }] },
    {
      resource: 'emp-config',
      label: 'configuración',
      actions: [VIEW('configuración'), { action: 'edit', desc: 'Editar datos de empresa' }, { action: 'edit-plan', desc: 'Cambiar el plan' }],
    },
    { resource: 'emp-config-branding', label: 'branding', actions: [VIEW('branding'), { action: 'edit', desc: 'Editar branding' }] },
    { resource: 'emp-config-holidays', label: 'festivos', actions: CRUD('festivos') },
    { resource: 'emp-config-site', label: 'sedes', actions: CRUD('sedes') },
    { resource: 'emp-config-user', label: 'usuarios de la empresa', actions: CRUD('usuarios de la empresa') },
    { resource: 'emp-config-role', label: 'roles de la empresa', actions: CRUD('roles de la empresa') },
    { resource: 'emp-config-document', label: 'documentos', actions: [VIEW('documentos'), { action: 'upload', desc: 'Subir documentos' }] },
  ],

  CATERING: [
    { resource: 'cat-dashboard', label: 'el dashboard de catering', actions: [VIEW('el dashboard')] },
    {
      resource: 'dish',
      label: 'platos',
      actions: [...CRUD('platos'), { action: 'clone', desc: 'Clonar plato' }, { action: 'toggle-active', desc: 'Activar/desactivar plato' }],
    },
    {
      resource: 'menu',
      label: 'menús',
      actions: [VIEW('menús'), { action: 'edit-day', desc: 'Editar el menú de un día' }, { action: 'publish', desc: 'Publicar menú' }],
    },
    {
      resource: 'production',
      label: 'producción (KDS)',
      actions: [VIEW('producción'), { action: 'mark-ready', desc: 'Marcar como listo' }, { action: 'mark-packed', desc: 'Marcar como empaquetado' }, { action: 'print-labels', desc: 'Generar/imprimir etiquetas' }],
    },
    {
      resource: 'route',
      label: 'rutas de reparto',
      actions: [...CRUD('rutas'), { action: 'start', desc: 'Iniciar ruta' }, { action: 'complete', desc: 'Completar ruta' }, { action: 'confirm-delivery', desc: 'Confirmar entrega' }],
    },
    {
      resource: 'client-company',
      label: 'empresas clientes',
      actions: [VIEW('empresas clientes'), { action: 'view-detail', desc: 'Ver detalle de empresa cliente' }],
    },
    {
      resource: 'cat-incident',
      label: 'incidencias',
      actions: [VIEW('incidencias'), { action: 'resolve', desc: 'Resolver incidencia' }],
    },
    {
      resource: 'quality',
      label: 'calidad',
      actions: [VIEW('calidad'), { action: 'dispute-penalty', desc: 'Impugnar penalización' }],
    },
    { resource: 'cat-billing', label: 'facturación', actions: [VIEW('facturación')] },
    {
      resource: 'invoice',
      label: 'facturas',
      actions: [VIEW('facturas'), { action: 'generate', desc: 'Generar factura' }, { action: 'pay', desc: 'Marcar factura como pagada' }, { action: 'download', desc: 'Descargar factura' }],
    },
    { resource: 'cat-audit', label: 'auditoría', actions: [VIEW('auditoría'), { action: 'export', desc: 'Exportar auditoría' }] },
    { resource: 'cat-config-branding', label: 'branding', actions: [VIEW('branding'), { action: 'edit', desc: 'Editar branding' }] },
    { resource: 'cat-config-holidays', label: 'festivos', actions: CRUD('festivos') },
    { resource: 'cat-config-template', label: 'plantillas de menú', actions: CRUD('plantillas de menú') },
    { resource: 'cat-config-zone', label: 'zonas', actions: CRUD('zonas') },
    { resource: 'cat-config-user', label: 'usuarios del catering', actions: CRUD('usuarios del catering') },
    { resource: 'cat-config-role', label: 'roles del catering', actions: CRUD('roles del catering') },
  ],

  EMPLEADO: [
    {
      resource: 'menu-select',
      label: 'menús',
      actions: [VIEW('menús disponibles'), { action: 'select', desc: 'Seleccionar menú' }],
    },
    {
      resource: 'profile',
      label: 'el perfil',
      actions: [VIEW('el perfil'), { action: 'edit', desc: 'Editar datos personales' }, { action: 'change-password', desc: 'Cambiar contraseña' }],
    },
    { resource: 'history', label: 'el historial', actions: [VIEW('el historial'), { action: 'export', desc: 'Exportar historial' }] },
    { resource: 'emp-incident-own', label: 'incidencias propias', actions: [VIEW('incidencias propias'), { action: 'create', desc: 'Reportar incidencia' }] },
    { resource: 'emp-rating-own', label: 'valoraciones propias', actions: [VIEW('valoraciones propias'), { action: 'create', desc: 'Valorar platos' }] },
  ],
}

export type PermissionEntry = {
  key: string
  resource: string
  action: string
  portal: PermissionPortal
  description: string
}

/** Catálogo plano de permisos (una entrada por funcionalidad). */
export const PERMISSION_CATALOG: PermissionEntry[] = (
  Object.entries(SPEC) as [PermissionPortal, ResourceSpec[]][]
).flatMap(([portal, resources]) =>
  resources.flatMap((r) =>
    r.actions.map((a) => ({
      key: `${r.resource}:${a.action}`,
      resource: r.resource,
      action: a.action,
      portal,
      description: a.desc,
    }))
  )
)

/** Todas las claves de permiso. */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.map((p) => p.key)

const keysForPortal = (portal: PermissionPortal) =>
  PERMISSION_CATALOG.filter((p) => p.portal === portal).map((p) => p.key)

// ─── DEFINICIÓN DE LOS 12 ROLES DEL SISTEMA ─────────────────────────────────
export type RoleCategory = 'ROOT' | 'EMPRESA' | 'CATERING'

export type SystemRoleDef = {
  key: string
  baseRole: string // valor del enum UserRole
  name: string
  description: string
  category: RoleCategory
  /** Claves de permiso. `'*'` = todas. */
  permissions: string[]
}

export const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    key: 'super_admin',
    baseRole: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Administrador total del sistema Plati. Acceso cross-tenant y operativo.',
    category: 'ROOT',
    permissions: ['*'],
  },
  {
    key: 'auditor',
    baseRole: 'AUDITOR',
    name: 'Auditor',
    description: 'Acceso de solo lectura a todos los tenants. No modifica datos.',
    category: 'ROOT',
    // Solo lectura: todos los permisos `:view` de todos los portales.
    permissions: PERMISSION_CATALOG.filter((p) => p.action === 'view').map((p) => p.key),
  },
  {
    key: 'admin_empresa',
    baseRole: 'ADMIN_EMPRESA',
    name: 'Admin Empresa',
    description: 'Responsable del portal empresa. Gestiona usuarios, política, contratos y facturación.',
    category: 'EMPRESA',
    permissions: keysForPortal('EMPRESA'),
  },
  {
    key: 'rrhh',
    baseRole: 'RRHH',
    name: 'RRHH',
    description: 'Recursos Humanos. Gestiona empleados, invitaciones y preferencias.',
    category: 'EMPRESA',
    permissions: [
      'emp-dashboard:view',
      'employee:view', 'employee:create', 'employee:edit', 'employee:edit-status', 'employee:export', 'employee:gdpr',
      'emp-order:view',
      'emp-incident:view', 'emp-incident:create',
      'emp-activity:view',
      'emp-config-user:view',
    ],
  },
  {
    key: 'finanzas',
    baseRole: 'FINANZAS',
    name: 'Finanzas (Empresa)',
    description: 'Contabilidad de la empresa. Facturación y reportes fiscales.',
    category: 'EMPRESA',
    permissions: ['emp-dashboard:view', 'emp-billing:view', 'emp-billing:export', 'emp-fiscal:view', 'emp-fiscal:export', 'emp-order:view'],
  },
  {
    key: 'manager_sede',
    baseRole: 'MANAGER_SEDE',
    name: 'Manager de Sede',
    description: 'Responsable de una sede. Ve empleados y pedidos de su sede.',
    category: 'EMPRESA',
    permissions: ['emp-dashboard:view', 'employee:view', 'emp-order:view', 'emp-incident:view', 'emp-incident:create'],
  },
  {
    key: 'empleado',
    baseRole: 'EMPLEADO',
    name: 'Empleado',
    description: 'Usuario final. Elige menú, valora y reporta incidencias.',
    category: 'EMPRESA',
    permissions: keysForPortal('EMPLEADO'),
  },
  {
    key: 'admin_catering',
    baseRole: 'ADMIN_CATERING',
    name: 'Admin Catering',
    description: 'Responsable del portal catering. Platos, menús, rutas, facturación y equipo.',
    category: 'CATERING',
    permissions: keysForPortal('CATERING'),
  },
  {
    key: 'chef',
    baseRole: 'CHEF',
    name: 'Chef',
    description: 'Jefe de cocina. Publica menús, gestiona platos y supervisa producción.',
    category: 'CATERING',
    permissions: [
      'cat-dashboard:view',
      'dish:view', 'dish:create', 'dish:edit', 'dish:delete', 'dish:clone', 'dish:toggle-active',
      'menu:view', 'menu:edit-day', 'menu:publish',
      'production:view', 'production:mark-ready', 'production:mark-packed',
    ],
  },
  {
    key: 'cocinero',
    baseRole: 'COCINERO',
    name: 'Cocinero',
    description: 'Cocinero de línea. Solo lectura del Kitchen Display.',
    category: 'CATERING',
    permissions: ['cat-dashboard:view', 'production:view', 'menu:view'],
  },
  {
    key: 'repartidor',
    baseRole: 'REPARTIDOR',
    name: 'Repartidor',
    description: 'Reparto. Ve su ruta, confirma entregas y reporta incidencias.',
    category: 'CATERING',
    permissions: ['route:view', 'route:start', 'route:complete', 'route:confirm-delivery', 'cat-incident:view'],
  },
  {
    key: 'finanzas_catering',
    baseRole: 'FINANZAS_CATERING',
    name: 'Finanzas (Catering)',
    description: 'Contabilidad del catering. Genera facturas y registra cobros.',
    category: 'CATERING',
    permissions: ['cat-dashboard:view', 'cat-billing:view', 'invoice:view', 'invoice:generate', 'invoice:pay', 'invoice:download'],
  },
]

/** Expande `'*'` a todas las claves; valida que las demás existan en el catálogo. */
export function resolveRolePermissionKeys(perms: string[]): string[] {
  if (perms.includes('*')) return [...ALL_PERMISSION_KEYS]
  const known = new Set(ALL_PERMISSION_KEYS)
  return perms.filter((p) => known.has(p))
}
