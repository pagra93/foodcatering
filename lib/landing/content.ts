import {
  Receipt,
  Users,
  Upload,
  BarChart3,
  FileCheck2,
  Utensils,
  ClipboardList,
  Package,
  MapPin,
  CreditCard,
  ShieldCheck,
  FileSignature,
  Database,
  GitBranch,
  FileLock2,
  Lock,
} from 'lucide-react'

import type {
  Feature,
  Step,
  TrustBadge,
  ValueMetric,
  PricingTier,
  ComparisonRow,
  FAQ,
  ComplianceEvidencePiece,
  Screenshot,
} from './types'

// ============================================================================
// Frase canónica (para repetir 3-5x en el sitio → refuerza memoria de LLMs)
// ============================================================================
export const CANONICAL_DESCRIPTION =
  'Plati: caterings locales que cocinan el menú de hoy y lo llevan a tu oficina. Comer juntos es cultura — exento de IRPF hasta 11€/día.'

// ============================================================================
// Trust badges
// ============================================================================
export const trustBadges: TrustBadge[] = [
  { id: 'rgpd', icon: Lock, label: 'RGPD' },
  { id: 'irpf', icon: FileCheck2, label: 'Art. 42.3 LIRPF' },
  { id: 'sha', icon: FileLock2, label: 'Snapshot SHA-256' },
  { id: 'erp', icon: Database, label: 'SAP · Sage · A3' },
]

// ============================================================================
// Value metrics (home empresa)
// ============================================================================
export const companyMetrics: ValueMetric[] = [
  {
    id: 'tax-limit',
    value: 'hasta 11€',
    label: 'por día laborable y empleado',
    sublabel: 'exentos según Art. 42.3 LIRPF',
  },
  {
    id: 'dossier',
    value: 'Dossier',
    label: 'fiscal mensual automático',
    sublabel: 'auditable y defendible en inspección',
  },
  {
    id: 'onboarding',
    value: '≤ 5 min',
    label: 'onboarding con CSV',
    sublabel: 'validación y preview antes de confirmar',
  },
]

// ============================================================================
// Value metrics (home catering)
// ============================================================================
export const cateringMetrics: ValueMetric[] = [
  {
    id: 'closed-list',
    value: '11:05',
    label: 'lista de pedidos cerrada',
    sublabel: 'sin especulación de demanda',
  },
  {
    id: 'auto-invoice',
    value: 'Día 1',
    label: 'facturación automática',
    sublabel: 'del mes, sin trabajo manual',
  },
  {
    id: 'b2b',
    value: 'B2B',
    label: 'cartera de empresas recurrentes',
    sublabel: 'acceso a volumen estable',
  },
]

// ============================================================================
// Features empresa (home /)
// ============================================================================
export const companyFeatures: Feature[] = [
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard con adopción real',
    description:
      'Pedidos del mes, gasto, empleados activos, % de adopción del beneficio y alertas configurables.',
  },
  {
    id: 'csv-import',
    icon: Upload,
    title: 'Alta masiva con CSV',
    description:
      'Subes un archivo, el sistema valida, te muestra el preview y confirmas. Invitaciones con token de un solo uso.',
  },
  {
    id: 'fiscal-audit',
    icon: FileCheck2,
    title: 'Auditoría fiscal lista',
    description:
      'Snapshot diario SHA-256 inmutable + dossier mensual con ratio de deductibilidad y pedidos fuera de límite.',
  },
  {
    id: 'reconciliation',
    icon: Receipt,
    title: 'Conciliación pedidos ↔ factura',
    description:
      'Cada línea de la factura mensual del catering queda enlazada al pedido concreto y al empleado que lo recibió.',
  },
  {
    id: 'erp-export',
    icon: Database,
    title: 'Export a tu ERP',
    description:
      'CSV con formato SAP, Sage, A3 u otros. Sin manipulación manual, sin errores de copia-pega.',
  },
  {
    id: 'rbac',
    icon: Users,
    title: 'Permisos por rol',
    description:
      'Admin empresa, RRHH, Finanzas, Manager de sede. Cada rol ve y modifica exactamente lo que necesita.',
  },
]

