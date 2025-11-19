/**
 * Utilidad para determinar la ruta del dashboard según el rol y tipo de tenant
 */

import type { UserRole, TenantType } from '@prisma/client'

/**
 * Obtiene la ruta del dashboard apropiada según el rol del usuario
 * @param role - Rol del usuario
 * @param tenantType - Tipo de tenant (opcional)
 * @returns Ruta del dashboard correspondiente
 */
export function getDashboardPath(role: UserRole, tenantType?: TenantType): string {
  // Super Admin → Portal Root
  if (role === 'SUPER_ADMIN') {
    return '/admin'
  }
  
  // Roles de Empresa
  if (['ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE', 'VIEWER'].includes(role)) {
    return '/empresa/dashboard'
  }
  
  // Roles de Catering
  if (['ADMIN_CATERING', 'CHEF', 'COCINERO', 'REPARTIDOR'].includes(role)) {
    return '/catering/dashboard'
  }
  
  // Empleado → Menús semanales (no tiene dashboard propio)
  if (role === 'EMPLEADO') {
    return '/empleado/menus'
  }
  
  // Fallback → Landing page
  return '/'
}

/**
 * Verifica si una ruta es un dashboard válido
 */
export function isDashboardRoute(pathname: string): boolean {
  const dashboardRoutes = [
    '/admin',
    '/empresa/dashboard',
    '/catering/dashboard',
    '/empleado/menus',
  ]
  
  return dashboardRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
}

