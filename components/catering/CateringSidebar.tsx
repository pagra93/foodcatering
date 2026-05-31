'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  UtensilsCrossed,
  Calendar,
  ChefHat,
  Truck,
  Building2,
  AlertCircle,
  Receipt,
  FileText,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

type CateringSidebarProps = {
  tenant: {
    id: string
    name: string
    subdomain: string
    status: string
    logoUrl?: string | null
    primaryColor?: string | null
  }
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
  branding?: {
    primaryColor: string
    primaryForeground: string
    logoUrl: string | null
  }
}

// Navegación del portal del catering
const navigation = [
  {
    name: 'Dashboard',
    href: '/catering/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN_CATERING', 'CHEF', 'COCINERO', 'REPARTIDOR', 'FINANZAS_CATERING'],
  },
  {
    name: 'Platos',
    href: '/catering/platos',
    icon: UtensilsCrossed,
    roles: ['ADMIN_CATERING', 'CHEF'],
  },
  {
    name: 'Menús Semanales',
    href: '/catering/menus',
    icon: Calendar,
    roles: ['ADMIN_CATERING', 'CHEF', 'COCINERO'],
  },
  {
    name: 'Producción',
    href: '/catering/produccion',
    icon: ChefHat,
    roles: ['ADMIN_CATERING', 'CHEF', 'COCINERO'],
  },
  {
    name: 'Repartos',
    href: '/catering/rutas',
    icon: Truck,
    roles: ['ADMIN_CATERING', 'REPARTIDOR'],
  },
  {
    name: 'Empresas',
    href: '/catering/empresas',
    icon: Building2,
    roles: ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR', 'FINANZAS_CATERING'],
  },
  {
    name: 'Incidencias',
    href: '/catering/incidencias',
    icon: AlertCircle,
    roles: ['ADMIN_CATERING', 'CHEF', 'REPARTIDOR', 'FINANZAS_CATERING'],
  },
  {
    name: 'Calidad',
    href: '/catering/calidad',
    icon: ShieldCheck,
    roles: ['ADMIN_CATERING', 'CHEF', 'FINANZAS_CATERING'],
  },
  {
    name: 'Facturación',
    href: '/catering/facturacion',
    icon: Receipt,
    roles: ['ADMIN_CATERING', 'FINANZAS_CATERING'],
  },
  {
    name: 'Auditoría',
    href: '/catering/auditoria',
    icon: FileText,
    roles: ['ADMIN_CATERING', 'FINANZAS_CATERING'],
  },
  {
    name: 'Configuración',
    href: '/catering/configuracion',
    icon: Settings,
    roles: ['ADMIN_CATERING'],
  },
]

export function CateringSidebar({
  tenant,
  user,
  branding,
}: CateringSidebarProps) {
  const pathname = usePathname()
  const effectiveLogo = branding?.logoUrl ?? tenant.logoUrl
  const effectivePrimary =
    branding?.primaryColor ?? tenant.primaryColor ?? '#F59E0B'
  const effectivePrimaryFg = branding?.primaryForeground ?? '#ffffff'

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(user.role || '')
  )

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:flex lg:flex-col hidden">
      {/* Logo y nombre del catering */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        {effectiveLogo ? (
          <img
            src={effectiveLogo}
            alt={tenant.name}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
            style={{ backgroundColor: effectivePrimary, color: effectivePrimaryFg }}
          >
            <ChefHat className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {tenant.name}
          </h2>
          <p className="text-xs text-muted-foreground truncate">{tenant.subdomain}</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? ''
                  : 'text-foreground hover:bg-background hover:text-foreground'
              )}
              style={
                isActive
                  ? {
                      backgroundColor: effectivePrimary + '15',
                      color: effectivePrimary,
                    }
                  : undefined
              }
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? '' : 'text-muted-foreground group-hover:text-gray-600'
                )}
                style={isActive ? { color: effectivePrimary } : undefined}
              />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Usuario actual */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
            <AvatarFallback>
              {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user.name || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        {user.role && (
          <Badge variant="outline" className="mt-2 text-xs">
            {user.role.replace('_', ' ')}
          </Badge>
        )}
      </div>
    </div>
  )
}

