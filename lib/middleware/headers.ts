/**
 * Helpers para leer tenant desde headers
 * Inyectados por el middleware
 */

import { headers } from 'next/headers'
import type { TenantType } from '@prisma/client'

/**
 * Obtener tenant ID desde headers
 * Usar en Server Components y API Routes
 */
export async function getTenantIdFromHeaders(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-id')
}

/**
 * Obtener tipo de tenant desde headers
 */
export async function getTenantTypeFromHeaders(): Promise<TenantType | null> {
  const headersList = await headers()
  const type = headersList.get('x-tenant-type')
  return type as TenantType | null
}

/**
 * Obtener contexto completo del tenant desde headers
 */
export async function getTenantFromHeaders() {
  const headersList = await headers()

  return {
    tenantId: headersList.get('x-tenant-id'),
    tenantType: headersList.get('x-tenant-type') as TenantType | null,
    tenantStatus: headersList.get('x-tenant-status'),
  }
}

/**
 * Obtener tenant ID o lanzar error
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantIdFromHeaders()

  if (!tenantId) {
    throw new Error('Tenant ID no encontrado en headers')
  }

  return tenantId
}

