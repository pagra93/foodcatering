/**
 * Sidebar del Portal Súper Admin
 * 10 módulos según el PRD
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ChefHat,
  Users,
  BookOpen,
  ShieldCheck,
  Star,
  AlertCircle,
  CreditCard,
  Plug,
  FileText,
  Palette,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { PlatiSymbol } from '@/components/marketing/PlatiLogo'

type SubNavItem = {
  title: string
  href: string
  /** Permiso `recurso:view` requerido para ver este sub-item. */
  permission: string
}

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: number
  /** Permiso de la sección (para items sin subItems). */
  permission?: string
  subItems?: SubNavItem[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Visión ejecutiva y operación en tiempo real',
    permission: 'dashboard:view',
  },
  {
    title: 'Empresas',
    href: '/admin/empresas',
    icon: Building2,
    description: 'Gestión de empresas clientes',
    permission: 'empresa:view',
  },
  {
    title: 'Caterings',
    href: '/admin/caterings',
    icon: ChefHat,
    description: 'Gestión de caterings proveedores',
    permission: 'catering:view',
  },
  {
    title: 'Usuarios y Roles',
    href: '/admin/users',
    icon: Users,
    description: 'RBAC y permisos',
    subItems: [
      { title: 'Usuarios', href: '/admin/users', permission: 'user:view' },
      { title: 'Roles', href: '/admin/users/roles', permission: 'role:view' },
    ],
  },
  {
    title: 'Alérgenos y Festivos',
    href: '/admin/catalogs',
    icon: BookOpen,
    description: 'Catálogos normativos: alérgenos UE y calendario de festivos',
    subItems: [
      { title: 'Alérgenos', href: '/admin/catalogs/allergens', permission: 'allergen:view' },
      { title: 'Calendarios', href: '/admin/catalogs/calendars', permission: 'calendar:view' },
    ],
  },
  {
    title: 'Incidencias',
    href: '/admin/incidents',
    icon: AlertCircle,
    description: 'Reportes empleado↔catering↔empresa y sus motivos',
    subItems: [
      { title: 'Incidencias', href: '/admin/incidents', permission: 'incident:view' },
      { title: 'Motivos de Incidencia', href: '/admin/incidents/reasons', permission: 'incident-reason:view' },
    ],
  },
  {
    title: 'Reputación',
    href: '/admin/reputation',
    icon: Star,
    description: 'Valoraciones por plato · calidad de servicio por catering y empresa',
    permission: 'rating:view',
  },
  {
    title: 'Calidad y SLAs',
    href: '/admin/quality',
    icon: ShieldCheck,
    description: 'Auditorías y penalizaciones',
    subItems: [
      { title: 'Auditorías', href: '/admin/quality/audits', permission: 'audit:view' },
      { title: 'Penalizaciones', href: '/admin/quality/penalties', permission: 'penalty:view' },
    ],
  },
  {
    title: 'Facturación y Planes',
    href: '/admin/billing',
    icon: CreditCard,
    description: 'Planes, comisiones, liquidaciones',
    subItems: [
      { title: 'Facturas (comida)', href: '/admin/billing/invoices', permission: 'admin-invoice:view' },
      { title: 'Liquidaciones', href: '/admin/billing/settlements', permission: 'settlement:view' },
      { title: 'Facturas SaaS', href: '/admin/billing/saas-invoices', permission: 'saas-invoice:view' },
      { title: 'Planes SaaS', href: '/admin/billing/plans', permission: 'plan:view' },
      { title: 'Impuestos', href: '/admin/billing/taxes', permission: 'tax:view' },
    ],
  },
  {
    title: 'Integraciones',
    href: '/admin/integrations',
    icon: Plug,
    description: 'ERP, SSO, pagos, webhooks',
    subItems: [
      { title: 'ERP y Contabilidad', href: '/admin/integrations/erp', permission: 'integration:view' },
      { title: 'SSO', href: '/admin/integrations/sso', permission: 'integration:view' },
      { title: 'Pagos', href: '/admin/integrations/payments', permission: 'integration:view' },
      { title: 'Webhooks', href: '/admin/integrations/webhooks', permission: 'webhook:view' },
      { title: 'API Keys', href: '/admin/integrations/api-keys', permission: 'api-key:view' },
    ],
  },
  {
    title: 'Compliance',
    href: '/admin/compliance',
    icon: FileText,
    description: 'Fiscal, RGPD, retención, auditoría',
    subItems: [
      { title: 'Retención de Datos', href: '/admin/compliance/retention', permission: 'retention:view' },
      { title: 'DPA', href: '/admin/compliance/dpa', permission: 'dpa:view' },
      { title: 'Auditoría Fiscal', href: '/admin/compliance/fiscal-audit', permission: 'fiscal-audit:view' },
      { title: 'Derechos RGPD', href: '/admin/compliance/gdpr', permission: 'gdpr:view' },
      { title: 'Pentest / OWASP', href: '/admin/compliance/security', permission: 'security:view' },
      { title: 'Traza de auditoría', href: '/admin/compliance/audit-log', permission: 'audit-log:view' },
    ],
  },
  {
    title: 'Plantillas y Branding',
    href: '/admin/templates',
    icon: Palette,
    description: 'E-mails, WhatsApp, temas, dominios',
    subItems: [
      { title: 'Branding por Tenant', href: '/admin/templates/branding', permission: 'template-branding:view' },
      { title: 'Plantillas de Comunicación', href: '/admin/templates/communication', permission: 'template-communication:view' },
      { title: 'Avisos en-app', href: '/admin/templates/announcements', permission: 'announcement:view' },
    ],
  },
  {
    title: 'Operación',
    href: '/admin/operations',
    icon: Settings,
    description: 'Impersonación, backups, mantenimiento',
    subItems: [
      { title: 'Impersonación', href: '/admin/operations/impersonation', permission: 'impersonate:view' },
      { title: 'Backups', href: '/admin/operations/backups', permission: 'backup:view' },
      { title: 'Migraciones', href: '/admin/operations/migrations', permission: 'migration:view' },
      { title: 'Mantenimiento', href: '/admin/operations/maintenance', permission: 'maintenance:view' },
      { title: 'Health Checks', href: '/admin/operations/health', permission: 'health:view' },
      { title: 'Rate Limiting', href: '/admin/operations/rate-limiting', permission: 'rate-limit:view' },
    ],
  },
]

