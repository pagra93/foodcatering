/**
 * Navbar minimalista para el Portal del Empleado
 * Mobile-first
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Utensils,
  User,
  History,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogoutButton } from '@/components/LogoutButton'
import { permitted } from '@/lib/auth/section-permissions'

type EmpleadoNavbarProps = {
  user: {
    name: string
    email: string
    role: string
  }
  /** Permisos de la sesión. Vacío (sesión antigua) → se muestra todo. */
  permissions?: string[]
  branding?: {
    primaryColor: string
    primaryForeground: string
    logoUrl: string | null
    brandName: string
  }
}

const navigation = [
  {
    name: 'Menús',
    href: '/empleado/menus',
    icon: Utensils,
    description: 'Selecciona tu comida',
    permission: 'menu-select:view',
  },
  {
    name: 'Mi Perfil',
    href: '/empleado/perfil',
    icon: User,
    description: 'Alergias y preferencias',
    permission: 'profile:view',
  },
  {
    name: 'Historial',
    href: '/empleado/historial',
    icon: History,
    description: 'Mis pedidos anteriores',
    permission: 'history:view',
  },
  {
    name: 'Incidencias',
    href: '/empleado/incidencias',
    icon: AlertCircle,
    description: 'Reportar problemas',
    permission: 'emp-incident-own:view',
  },
]

export function EmpleadoNavbar({ user, permissions = [], branding }: EmpleadoNavbarProps) {
  const pathname = usePathname()
  // Con permisos → filtra por permiso; sin permisos (JWT antiguo) → todo.
  const visibleNavigation =
    permissions.length > 0
      ? navigation.filter((item) => permitted(permissions, item.permission))
      : navigation
  const effectivePrimary = branding?.primaryColor ?? '#3B82F6'
  const effectivePrimaryFg = branding?.primaryForeground ?? '#ffffff'
  const effectiveLogo = branding?.logoUrl ?? null

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              {effectiveLogo ? (
                <img
                  src={effectiveLogo}
                  alt={branding?.brandName ?? 'Mi Comida'}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: effectivePrimary, color: effectivePrimaryFg }}
                >
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  {branding?.brandName ?? 'Mi Comida'}
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {visibleNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive ? '' : 'text-gray-700 hover:bg-gray-100'
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
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Vista Admin (si es admin) */}
              {(user.role === 'ADMIN_EMPRESA' || user.role === 'SUPER_ADMIN') && (
                <Link href="/empresa/dashboard">
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Building2 className="mr-2 h-4 w-4" />
                    Vista Admin
                  </Button>
                </Link>
              )}

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        style={{
                          backgroundColor: effectivePrimary,
                          color: effectivePrimaryFg,
                        }}
                      >
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <Badge variant="outline" className="w-fit text-xs mt-1">
                        {user.role === 'EMPLEADO' ? 'Empleado' : user.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/empleado/perfil" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Mi Perfil
                    </Link>
                  </DropdownMenuItem>
                  {(user.role === 'ADMIN_EMPRESA' || user.role === 'SUPER_ADMIN') && (
                    <DropdownMenuItem asChild>
                      <Link href="/empresa/dashboard" className="cursor-pointer">
                        <Building2 className="mr-2 h-4 w-4" />
                        Vista Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <LogoutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-colors',
                  isActive ? '' : 'text-gray-600 hover:bg-gray-100'
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
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

