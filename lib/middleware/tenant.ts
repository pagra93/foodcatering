/**
 * Middleware Multi-Tenant
 * Resuelve tenant_id desde el subdominio
 */

import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Cache en memoria para resolución de tenants (evitar DB en cada request)
 * En producción, usar Redis
 */
const tenantCache = new Map<
  string,
  {
    id: string
    type: string
    status: string
    name: string
    timestamp: number
  }
>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Extraer subdominio del request
 */
export function getSubdomainFromRequest(req: NextRequest): string | null {
  const host = req.headers.get('host')
  if (!host) return null

  // Desarrollo: admin.sintupper.localhost → admin
  // Producción: admin.sintupper.com → admin

  const parts = host.split('.')

  // Si no hay subdomain (ej: sintupper.localhost)
  if (parts.length < 3) return null

  // Extraer el primer segmento
  const subdomain = parts[0]
  if (!subdomain) return null

  // Validar que no sea un subdominio del sistema
  if (['www', 'api'].includes(subdomain)) {
    return null
  }

  return subdomain
}

/**
 * Resolver tenant desde subdomain
 */
export async function resolveTenantFromSubdomain(
  subdomain: string
): Promise<{
  id: string
  type: string
  status: string
  name: string
} | null> {
  // Verificar cache
  const cached = tenantCache.get(subdomain)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      id: cached.id,
      type: cached.type,
      status: cached.status,
      name: cached.name,
    }
  }

  // Buscar en DB
  try {
    const tenant = await prisma.tenant.findUnique({
      where: {
        subdomain,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
      },
    })

    if (!tenant) {
      return null
    }

    // Guardar en cache
    const cacheEntry = {
      id: tenant.id,
      type: tenant.type,
      status: tenant.status,
      name: tenant.name,
      timestamp: Date.now(),
    }
    tenantCache.set(subdomain, cacheEntry)

    return tenant
  } catch (error) {
    console.error('Error al resolver tenant:', error)
    return null
  }
}

/**
 * Limpiar cache de un tenant (cuando se actualiza)
 */
export function clearTenantCache(subdomain: string) {
  tenantCache.delete(subdomain)
}

/**
 * Limpiar todo el cache
 */
export function clearAllTenantCache() {
  tenantCache.clear()
}

/**
 * Verificar si un tenant está activo
 */
export function isTenantActive(status: string): boolean {
  return status === 'ACTIVE'
}

