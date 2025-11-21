/**
 * Layout principal del Portal del Empleado
 * UI simple y mobile-first
 */

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { EmpleadoNavbar } from '@/components/empleado/EmpleadoNavbar'

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const tenant = await getTenant()

  if (!session) {
    redirect('/login')
  }

  if (tenant.type !== 'EMPRESA') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmpleadoNavbar
        user={{
          name: session.user.name || '',
          email: session.user.email || '',
          role: session.user.role || '',
        }}
      />
      <main className="pb-20">
        {children}
      </main>
    </div>
  )
}