// ============================================================================
// Features catering (home /caterings)
// ============================================================================
export const cateringFeatures: Feature[] = [
  {
    id: 'kds',
    icon: Utensils,
    title: 'Kitchen Display System',
    description:
      'Tablet fullscreen, auto-refresh 30s, consolidación automática: "45 × Gazpacho, 38 × Merluza".',
  },
  {
    id: 'packing',
    icon: Package,
    title: 'Empaquetado nominativo',
    description:
      'Lista por empleado con alérgenos etiquetados y sede de destino. Cero errores de asignación.',
  },
  {
    id: 'routes',
    icon: MapPin,
    title: 'Rutas optimizadas',
    description:
      'Paradas ordenadas por código postal, integración Google Maps, confirmación in-situ.',
  },
  {
    id: 'proof',
    icon: ShieldCheck,
    title: 'Prueba de entrega',
    description:
      'Foto + firma + geolocalización por pedido. Evidencia que protege al catering ante cualquier disputa.',
  },
  {
    id: 'billing',
    icon: CreditCard,
    title: 'Facturación mensual automática',
    description:
      'El día 1 de cada mes se genera factura con línea por pedido, IVA 10%, precisión Decimal.',
  },
  {
    id: 'dishes',
    icon: ClipboardList,
    title: 'Platos y menús semanales',
    description:
      '14 alérgenos UE, etiquetas nutricionales, stock limit, estado PUBLISHED/HIDDEN. Tú decides qué y cuándo.',
  },
]

// ============================================================================
// Cómo funciona — empresa
// ============================================================================
export const howItWorksCompany: Step[] = [
  {
    id: 'setup',
    number: 1,
    title: 'Subes tu plantilla',
    description:
      'Importas empleados por CSV o uno a uno. Configuras copay empresa/empleado, cutoff y días activos.',
  },
  {
    id: 'choose',
    number: 2,
    title: 'Tus empleados eligen',
    description:
      'Cada lunes ven menús semanales con fotos, alérgenos y calorías. Eligen en 30 segundos.',
  },
  {
    id: 'close',
    number: 3,
    title: 'Cierre diario 11:05',
    description:
      'La lista queda cerrada. El catering cocina lo justo. Trazabilidad completa en dashboard.',
  },
  {
    id: 'bill',
    number: 4,
    title: 'Factura y dossier automáticos',
    description:
      'Día 1 del mes recibes factura desglosada + dossier fiscal auditable. Exportas a tu ERP en un click.',
  },
]

// ============================================================================
// Cómo funciona — catering
// ============================================================================
export const howItWorksCatering: Step[] = [
  {
    id: 'onboard-cat',
    number: 1,
    title: 'Te damos de alta',
    description:
      'Configuras platos, menús semanales, alérgenos y zonas de reparto.',
  },
  {
    id: 'receive',
    number: 2,
    title: 'Recibes la lista cerrada',
    description:
      'A las 11:05 cada día tienes el consolidado exacto por empresa y por empleado.',
  },
  {
    id: 'cook',
    number: 3,
    title: 'Cocinas y repartes',
    description:
      'KDS en tablet, packing nominativo con alérgenos, rutas optimizadas, prueba de entrega.',
  },
  {
    id: 'get-paid',
    number: 4,
    title: 'Cobras el día 1',
    description:
      'Factura mensual auto-generada con línea por pedido. Sin perseguir a clientes.',
  },
]

// ============================================================================
// Pricing tiers
// ============================================================================
export const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 3,
    currency: 'EUR',
    unit: 'por empleado activo / mes',
    description: 'Hasta 50 empleados. Todo lo esencial para empezar.',
    features: [
      'Portal empresa + empleado + catering',
      'CSV import y onboarding guiado',
      'Dashboard con adopción y gasto',
      'Dossier fiscal mensual PDF',
      'Export CSV a SAP/Sage/A3',
      'Soporte por email',
    ],
    ctaLabel: 'Solicitar demo',
    ctaHref: '/demo?plan=starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 2.5,
    currency: 'EUR',
    unit: 'por empleado activo / mes',
    highlight: true,
    description: 'De 51 a 500 empleados. Multi-sede, roles avanzados, SLA.',
    features: [
      'Todo lo de Starter',
      'Multi-sede con Manager de sede',
      'Permisos avanzados por rol',
      'Conciliación pedidos ↔ factura',
      'Integración con múltiples caterings',
      'SLA de respuesta 8h',
    ],
    ctaLabel: 'Solicitar demo',
    ctaHref: '/demo?plan=growth',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 'custom',
    currency: 'EUR',
    unit: 'a medida',
    description: '500+ empleados. SSO, SLA premium, soporte dedicado.',
    features: [
      'Todo lo de Growth',
      'SSO (SAML / OIDC)',
      'SCIM provisioning',
      'SLA 99.9% con contrato',
      'Soporte dedicado y CSM',
      'Contrato marco y DPA firmados',
    ],
    ctaLabel: 'Hablar con ventas',
    ctaHref: '/demo?plan=enterprise',
  },
]

