/**
 * Breadcrumbs dinámicos para el portal de Súper Admin
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { Fragment } from 'react'

type BreadcrumbSegment = {
  label: string
  href: string
}

// Mapeo de rutas a nombres legibles
const routeLabels: Record<string, string> = {
  admin: 'Dashboard',
  tenants: 'Tenants',
  empresas: 'Empresas',
  caterings: 'Caterings',
  new: 'Nuevo',
  edit: 'Editar',
  users: 'Usuarios y Roles',
  roles: 'Roles',
  permissions: 'Permisos',
  catalogs: 'Alérgenos y Festivos',
  allergens: 'Alérgenos',
  calendars: 'Calendarios',
  quality: 'Calidad y SLAs',
  reputation: 'Reputación',
  audits: 'Auditorías',
  incidents: 'Incidencias',
  reasons: 'Motivos de Incidencia',
  ratings: 'Rating y Reputación',
  penalties: 'Penalizaciones',
  billing: 'Facturación y Planes',
  plans: 'Planes SaaS',
  settlements: 'Liquidaciones',
  commissions: 'Comisiones',
  metrics: 'Métricas MRR/ARR',
  taxes: 'Impuestos',
  integrations: 'Integraciones',
  erp: 'ERP y Contabilidad',
  sso: 'SSO',
  payments: 'Pagos',
  webhooks: 'Webhooks',
  'api-keys': 'API Keys',
  compliance: 'Compliance',
  retention: 'Retención de Datos',
  dpa: 'DPA',
  'fiscal-audit': 'Auditoría Fiscal',
  gdpr: 'Derechos RGPD',
  security: 'Pentest / OWASP',
  templates: 'Plantillas y Branding',
  branding: 'Branding por Tenant',
  communication: 'Plantillas de Comunicación',
  announcements: 'Avisos en-app',
  operations: 'Operación',
  impersonation: 'Impersonación',
  backups: 'Backups',
  migrations: 'Migraciones',
  maintenance: 'Mantenimiento',
  health: 'Health Checks',
  'rate-limiting': 'Rate Limiting',
}

export function AdminBreadcrumbs() {
  const pathname = usePathname()

  // Generar segmentos del breadcrumb
  const segments: BreadcrumbSegment[] = []
  
  if (!pathname || pathname === '/admin') {
    return null // No mostrar breadcrumbs en el dashboard principal
  }

  const pathParts = pathname.split('/').filter(Boolean)
  
  // Construir breadcrumbs acumulativos
  let currentPath = ''
  pathParts.forEach((part, _index) => {
    currentPath += `/${part}`
    const label = routeLabels[part] || part
    
    // Solo añadir si no es un UUID o un ID numérico
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part) && !/^\d+$/.test(part)) {
      segments.push({
        label,
        href: currentPath,
      })
    }
  })

  if (segments.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      {/* Home */}
      <Link
        href="/admin"
        className="flex items-center hover:text-gray-900"
        title="Dashboard"
      >
        <Home className="h-4 w-4" />
      </Link>

      {/* Segments */}
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1

        return (
          <Fragment key={segment.href}>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-900">{segment.label}</span>
            ) : (
              <Link
                href={segment.href}
                className="hover:text-gray-900"
              >
                {segment.label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}

