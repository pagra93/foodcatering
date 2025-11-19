/**
 * Queries para gestión de Empleados en Portal Empresa
 * Lista, crear, editar, eliminar, invitar
 */

import { prisma } from '@/lib/db/prisma'
import { subDays } from 'date-fns'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

// ============================================================================
// LISTADO DE EMPLEADOS CON FILTROS
// ============================================================================

export type EmployeeFilters = {
  search?: string
  status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'all'
  department?: string
  siteId?: string
  page?: number
  pageSize?: number
}

export async function getEmployees(tenantId: string, filters: EmployeeFilters = {}) {
  const {
    search,
    status = 'all',
    department,
    siteId,
    page = 1,
    pageSize = 20,
  } = filters

  const thirtyDaysAgo = subDays(new Date(), 30)

  const where: any = {
    tenantId,
    deletedAt: null,
  }

  // Filtro de búsqueda
  if (search) {
    where.OR = [
      { employeeNumber: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { nameEnc: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ]
  }

  // Filtro de estado
  if (status !== 'all') {
    where.status = status
  }

  // Filtro de departamento
  if (department && department !== 'all') {
    where.department = department
  }

  // Filtro de sede
  if (siteId && siteId !== 'all') {
    where.siteId = siteId
  }

  const [employees, total, departments] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nameEnc: true,
            status: true,
            createdAt: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.employee.count({ where }),
    // Obtener lista de departamentos únicos para filtros
    prisma.employee.findMany({
      where: { tenantId, deletedAt: null },
      select: { department: true },
      distinct: ['department'],
    }).then((depts) => depts.map((d) => d.department).filter(Boolean)),
  ])

  // Enriquecer con métricas de cada empleado
  const employeesWithMetrics = await Promise.all(
    employees.map(async (emp) => {
      const [ordersLast30Days, totalSpent, lastOrder] = await Promise.all([
        prisma.order.count({
          where: {
            employeeId: emp.id,
            serviceDate: { gte: thirtyDaysAgo },
            deletedAt: null,
          },
        }),
        prisma.order.aggregate({
          where: {
            employeeId: emp.id,
            deletedAt: null,
          },
          _sum: { price: true },
        }).then((result) => result._sum.price || 0),
        prisma.order.findFirst({
          where: {
            employeeId: emp.id,
            deletedAt: null,
          },
          select: { serviceDate: true },
          orderBy: { serviceDate: 'desc' },
        }),
      ])

      return {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        name: emp.user.nameEnc,
        email: emp.user.email,
        department: emp.department,
        position: emp.position,
        site: emp.site,
        status: emp.status,
        startDate: emp.startDate,
        endDate: emp.endDate,
        weeklyMenuDays: emp.weeklyMenuDays,
        monthlyLimit: emp.monthlyLimit ? Number(emp.monthlyLimit) : null,
        metrics: {
          ordersLast30Days,
          totalSpent: Number(totalSpent),
          lastOrderDate: lastOrder?.serviceDate,
        },
        createdAt: emp.createdAt,
      }
    })
  )

  return {
    employees: employeesWithMetrics,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    filters: {
      departments,
    },
  }
}

// ============================================================================
// DETALLE DE EMPLEADO
// ============================================================================

