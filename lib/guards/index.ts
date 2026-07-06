/**
 * Guards - Exportación centralizada de todos los guards
 */

// HOCs para Server Components
export {
  RoleGuard,
  RequireRole,
  RequireSuperAdmin,
  RequireAdminEmpresa,
  RequireRRHH,
  RequireAdminCatering,
} from './RoleGuard'

// Helpers para API routes (basados en rol/tenant). Los guards basados en el
// mapa estático de permisos se retiraron (M11): usar permittedAction/permitted
// con la lista de permisos de la sesión.
export {
  requireAuth,
  requireRoles,
  requireTenantAccess,
  requireSuperAdmin,
  withAuth,
  withRoles,
} from './api'

