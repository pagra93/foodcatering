/**
 * Database exports
 * Cliente Prisma y utilidades de DB
 */

export { prisma, disconnect } from './prisma'

// Re-export tipos de Prisma
export type {
  Tenant,
  User,
  Company,
  Restaurant,
  Order,
  OrderHistory,
  Invoice,
  Incident,
  TenantType,
  UserRole,
  OrderStatus,
} from '@prisma/client'

