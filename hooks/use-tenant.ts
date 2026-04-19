'use client'

/**
 * Hook de cliente: contexto del tenant actual desde la sesión.
 *
 * No hace fetch — usa los datos que ya vienen en el JWT de NextAuth.
 * Para obtener el tenant en Server Components usar `lib/tenant/get-tenant.ts`.
 */

import { useAuth } from './use-auth'

type UseTenantResult = {
  tenantId: string | null
  tenantType: 'EMPRESA' | 'CATERING' | null
  isEmpresa: boolean
  isCatering: boolean
  isSuperAdmin: boolean
  isReady: boolean
}

export function useTenant(): UseTenantResult {
  const { tenantId, tenantType, isSuperAdmin, isLoading } = useAuth()

  return {
    tenantId,
    tenantType: (tenantType as 'EMPRESA' | 'CATERING' | null) ?? null,
    isEmpresa: tenantType === 'EMPRESA',
    isCatering: tenantType === 'CATERING',
    isSuperAdmin,
    isReady: !isLoading && tenantId !== null,
  }
}
