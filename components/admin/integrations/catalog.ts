/**
 * Catálogo de integraciones posibles que SinTupper podría conectar.
 * Pura data visual — ninguna tiene conector activo todavía.
 */

export type IntegrationCategory =
  | 'erp'
  | 'sso'
  | 'payments'
  | 'webhooks'
  | 'api-keys'
  | 'communications'
  | 'storage'
  | 'monitoring'

export type IntegrationStatus =
  | 'available' // Cuando tengamos el conector activo, será este estado
  | 'coming-soon' // Planeado, con ETA
  | 'on-request' // A petición de cliente enterprise
  | 'active' // Ya conectado (por ahora ninguno, reserva para el futuro)

export type IntegrationSpec = {
  /** Identificador interno (URL slug). */
  slug: string
  /** Nombre público del proveedor. */
  name: string
  /** Descripción corta (1 frase). */
  description: string
  /** Categoría en el sidebar admin. */
  category: IntegrationCategory
  /** Color corporativo (hex) para la insignia. */
  brandColor: string
  /** Letras de la insignia cuando no hay logo. */
  monogram: string
  /** Estado visual. */
  status: IntegrationStatus
  /** Fields que tendría el formulario de configuración (mock). */
  configFields: {
    label: string
    type: 'text' | 'password' | 'url' | 'textarea' | 'select'
    placeholder?: string
    help?: string
  }[]
  /** Enlace a docs externa si la hay. */
  docsUrl?: string
}

export const CATEGORY_META: Record<
  IntegrationCategory,
  { label: string; description: string }
> = {
  erp: {
    label: 'ERP y Contabilidad',
    description: 'Sincroniza facturas y movimientos con tu ERP existente',
  },
  sso: {
    label: 'SSO / Identidad',
    description: 'Que tus empleados entren con Google, Microsoft o SAML',
  },
  payments: {
    label: 'Pagos',
    description: 'Cobros automáticos a empresas por sus planes SaaS',
  },
  communications: {
    label: 'Comunicaciones',
    description: 'Email, SMS y WhatsApp transaccionales',
  },
  webhooks: {
    label: 'Webhooks',
    description: 'Eventos salientes para sistemas externos',
  },
  'api-keys': {
    label: 'API Keys',
    description: 'Acceso programático con scopes limitados',
  },
  storage: {
    label: 'Almacenamiento',
    description: 'Buckets para PDFs, logos, informes',
  },
  monitoring: {
    label: 'Monitoring',
    description: 'Errores, latencias y trazas en tiempo real',
  },
}

