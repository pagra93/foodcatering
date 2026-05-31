/**
 * Navbar del Portal Súper Admin
 * Diseño limpio y moderno
 */

import { Bell, Search, User, LogOut, Settings, Moon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getRequiredSession } from '@/lib/auth/session'
import { signOut } from '@/lib/auth'

export async function AdminNavbar() {
  const session = await getRequiredSession()
  const user = session.user

  // Iniciales para el avatar
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SA'

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-8">
        {/* Búsqueda */}
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-ring focus:bg-white focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Moon className="h-5 w-5" />
          </button>

          {/* Notificaciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
                <Bell className="h-5 w-5" />
                {/* Badge de notificaciones no leídas */}
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {/* Ejemplo de notificación */}
                <div className="flex gap-3 p-3 hover:bg-gray-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Bell className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Documento sanitario vencido</p>
                    <p className="text-xs text-gray-500">
                      Catering "La Buena Mesa" - hace 2 horas
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="flex gap-3 p-3 hover:bg-gray-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                    <Bell className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Pico de cancelaciones</p>
                    <p className="text-xs text-gray-500">
                      Empresa "Tech Corp" - hace 3 horas
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2 text-center">
                <button className="text-sm text-primary hover:underline">
                  Ver todas las notificaciones
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-tinta text-xs font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-gray-700">{user.name}</p>
                  <div className="text-xs text-gray-500">
                    <Badge variant="secondary" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={async () => {
                  'use server'
                  await signOut()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

