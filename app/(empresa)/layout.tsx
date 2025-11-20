import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'

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
  const userRole = (session.user.role as string).toUpperCase().replace(/_/g, '_')
  
  if (!allowedRoles.includes(userRole)) {
    redirect('/acceso-denegado')
  }

  return children
}