export const INTEGRATIONS: IntegrationSpec[] = [
  // ─── ERP ──────────────────────────────────────────────────────
  {
    slug: 'sap',
    name: 'SAP',
    description:
      'Sincroniza facturas y movimientos contables con SAP Business One o SAP S/4HANA',
    category: 'erp',
    brandColor: '#0FAAFF',
    monogram: 'SAP',
    status: 'on-request',
    configFields: [
      { label: 'Endpoint SAP', type: 'url', placeholder: 'https://sap.mi-empresa.com' },
      { label: 'Usuario técnico', type: 'text' },
      { label: 'Password', type: 'password' },
      { label: 'Company Database', type: 'text', help: 'Ej: SBODEMOES' },
    ],
  },
  {
    slug: 'a3-erp',
    name: 'A3 ERP',
    description:
      'Exporta asientos contables a A3 ERP (Wolters Kluwer) en formato estándar',
    category: 'erp',
    brandColor: '#005DAA',
    monogram: 'A3',
    status: 'coming-soon',
    configFields: [
      { label: 'API Key A3', type: 'password' },
      { label: 'Código empresa', type: 'text' },
      { label: 'Diario de asientos', type: 'text', placeholder: '1' },
    ],
  },
  {
    slug: 'sage',
    name: 'Sage',
    description: 'Integración con Sage 50 y Sage 200 para contabilidad automatizada',
    category: 'erp',
    brandColor: '#00D639',
    monogram: 'SG',
    status: 'coming-soon',
    configFields: [
      { label: 'Client ID Sage', type: 'text' },
      { label: 'Client Secret', type: 'password' },
      { label: 'Business ID', type: 'text' },
    ],
  },
  {
    slug: 'holded',
    name: 'Holded',
    description: 'ERP cloud para pymes, muy popular en España',
    category: 'erp',
    brandColor: '#2A4FFF',
    monogram: 'HO',
    status: 'coming-soon',
    configFields: [
      { label: 'API Key Holded', type: 'password', help: 'Se obtiene desde el panel Holded → Developers' },
    ],
  },
  {
    slug: 'sii-aeat',
    name: 'SII AEAT',
    description:
      'Suministro Inmediato de Información a la Agencia Tributaria (obligatorio si facturas >6M€/año)',
    category: 'erp',
    brandColor: '#C8102E',
    monogram: 'SII',
    status: 'on-request',
    configFields: [
      { label: 'Certificado digital (.p12)', type: 'text', help: 'Ruta al fichero en el servidor' },
      { label: 'Password certificado', type: 'password' },
      { label: 'Entorno', type: 'select', placeholder: 'pruebas / producción' },
    ],
  },
  {
    slug: 'verifactu',
    name: 'Verifactu',
    description:
      'Sistema Verifactu de la AEAT (obligatorio desde 2026 para ciertos regímenes)',
    category: 'erp',
    brandColor: '#003D7A',
    monogram: 'VF',
    status: 'on-request',
    configFields: [
      { label: 'Certificado digital', type: 'text' },
      { label: 'NIF emisor', type: 'text' },
    ],
  },

  // ─── SSO ──────────────────────────────────────────────────────
  {
    slug: 'google-workspace',
    name: 'Google Workspace',
    description:
      'Tus empleados entran con su cuenta corporativa de Google (@empresa.com)',
    category: 'sso',
    brandColor: '#4285F4',
    monogram: 'G',
    status: 'coming-soon',
    configFields: [
      { label: 'Client ID', type: 'text' },
      { label: 'Client Secret', type: 'password' },
      { label: 'Dominios permitidos', type: 'text', placeholder: 'acme.com, acme.es' },
    ],
  },
  {
    slug: 'azure-ad',
    name: 'Microsoft Entra ID (Azure AD)',
    description:
      'SSO con Microsoft 365 y Azure AD. Imprescindible para clientes enterprise',
    category: 'sso',
    brandColor: '#0078D4',
    monogram: 'MS',
    status: 'coming-soon',
    configFields: [
      { label: 'Tenant ID', type: 'text' },
      { label: 'Client ID', type: 'text' },
      { label: 'Client Secret', type: 'password' },
    ],
  },
  {
    slug: 'okta',
    name: 'Okta',
    description: 'Identity provider líder en grandes corporaciones',
    category: 'sso',
    brandColor: '#007DC1',
    monogram: 'OK',
    status: 'on-request',
    configFields: [
      { label: 'Okta Domain', type: 'url', placeholder: 'https://mi-empresa.okta.com' },
      { label: 'Client ID', type: 'text' },
      { label: 'Client Secret', type: 'password' },
    ],
  },
  {
    slug: 'saml-generic',
    name: 'SAML 2.0 genérico',
    description: 'Cualquier IdP SAML: Auth0, OneLogin, ADFS, Keycloak…',
    category: 'sso',
    brandColor: '#6B7280',
    monogram: 'SAML',
    status: 'on-request',
    configFields: [
      { label: 'Metadata XML URL', type: 'url' },
      { label: 'Entity ID', type: 'text' },
    ],
  },

  // ─── Pagos ────────────────────────────────────────────────────
  {
    slug: 'stripe',
    name: 'Stripe',
    description:
      'Cobros automáticos con tarjeta, SEPA y Apple Pay. Webhook de eventos.',
    category: 'payments',
    brandColor: '#635BFF',
    monogram: 'S',
    status: 'coming-soon',
    configFields: [
      { label: 'Publishable key', type: 'text', placeholder: 'pk_live_...' },
      { label: 'Secret key', type: 'password', placeholder: 'sk_live_...' },
      { label: 'Webhook secret', type: 'password', placeholder: 'whsec_...' },
    ],
  },
  {
    slug: 'sepa',
    name: 'SEPA Direct Debit',
    description:
      'Adeudo domiciliado SEPA B2B. Ideal para cuotas SaaS recurrentes en España.',
    category: 'payments',
    brandColor: '#003399',
    monogram: 'SEPA',
    status: 'coming-soon',
    configFields: [
      { label: 'Creditor ID (CID)', type: 'text', placeholder: 'ES00ZZZ...' },
      { label: 'IBAN origen', type: 'text' },
      { label: 'Plantilla mandato (PDF URL)', type: 'url' },
    ],
  },
  {
    slug: 'bizum',
    name: 'Bizum',
    description: 'Pagos instantáneos vía móvil (solo España)',
    category: 'payments',
    brandColor: '#009EE5',
    monogram: 'BZ',
    status: 'on-request',
    configFields: [
      { label: 'Comercio ID Bizum', type: 'text' },
      { label: 'Clave secreta', type: 'password' },
    ],
  },
  {
    slug: 'redsys',
    name: 'Redsys',
    description: 'Pasarela de pago de los bancos españoles',
    category: 'payments',
    brandColor: '#E30613',
    monogram: 'RS',
    status: 'on-request',
    configFields: [
      { label: 'Número comercio (FUC)', type: 'text' },
      { label: 'Terminal', type: 'text', placeholder: '001' },
      { label: 'Clave secreta HMAC', type: 'password' },
    ],
  },
  {
    slug: 'paypal',
    name: 'PayPal',
    description: 'Pagos con cuenta PayPal y tarjeta',
    category: 'payments',
    brandColor: '#003087',
    monogram: 'PP',
    status: 'on-request',
    configFields: [
      { label: 'Client ID', type: 'text' },
      { label: 'Client Secret', type: 'password' },
    ],
  },

  // ─── Comunicaciones ──────────────────────────────────────────
  {
    slug: 'sendgrid',
    name: 'SendGrid',
    description:
      'Servicio de email transaccional masivo. Notificaciones al empleado, RRHH, finanzas.',
    category: 'communications',
    brandColor: '#1A82E2',
    monogram: 'SG',
    status: 'coming-soon',
    configFields: [
      { label: 'API Key', type: 'password', placeholder: 'SG....' },
      { label: 'From email', type: 'text', placeholder: 'no-reply@sintupper.com' },
      { label: 'From name', type: 'text', placeholder: 'SinTupper' },
    ],
  },
  {
    slug: 'resend',
    name: 'Resend',
    description:
      'Alternativa moderna a SendGrid, popular en el ecosistema React/Next',
    category: 'communications',
    brandColor: '#000000',
    monogram: 'RE',
    status: 'coming-soon',
    configFields: [
      { label: 'API Key', type: 'password', placeholder: 're_...' },
      { label: 'From email', type: 'text' },
    ],
  },
  {
    slug: 'twilio',
    name: 'Twilio SMS',
    description:
      'SMS transaccionales: confirmación de pedido, recordatorios al empleado',
    category: 'communications',
    brandColor: '#F22F46',
    monogram: 'TW',
    status: 'coming-soon',
    configFields: [
      { label: 'Account SID', type: 'text' },
      { label: 'Auth Token', type: 'password' },
      { label: 'Teléfono emisor', type: 'text', placeholder: '+34 ...' },
    ],
  },
  {
    slug: 'whatsapp-business',
    name: 'WhatsApp Business',
    description:
      'Notificaciones por WhatsApp (requiere aprobación de Meta por plantilla)',
    category: 'communications',
    brandColor: '#25D366',
    monogram: 'WA',
    status: 'on-request',
    configFields: [
      { label: 'Business Account ID', type: 'text' },
      { label: 'Phone Number ID', type: 'text' },
      { label: 'Access Token', type: 'password' },
    ],
  },

  // ─── Webhooks ────────────────────────────────────────────────
  {
    slug: 'webhooks',
    name: 'Webhooks salientes',
    description:
      'Dispara eventos (orders.confirmed, invoice.paid, delivery.completed) a una URL que tú defines',
    category: 'webhooks',
    brandColor: '#6366F1',
    monogram: 'WH',
    status: 'coming-soon',
    configFields: [
      { label: 'URL destino', type: 'url', placeholder: 'https://mi-sistema.com/webhooks/sintupper' },
      { label: 'Secret HMAC', type: 'password', help: 'Se firma el payload con este secret' },
      { label: 'Eventos suscritos', type: 'textarea', help: 'Lista de eventos, uno por línea' },
    ],
  },

  // ─── API Keys ────────────────────────────────────────────────
  {
    slug: 'api-keys',
    name: 'API Keys personalizadas',
    description:
      'Acceso programático a la plataforma desde tu propio código (scripts, app móvil, integraciones B2B)',
    category: 'api-keys',
    brandColor: '#0EA5E9',
    monogram: 'API',
    status: 'coming-soon',
    configFields: [
      { label: 'Nombre de la key', type: 'text', placeholder: 'Producción app móvil' },
      { label: 'Scopes', type: 'textarea', help: 'orders:read, invoices:read, ...' },
      { label: 'Expira', type: 'text', placeholder: '2027-01-01 o "nunca"' },
    ],
  },

  // ─── Storage ─────────────────────────────────────────────────
  {
    slug: 'aws-s3',
    name: 'Amazon S3',
    description: 'Storage cloud para PDFs de facturas, logos de tenants, informes',
    category: 'storage',
    brandColor: '#FF9900',
    monogram: 'S3',
    status: 'coming-soon',
    configFields: [
      { label: 'Bucket name', type: 'text' },
      { label: 'Region', type: 'text', placeholder: 'eu-west-1' },
      { label: 'Access Key ID', type: 'text' },
      { label: 'Secret Access Key', type: 'password' },
    ],
  },
  {
    slug: 'cloudflare-r2',
    name: 'Cloudflare R2',
    description: 'Storage compatible S3 sin egress fees. Más barato a escala.',
    category: 'storage',
    brandColor: '#F38020',
    monogram: 'R2',
    status: 'coming-soon',
    configFields: [
      { label: 'Account ID', type: 'text' },
      { label: 'Access Key ID', type: 'text' },
      { label: 'Secret Access Key', type: 'password' },
      { label: 'Bucket name', type: 'text' },
    ],
  },

  // ─── Monitoring ──────────────────────────────────────────────
  {
    slug: 'sentry',
    name: 'Sentry',
    description:
      'Captura de errores en cliente y servidor. Stack traces legibles, alertas por Slack.',
    category: 'monitoring',
    brandColor: '#362D59',
    monogram: 'SN',
    status: 'coming-soon',
    configFields: [
      { label: 'DSN', type: 'text', placeholder: 'https://xxx@sentry.io/...' },
      { label: 'Entorno', type: 'select', placeholder: 'production / staging' },
    ],
  },
  {
    slug: 'datadog',
    name: 'Datadog',
    description: 'APM + logs + métricas en una sola plataforma (enterprise-grade)',
    category: 'monitoring',
    brandColor: '#632CA6',
    monogram: 'DD',
    status: 'on-request',
    configFields: [
      { label: 'API Key', type: 'password' },
      { label: 'Site', type: 'text', placeholder: 'datadoghq.eu' },
    ],
  },
  {
    slug: 'grafana-cloud',
    name: 'Grafana Cloud',
    description:
      'Observabilidad open-source (Loki logs, Prometheus métricas, Tempo traces)',
    category: 'monitoring',
    brandColor: '#F46800',
    monogram: 'GF',
    status: 'on-request',
    configFields: [
      { label: 'Instance URL', type: 'url' },
      { label: 'API Key', type: 'password' },
    ],
  },
]

export function integrationsByCategory(cat: IntegrationCategory): IntegrationSpec[] {
  return INTEGRATIONS.filter((i) => i.category === cat)
}
