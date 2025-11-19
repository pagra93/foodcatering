/**
 * Helper para obtener el tenant actual en Server Components
 * Usa los headers inyectados por el middleware
 */

import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { cache } from 'react'

/**
 * Obtiene el tenant actual desde los headers (inyectados por middleware)
 * SOLO usar en Server Components
 */
export const getCurrentTenant = cache(async () => {
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  const tenantType = headersList.get('x-tenant-type')
  
  if (!tenantId) {
    throw new Error('No tenant ID in headers. Make sure middleware is configured correctly.')
  }
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      companies: {
        include: {
          policy: true,
          sites: {
            where: { active: true },
            include: {
              _count: {
                select: { employees: true },
              },
            },
          },
          cateringAssignments: {
            where: { active: true },
            orderBy: { priority: 'asc' },
          },
          settings: true,
        },
      },
      restaurants: {
        include: {
          documents: true,
        },
      },
    },
  })
  
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`)
  }
  
  return {
    ...tenant,
    type: tenantType as 'EMPRESA' | 'CATERING',
  }
})

/**
 * Obtiene solo el ID del tenant actual (más rápido)
 */
export const getCurrentTenantId = cache(async () => {
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  
  if (!tenantId) {
    throw new Error('No tenant ID in headers')
  }
  
  return tenantId
})

/**
 * Verifica si el tenant actual es de tipo EMPRESA
 */
export const isEmpresaTenant = cache(async () => {
  const headersList = headers()
  const tenantType = headersList.get('x-tenant-type')
  return tenantType === 'EMPRESA'
})

/**
 * Verifica si el tenant actual es de tipo CATERING
 */
export const isCateringTenant = cache(async () => {
  const headersList = headers()
  const tenantType = headersList.get('x-tenant-type')
  return tenantType === 'CATERING'
})

/**
 * Alias para getCurrentTenant (compatibilidad)
 */
export const getTenant = getCurrentTenant

