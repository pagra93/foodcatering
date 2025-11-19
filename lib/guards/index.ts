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

export {
  PermissionGuard,
  RequireAllPermissions,
  RequireAnyPermission,
  RequireOrdersCreate,
  RequireOrdersDelete,
  RequireEmployeesManage,
  RequireDishesManage,
} from './PermissionGuard'

// Helpers para API routes
export {
  requireAuth,
  requireRoles,
  requirePermission,
  requireTenantAccess,
  requireSuperAdmin,
  withAuth,
  withRoles,
  withPermission,
} from './api'

