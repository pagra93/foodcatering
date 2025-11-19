/**
 * Tipos globales de TypeScript para la aplicación
 */

import type { Prisma } from '@prisma/client'

// ============================================================================
// Tipos de Tenant y Usuario
// ============================================================================

export type TenantWithRelations = Prisma.TenantGetPayload<{
  include: {
    users: true
    companies: true
    restaurants: true
  }
}>

export type TenantBasic = Pick<
  TenantWithRelations,
  'id' | 'type' | 'name' | 'subdomain' | 'status'
>

// ============================================================================
// Tipos de Sesión (NextAuth)
// ============================================================================

export type UserSession = {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
  tenantType: string
}

// ============================================================================
// Tipos de Pedido
// ============================================================================

export type DishSelection = {
  first: {
    dishId: string
    name: string
  } | null
  second: {
    dishId: string
    name: string
  } | null
  dessert: {
    dishId: string
    name: string
  } | null
  menuType: 'full' | 'half'
}

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'cancelled_before_cutoff'
  | 'locked_after_cutoff'
  | 'delivered'
  | 'no_show'
  | 'issue_reported'
  | 'compensated'
  | 'rejected'

export type OrderWithDetails = {
  id: string
  employeeId: string
  serviceDate: Date
  selection: DishSelection
  price: number
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Tipos de API Response
// ============================================================================

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

export type PaginatedResponse<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// Tipos de Formularios
// ============================================================================

export type FormState<T = unknown> = {
  isSubmitting: boolean
  isSuccess: boolean
  error: string | null
  data: T | null
}

// ============================================================================
// Tipos de Filtros
// ============================================================================

export type DateRange = {
  from: Date
  to: Date
}

export type FilterOptions = {
  search?: string
  dateRange?: DateRange
  status?: string[]
  tenantId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Tipos de Notificaciones
// ============================================================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// ============================================================================
// Tipos de KPIs (Dashboard)
// ============================================================================

export type KPI = {
  label: string
  value: number | string
  change?: number // Porcentaje de cambio
  trend?: 'up' | 'down' | 'stable'
  format?: 'number' | 'currency' | 'percentage'
}

export type DashboardData = {
  kpis: KPI[]
  charts: {
    orders: {
      date: string
      count: number
    }[]
    revenue: {
      month: string
      amount: number
    }[]
  }
}

// ============================================================================
// Tipos de Validación
// ============================================================================

export type ValidationError = {
  field: string
  message: string
}

export type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: ValidationError[]
}

