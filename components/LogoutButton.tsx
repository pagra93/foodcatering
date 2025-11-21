'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

type LogoutButtonProps = {
  children?: React.ReactNode
  className?: string
  redirectTo?: string
}

export function LogoutButton({ children, className, redirectTo = '/login' }: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: redirectTo })
  }

  return (
    <button
      onClick={handleLogout}
      className={className || 'flex items-center cursor-pointer text-red-600 w-full'}
    >
      {children || (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </>
      )}
    </button>
  )
}