export async function getEmployeeById(employeeId: string, tenantId: string) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      tenantId,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          nameEnc: true,
          phoneEnc: true,
          status: true,
          mfaEnabled: true,
          createdAt: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          postalCode: true,
        },
      },
      ratings: {
        include: {
          order: {
            select: {
              id: true,
              serviceDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!employee) {
    return null
  }

  const thirtyDaysAgo = subDays(new Date(), 30)

  // Métricas del empleado
  const [
    ordersTotal,
    ordersLast30Days,
    ordersThisMonth,
    totalSpent,
    avgRating,
    recentOrders,
    incidents,
  ] = await Promise.all([
    prisma.order.count({
      where: { employeeId: employee.id, deletedAt: null },
    }),
    prisma.order.count({
      where: {
        employeeId: employee.id,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    }),
    prisma.order.count({
      where: {
        employeeId: employee.id,
        serviceDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        deletedAt: null,
      },
    }),
    prisma.order.aggregate({
      where: { employeeId: employee.id, deletedAt: null },
      _sum: { price: true },
    }).then((result) => result._sum.price || 0),
    prisma.orderRating.aggregate({
      where: { employeeId: employee.id },
      _avg: { rating: true },
    }).then((result) => result._avg.rating || null),
    prisma.order.findMany({
      where: { employeeId: employee.id, deletedAt: null },
      select: {
        id: true,
        serviceDate: true,
        status: true,
        price: true,
        menuType: true,
      },
      orderBy: { serviceDate: 'desc' },
      take: 20,
    }),
    prisma.incident.findMany({
      where: {
        order: {
          employeeId: employee.id,
        },
      },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    name: employee.user.nameEnc,
    email: employee.user.email,
    phone: employee.user.phoneEnc,
    department: employee.department,
    position: employee.position,
    startDate: employee.startDate,
    endDate: employee.endDate,
    status: employee.status,
    weeklyMenuDays: employee.weeklyMenuDays,
    monthlyLimit: employee.monthlyLimit ? Number(employee.monthlyLimit) : null,
    dietPrefs: employee.dietPrefs,
    notes: employee.notes,
    site: employee.site,
    user: {
      id: employee.user.id,
      status: employee.user.status,
      mfaEnabled: employee.user.mfaEnabled,
      createdAt: employee.user.createdAt,
    },
    metrics: {
      ordersTotal,
      ordersLast30Days,
      ordersThisMonth,
      totalSpent: Number(totalSpent),
      avgTicket: ordersTotal > 0 ? Number(totalSpent) / ordersTotal : 0,
      avgRating: avgRating ? Number(avgRating) : null,
    },
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      serviceDate: order.serviceDate,
      status: order.status,
      price: Number(order.price),
      menuType: order.menuType,
    })),
    recentRatings: employee.ratings.map((rating) => ({
      id: rating.id,
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt,
      order: rating.order,
    })),
    incidents,
  }
}

// ============================================================================
// CREAR EMPLEADO
// ============================================================================

export async function createEmployee(
  tenantId: string,
  data: {
    email: string
    name: string
    employeeNumber?: string
    department?: string
    position?: string
    siteId: string
    startDate?: Date
    weeklyMenuDays?: number
    monthlyLimit?: number
    dietPrefs?: any
    notes?: string
    sendInvitation?: boolean
  }
) {
  // Verificar que el email no exista
  const existingUser = await prisma.user.findFirst({
    where: {
      email: data.email,
      tenantId,
    },
  })

  if (existingUser) {
    throw new Error('Ya existe un usuario con ese email')
  }

  // Crear en transacción
  const result = await prisma.$transaction(async (tx) => {
    // Crear usuario
    const user = await tx.user.create({
      data: {
        tenantId,
        email: data.email,
        nameEnc: data.name,
        passwordHash: await bcrypt.hash(nanoid(16), 10), // Password temporal
        role: 'EMPLOYEE',
        status: 'ACTIVE',
      },
    })

    // Crear empleado
    const employee = await tx.employee.create({
      data: {
        tenantId,
        userId: user.id,
        siteId: data.siteId,
        employeeNumber: data.employeeNumber,
        department: data.department,
        position: data.position,
        startDate: data.startDate,
        weeklyMenuDays: data.weeklyMenuDays || 4,
        monthlyLimit: data.monthlyLimit,
        dietPrefs: data.dietPrefs || {},
        notes: data.notes,
        status: 'ACTIVE',
      },
    })

    // Crear invitación si se solicita
    if (data.sendInvitation) {
      const token = nanoid(32)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // Expira en 7 días

      await tx.employeeInvitation.create({
        data: {
          tenantId,
          companyId: tenantId, // TODO: obtener companyId correcto
          email: data.email,
          name: data.name,
          department: data.department,
          position: data.position,
          token,
          expiresAt,
          createdBy: user.id, // TODO: obtener userId del creador
          employeeId: employee.id,
        },
      })

      // TODO: Enviar email de invitación
    }

    return { user, employee }
  })

  return result.employee
}

// ============================================================================
// ACTUALIZAR EMPLEADO
// ============================================================================

export async function updateEmployee(
  employeeId: string,
  tenantId: string,
  data: Partial<{
    employeeNumber: string
    department: string
    position: string
    siteId: string
    startDate: Date
    endDate: Date
    weeklyMenuDays: number
    monthlyLimit: number
    dietPrefs: any
    notes: string
    status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
  }>
) {
  const employee = await prisma.employee.update({
    where: {
      id: employeeId,
      tenantId,
    },
    data,
  })

  return employee
}

// ============================================================================
// ELIMINAR EMPLEADO (SOFT DELETE)
// ============================================================================

export async function deleteEmployee(employeeId: string, tenantId: string) {
  await prisma.employee.update({
    where: {
      id: employeeId,
      tenantId,
    },
    data: {
      deletedAt: new Date(),
      status: 'DISABLED',
    },
  })
}

// ============================================================================
// IMPORTAR EMPLEADOS DESDE CSV
// ============================================================================

export async function importEmployeesFromCSV(
  tenantId: string,
  employees: Array<{
    email: string
    name: string
    employeeNumber?: string
    department?: string
    position?: string
    siteName: string // Buscar por nombre de sede
    startDate?: string
  }>
) {
  const results = {
    success: 0,
    errors: [] as Array<{ row: number; email: string; error: string }>,
  }

  // Obtener todas las sedes del tenant
  const sites = await prisma.companySite.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true },
  })

  const siteMap = new Map(sites.map((s) => [s.name.toLowerCase(), s.id]))

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i]

    try {
      // Buscar sede por nombre
      const siteId = siteMap.get(emp.siteName.toLowerCase())
      if (!siteId) {
        results.errors.push({
          row: i + 1,
          email: emp.email,
          error: `Sede "${emp.siteName}" no encontrada`,
        })
        continue
      }

      await createEmployee(tenantId, {
        email: emp.email,
        name: emp.name,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        position: emp.position,
        siteId,
        startDate: emp.startDate ? new Date(emp.startDate) : undefined,
        sendInvitation: true,
      })

      results.success++
    } catch (error: any) {
      results.errors.push({
        row: i + 1,
        email: emp.email,
        error: error.message || 'Error desconocido',
      })
    }
  }

  return results
}

