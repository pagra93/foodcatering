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
  CreditCard,
  Plug,
  FileText,
  Palette,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { PlatiSymbol } from '@/components/marketing/PlatiLogo'

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: number
  subItems?: {
    title: string
    href: string
  }[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Visión ejecutiva y operación en tiempo real',
  },
  {
    title: 'Empresas',
    href: '/admin/empresas',
    icon: Building2,
    description: 'Gestión de empresas clientes',
  },
  {
    title: 'Caterings',
    href: '/admin/caterings',
    icon: ChefHat,
    description: 'Gestión de caterings proveedores',
  },
  {
    title: 'Usuarios y Roles',
    href: '/admin/users',
    icon: Users,
    description: 'RBAC y permisos',
    subItems: [
      { title: 'Usuarios', href: '/admin/users' },
      { title: 'Roles', href: '/admin/users/roles' },
      { title: 'Permisos', href: '/admin/users/permissions' },
    ],
  },
  {
    title: 'Catálogos Globales',
    href: '/admin/catalogs',
    icon: BookOpen,
    description: 'Alérgenos, menús tipo, festivos, zonas',
    subItems: [
      { title: 'Alérgenos', href: '/admin/catalogs/allergens' },
      { title: 'Menús Tipo', href: '/admin/catalogs/menu-templates' },
      { title: 'Calendarios', href: '/admin/catalogs/calendars' },
      { title: 'Zonas y Logística', href: '/admin/catalogs/zones' },
      { title: 'Motivos de Incidencia', href: '/admin/catalogs/incident-reasons' },
    ],
  },
  {
    title: 'Calidad y SLAs',
    href: '/admin/quality',
    icon: ShieldCheck,
    description: 'Auditorías, incidencias, rating',
    badge: 3, // Ejemplo: 3 incidencias críticas
    subItems: [
      { title: 'Auditorías', href: '/admin/quality/audits' },
      { title: 'Incidencias', href: '/admin/quality/incidents' },
      { title: 'Rating y Reputación', href: '/admin/quality/ratings' },
      { title: 'Penalizaciones', href: '/admin/quality/penalties' },
    ],
  },
  {
    title: 'Facturación y Planes',
    href: '/admin/billing',
    icon: CreditCard,
    description: 'Planes, comisiones, liquidaciones',
    subItems: [
      { title: 'Planes SaaS', href: '/admin/billing/plans' },
      { title: 'Liquidaciones', href: '/admin/billing/settlements' },
      { title: 'Comisiones', href: '/admin/billing/commissions' },
      { title: 'Métricas MRR/ARR', href: '/admin/billing/metrics' },
      { title: 'Impuestos', href: '/admin/billing/taxes' },
    ],
  },
  {
    title: 'Integraciones',
    href: '/admin/integrations',
    icon: Plug,
    description: 'ERP, SSO, pagos, webhooks',
    subItems: [
      { title: 'ERP y Contabilidad', href: '/admin/integrations/erp' },
      { title: 'SSO', href: '/admin/integrations/sso' },
      { title: 'Pagos', href: '/admin/integrations/payments' },
      { title: 'Webhooks', href: '/admin/integrations/webhooks' },
      { title: 'API Keys', href: '/admin/integrations/api-keys' },
    ],
  },
  {
    title: 'Compliance',
    href: '/admin/compliance',
    icon: FileText,
    description: 'Fiscal, RGPD, retención, auditoría',
    subItems: [
      { title: 'Retención de Datos', href: '/admin/compliance/retention' },
      { title: 'DPA', href: '/admin/compliance/dpa' },
      { title: 'Auditoría Fiscal', href: '/admin/compliance/fiscal-audit' },
      { title: 'Derechos RGPD', href: '/admin/compliance/gdpr' },
      { title: 'Pentest / OWASP', href: '/admin/compliance/security' },
    ],
  },
  {
    title: 'Plantillas y Branding',
    href: '/admin/templates',
    icon: Palette,
    description: 'E-mails, WhatsApp, temas, dominios',
    subItems: [
      { title: 'Branding por Tenant', href: '/admin/templates/branding' },
      { title: 'Plantillas de Comunicación', href: '/admin/templates/communication' },
      { title: 'Avisos en-app', href: '/admin/templates/announcements' },
    ],
  },
  {
    title: 'Operación',
    href: '/admin/operations',
    icon: Settings,
    description: 'Impersonación, backups, mantenimiento',
    subItems: [
      { title: 'Impersonación', href: '/admin/operations/impersonation' },
      { title: 'Backups', href: '/admin/operations/backups' },
      { title: 'Migraciones', href: '/admin/operations/migrations' },
      { title: 'Mantenimiento', href: '/admin/operations/maintenance' },
      { title: 'Health Checks', href: '/admin/operations/health' },
      { title: 'Rate Limiting', href: '/admin/operations/rate-limiting' },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
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
          {navItems.map((item) => {
            const Icon = item.icon
            const isExpanded = expandedItems.includes(item.title)
            const hasSubItems = item.subItems && item.subItems.length > 0

            return (
              <li key={item.title}>
                {/* Main Item */}
                <div>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={(e) => {
                      if (hasSubItems) {
                        e.preventDefault()
                        toggleExpand(item.title)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn(
                        'h-5 w-5',
                        isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span>{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                      {hasSubItems && (
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      )}
                    </div>
                  </Link>
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

