import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import { checkMaintenance } from '@/lib/auth/maintenance-check'

// Portal multi-tenant con datos por sesión: nunca se prerenderiza en build.
export const dynamic = 'force-dynamic'

/**
 * Layout raíz para el portal de empresa
 * Solo verifica autenticación, el layout real está en /empresa/layout.tsx
 */
export default async function EmpresaRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar autenticación
  const session = await getRequiredSession()
  
  // Verificar que el usuario tiene permisos para portal empresa
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE', 'VIEWER']
  if (!allowedRoles.includes(session.user.role as string)) {
    redirect('/unauthorized')
  }

  await checkMaintenance(session.user.role)

  return children
}

