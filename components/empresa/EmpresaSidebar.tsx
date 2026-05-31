'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Settings,
  Users,
  Utensils,
  ChefHat,
  Receipt,
  AlertCircle,
  FileText,
  Activity,
  Building2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

type EmpresaSidebarProps = {
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

const navigation = [
  {
    name: 'Dashboard',
    href: '/empresa/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Configuración',
    href: '/empresa/configuracion',
    icon: Settings,
  },
  {
    name: 'Empleados',
    href: '/empresa/empleados',
    icon: Users,
  },
  {
    name: 'Pedidos',
    href: '/empresa/pedidos',
    icon: Utensils,
  },
  {
    name: 'Catering',
    href: '/empresa/catering',
    icon: ChefHat,
  },
  {
    name: 'Facturación',
    href: '/empresa/facturacion',
    icon: Receipt,
  },
  {
    name: 'Incidencias',
    href: '/empresa/incidencias',
    icon: AlertCircle,
  },
  {
    name: 'Auditoría Fiscal',
    href: '/empresa/auditoria',
    icon: FileText,
  },
  {
    name: 'Actividad',
    href: '/empresa/actividad',
    icon: Activity,
  },
]

export function EmpresaSidebar({
  tenant,
  user,
  branding,
}: EmpresaSidebarProps) {
  const pathname = usePathname()
  const effectiveLogo = branding?.logoUrl ?? tenant.logoUrl
  const effectivePrimary = branding?.primaryColor ?? tenant.primaryColor ?? '#3B82F6'
  const effectivePrimaryFg = branding?.primaryForeground ?? '#ffffff'

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:flex lg:flex-col hidden">
      {/* Logo y nombre de la empresa */}
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
            <Building2 className="h-5 w-5" />
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
        {navigation.map((item) => {
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
                      backgroundColor: effectivePrimary + '15', // ~8% alpha
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
            {user.role}
          </Badge>
        )}
      </div>
    </div>
  )
}