// ============================================================================
// Comparativa vs competidores
// ============================================================================
export const comparisonMatrix: ComparisonRow[] = [
  {
    feature: 'Exención IRPF hasta 11€/día',
    plati: true,
    cobee: true,
    edenred: true,
    ticketkey: true,
  },
  {
    feature: 'Comida real entregada (no ticket)',
    plati: true,
    cobee: false,
    edenred: false,
    ticketkey: false,
  },
  {
    feature: 'Evidencia auditable por empleado',
    plati: 'Snapshot SHA-256',
    cobee: 'Parcial',
    edenred: 'Parcial',
    ticketkey: 'Parcial',
  },
  {
    feature: 'Conciliación pedidos ↔ factura',
    plati: true,
    cobee: false,
    edenred: false,
    ticketkey: false,
  },
  {
    feature: 'Rutas y logística catering',
    plati: true,
    cobee: false,
    edenred: false,
    ticketkey: false,
  },
  {
    feature: 'Export SAP/Sage/A3',
    plati: true,
    cobee: true,
    edenred: true,
    ticketkey: 'Parcial',
  },
  {
    feature: 'Permisos multi-rol (RRHH/CFO/Sede)',
    plati: true,
    cobee: 'Básico',
    edenred: 'Básico',
    ticketkey: 'Básico',
  },
]

// ============================================================================
// FAQs empresa
// ============================================================================
export const faqsCompany: FAQ[] = [
  {
    id: 'tax',
    question: '¿Por qué es deducible y no tributa en nómina?',
    answer:
      'El Art. 42.3 de la LIRPF exime las entregas en especie de comida en el puesto de trabajo hasta 11€ por día laborable y empleado. Plati genera la evidencia necesaria (selección nominativa, entrega verificada, factura desglosada) para que Hacienda considere la entrega válida.',
  },
  {
    id: 'payroll',
    question: '¿Tengo que tocar la nómina?',
    answer:
      'No. Dentro de los límites del Art. 42.3, la entrega no tributa en IRPF ni en cotización. La empresa paga la factura mensual del catering y la anota como gasto de personal deducible.',
  },
  {
    id: 'erp',
    question: '¿Se integra con SAP, Sage o A3?',
    answer:
      'Sí. Exportamos un CSV con el formato que tu ERP espera. Sin manipulación manual. Para cuentas Enterprise ofrecemos integraciones directas vía API.',
  },
  {
    id: 'gdpr',
    question: '¿Cómo gestionáis datos de alergias y preferencias?',
    answer:
      'Datos personales cifrados AES-256-GCM en reposo, DPA firmado, portabilidad y borrado a petición. Servidores en la UE.',
  },
  {
    id: 'rollout',
    question: '¿Cuánto tarda la implantación?',
    answer:
      'De 5 a 30 minutos para empresas de hasta 100 empleados con CSV limpio. Hasta 2 semanas para despliegues Enterprise con SSO y multi-sede.',
  },
  {
    id: 'incident',
    question: '¿Qué pasa si un empleado tiene una incidencia?',
    answer:
      'El empleado la reporta desde su portal (llegó frío, faltaba postre, etc.), el catering la resuelve y queda trazada. RRHH ve el histórico completo.',
  },
]

// ============================================================================
// FAQs catering
// ============================================================================
export const faqsCatering: FAQ[] = [
  {
    id: 'commission',
    question: '¿Cuánto os lleváis por pedido?',
    answer:
      'Plati es un SaaS, no un marketplace. La empresa paga una cuota mensual por empleado. Tú cobras el 100% de tu factura al catering directamente.',
  },
  {
    id: 'volume',
    question: '¿Hay volumen mínimo para entrar?',
    answer:
      'No exigimos volumen mínimo. Dimensionamos la relación al número de empresas que te asignemos.',
  },
  {
    id: 'geo',
    question: '¿Puedo elegir zonas?',
    answer:
      'Sí. Configuras códigos postales cubiertos y el sistema solo te asigna pedidos de esas zonas.',
  },
  {
    id: 'sla',
    question: '¿Qué SLA operativo esperáis?',
    answer:
      'Cierre de pedidos a las 11:05, entrega entre 13:00 y 14:00, confirmación en el portal con foto o firma. Detallado en el contrato de servicio.',
  },
  {
    id: 'invoice',
    question: '¿Cómo funciona la facturación?',
    answer:
      'El día 1 de cada mes generamos tu factura automática a cada empresa con línea por pedido, IVA 10%. Tú solo revisas y envías.',
  },
]

