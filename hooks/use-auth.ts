'use client'

/**
 * Hook de cliente: atajo tipado sobre `useSession` de next-auth con el perfil
 * extendido del proyecto (tenantId, tenantType, role, impersonationToken).
 */

import { useSession } from 'next-auth/react'

export function useAuth() {
  const { data, status, update } = useSession()
  const user = data?.user ?? null

  return {
    user,
    session: data,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    role: user?.role ?? null,
    tenantId: user?.tenantId ?? null,
    tenantType: user?.tenantType ?? null,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isImpersonating: Boolean(user?.impersonationToken),
    refresh: update,
  }
}
