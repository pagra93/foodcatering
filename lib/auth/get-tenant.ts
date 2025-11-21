import { headers } from 'next/headers'

/**
 * Get tenant information from request headers
 * The middleware injects x-tenant-id and x-tenant-type headers
 */
export async function getTenant() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const tenantType = headersList.get('x-tenant-type')

  if (!tenantId || !tenantType) {
    return null
  }

  return {
    id: tenantId,
    type: tenantType as 'ROOT' | 'EMPRESA' | 'CATERING',
  }
}