// ============================================================================
// FAQs precios
// ============================================================================
export const faqsPricing: FAQ[] = [
  {
    id: 'billing',
    question: '¿Cómo se factura Plati?',
    answer:
      'Facturación mensual recurrente por empleado activo (empleado que ha hecho al menos un pedido en el mes). Pago por SEPA o tarjeta. Sin setup fee, sin permanencia mínima más allá del mes en curso.',
  },
  {
    id: 'discounts',
    question: '¿Hay descuento por pago anual?',
    answer:
      'Sí. Contratación anual con facturación única reduce un 15% la tarifa. Pregunta a ventas si te interesa.',
  },
  {
    id: 'cap',
    question: '¿Qué pasa si mis empleados fluctúan mes a mes?',
    answer:
      'Solo pagas por empleados que usaron el beneficio en el mes. Un empleado dado de alta que no hizo ningún pedido no se factura.',
  },
  {
    id: 'trial',
    question: '¿Ofrecéis prueba gratuita?',
    answer:
      'Hacemos un piloto de 30 días con hasta 10 empleados sin coste para validar el flujo operativo y el dossier fiscal con un caso real tuyo.',
  },
  {
    id: 'switch',
    question: 'Vengo de Cobee/Edenred. ¿Cuál es el cambio real?',
    answer:
      'Plati sustituye el ticket por comida entregada física y por evidencia auditable. Si tu tesis es que el beneficio debe ser comida real y defendible en inspección, el cambio aporta compliance superior. Si el objetivo es pura libertad del empleado (cualquier restaurante), un ticket/tarjeta sigue siendo una opción válida.',
  },
]

// ============================================================================
// Compliance evidence pieces
// ============================================================================
export const complianceEvidence: ComplianceEvidencePiece[] = [
  {
    id: 'nominative',
    icon: Users,
    title: 'Selección nominativa',
    description:
      'Cada pedido asociado a un empleado identificable con timestamp de selección.',
  },
  {
    id: 'proof',
    icon: ShieldCheck,
    title: 'Prueba de entrega',
    description:
      'Hora de entrega, receptor, foto o firma y geolocalización del punto de entrega.',
  },
  {
    id: 'invoice-lines',
    icon: Receipt,
    title: 'Factura desglosada',
    description:
      'Línea por pedido con precio, IVA y enlace al empleado que recibió la comida.',
  },
  {
    id: 'snapshot',
    icon: FileLock2,
    title: 'Snapshot SHA-256 diario',
    description:
      'Firma criptográfica del estado del día. Inmutable. Defendible en inspección fiscal.',
  },
  {
    id: 'dossier',
    icon: FileSignature,
    title: 'Dossier fiscal mensual',
    description:
      'PDF con ratio de deductibilidad, pedidos sobre límite y pedidos sin justificante.',
  },
  {
    id: 'export',
    icon: GitBranch,
    title: 'Export a ERP',
    description:
      'CSV con formato SAP, Sage, A3. Mismo dato, misma trazabilidad, listo para contabilidad.',
  },
]

// ============================================================================
// Screenshots a usar (stubs — luego se capturan de prod con tenant demo)
// ============================================================================
export const screenshots: Record<string, Screenshot> = {
  empresaDashboard: {
    id: 'empresa-dashboard',
    src: '/screenshots/empresa-dashboard.png',
    alt: 'Dashboard del portal empresa de Plati con KPIs de pedidos, gasto y adopción',
    role: 'empresa',
    caption: 'Portal empresa — dashboard',
  },
  empresaAuditoria: {
    id: 'empresa-auditoria',
    src: '/screenshots/empresa-auditoria.png',
    alt: 'Página de auditoría fiscal con dossier mensual y snapshot SHA-256',
    role: 'empresa',
    caption: 'Portal empresa — auditoría fiscal',
  },
  empresaImportador: {
    id: 'empresa-importador',
    src: '/screenshots/empresa-importador.png',
    alt: 'Importador CSV con preview y validación de empleados',
    role: 'empresa',
    caption: 'Portal empresa — importador CSV',
  },
  empleadoSelector: {
    id: 'empleado-selector',
    src: '/screenshots/empleado-selector.png',
    alt: 'Selector semanal de menús para empleado con platos y alérgenos',
    role: 'empleado',
    caption: 'Portal empleado — selector semanal',
  },
  empleadoAlergenos: {
    id: 'empleado-alergenos',
    src: '/screenshots/empleado-alergenos.png',
    alt: 'Card de plato con badges de alérgenos coloreados',
    role: 'empleado',
    caption: 'Portal empleado — alérgenos',
  },
  cateringKDS: {
    id: 'catering-kds',
    src: '/screenshots/catering-kds.png',
    alt: 'Kitchen Display System con consolidación automática de pedidos',
    role: 'catering',
    caption: 'Portal catering — KDS',
  },
  cateringRutas: {
    id: 'catering-rutas',
    src: '/screenshots/catering-rutas.png',
    alt: 'Rutas de reparto optimizadas con Google Maps',
    role: 'catering',
    caption: 'Portal catering — rutas',
  },
  cateringFacturacion: {
    id: 'catering-facturacion',
    src: '/screenshots/catering-facturacion.png',
    alt: 'Facturación mensual automática generada el día 1',
    role: 'catering',
    caption: 'Portal catering — facturación',
  },
}
