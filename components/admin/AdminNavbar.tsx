/**
 * Navbar del Portal Súper Admin
 * Diseño limpio y moderno
 */

import { Search, User, LogOut, Settings, Moon } from 'lucide-react'
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
import { NotificationBellServer } from '@/components/shared/NotificationBellServer'
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
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-8">
        {/* Búsqueda */}
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-ring focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Moon className="h-5 w-5" />
          </button>

          {/* Notificaciones (reales) */}
          <NotificationBellServer />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-tinta text-xs font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <div className="text-xs text-muted-foreground">
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
              <DropdownMenuItem asChild className="text-destructive">
                <form
                  action={async () => {
                    'use server'
                    await signOut()
                  }}
                >
                  <button
                    type="submit"
                    className="flex w-full items-center"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