/** ¿El set de permisos del usuario cubre `perm`? Soporta `*` y `recurso:*`. */
function can(permissions: string[], perm: string): boolean {
  if (permissions.includes('*')) return true
  if (permissions.includes(perm)) return true
  const resource = perm.split(':')[0]
  return permissions.includes(`${resource}:*`)
}

export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname()

  // Filtrar el menú según los permisos del usuario.
  const visibleItems = navItems
    .map((item) => {
      if (item.subItems) {
        const subItems = item.subItems.filter((s) => can(permissions, s.permission))
        return subItems.length > 0 ? { ...item, subItems } : null
      }
      return !item.permission || can(permissions, item.permission) ? item : null
    })
    .filter((item): item is NavItem => item !== null)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  // Sección padre a la que pertenece la ruta actual: se auto-despliega para que
  // sus subsecciones queden visibles al entrar (sin impedir contraerla a mano).
  const activeParentTitle = visibleItems.find(
    (i) => i.subItems && i.subItems.length > 0 && isActive(i.href)
  )?.title
  useEffect(() => {
    if (activeParentTitle) {
      setExpandedItems((prev) =>
        prev.includes(activeParentTitle) ? prev : [...prev, activeParentTitle]
      )
    }
  }, [activeParentTitle])

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <PlatiSymbol tone="tomate" className="h-9 w-9" />
        <div>
          <h2 className="font-display text-base font-extrabold tracking-[-0.02em] text-foreground">
            Plati
          </h2>
          <p className="text-xs text-muted-foreground">Súper Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Navegación principal"
        className="scrollbar-thin h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4"
      >
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isExpanded = expandedItems.includes(item.title)
            const hasSubItems = item.subItems && item.subItems.length > 0

            return (
              <li key={item.title}>
                {/* Main Item: el enlace navega a la página de la sección; el
                    chevron (aparte) solo despliega/contrae las subsecciones. */}
                <div
                  className={cn(
                    'flex items-center rounded-lg transition-all',
                    isActive(item.href)
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  )}
                >
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive(item.href)
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className={cn(
                      'h-5 w-5',
                      isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span>{item.title}</span>
                  </Link>
                  <div className="flex items-center gap-1 pr-2">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                    {hasSubItems && (
                      <button
                        type="button"
                        aria-label={isExpanded ? `Contraer ${item.title}` : `Desplegar ${item.title}`}
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpand(item.title)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub Items */}
                {hasSubItems && isExpanded && (
                  <ul className="mt-1 space-y-0.5 pl-11">
                    {item.subItems?.map((subItem) => (
                      <li key={subItem.href}>
                        <Link
                          href={subItem.href}
                          aria-current={isActive(subItem.href) ? 'page' : undefined}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-sm transition-all',
                            isActive(subItem.href)
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

