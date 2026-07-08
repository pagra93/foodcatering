/**
 * Queries para gestión completa de Empresas
 * Incluye: Tenant, Company, Policy, Sites, Users, Orders, Incidents
 */

// F5: listado/KPIs globales de empresas = admin cross-tenant → sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import { subDays, startOfMonth, startOfDay, endOfDay } from 'date-fns'
import { decryptNameSafe } from '@/lib/crypto/pii'
import { getCompanyAdoption } from '@/lib/db/queries/company-metrics'

// ============================================================================
// KPIs GLOBALES DE EMPRESAS
// ============================================================================

/**
 * Obtener KPIs globales de todas las empresas
 * Para el dashboard principal de empresas
 */
export async function getCompaniesGlobalKPIs() {
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)
  const startOfCurrentMonth = startOfMonth(today)

  const [
    // Totales básicos
    totalCompanies,
    activeCompanies,
    suspendedCompanies,
    
    // Empleados
    totalEmployees,
    activeEmployeesCount,
    
    // Pedidos
    ordersToday,
    ordersThisMonth,
    ordersLast30Days,
    
    // Incidencias
    incidentsOpen,
    incidentsLast30Days,
    
    // Facturación
    totalSpendThisMonth,
    
    // Deducibilidad
    companiesWithIssues,
  ] = await Promise.all([
    // Total de empresas
    prisma.tenant.count({
      where: {
        type: 'EMPRESA',
        deletedAt: null,
      },
    }),

    // Empresas activas
    prisma.tenant.count({
      where: {
        type: 'EMPRESA',
        status: 'ACTIVE',
        deletedAt: null,
      },
    }),

    // Empresas suspendidas
    prisma.tenant.count({
      where: {
        type: 'EMPRESA',
        status: 'SUSPENDED',
        deletedAt: null,
      },
    }),

    // Total de empleados registrados
    prisma.employee.count({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
      },
    }),

    // Empleados que han pedido este mes (únicos) — definición canónica de adopción
    prisma.order.findMany({
      where: {
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
      select: { employeeId: true },
      distinct: ['employeeId'],
    }).then((orders) => orders.length),

    // Pedidos de hoy (rango del día completo, no timestamp exacto)
    prisma.order.count({
      where: {
        serviceDate: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        deletedAt: null,
      },
    }),

    // Pedidos este mes
    prisma.order.count({
      where: {
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
    }),

    // Pedidos últimos 30 días
    prisma.order.count({
      where: {
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    }),

    // Incidencias abiertas
    prisma.incident.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),

    // Incidencias últimos 30 días
    prisma.incident.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Gasto total este mes (sum de precios de pedidos)
    prisma.order.aggregate({
      where: {
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
      _sum: {
        price: true,
      },
    }).then((result) => result._sum.price || 0),

    // Empresas con problemas de deducibilidad (límite > 11€)
    prisma.companyPolicy.count({
      where: {
        limitPerDay: { gt: 11.00 },
      },
    }),
  ])

  // Calcular tasas
  const adoptionRate = totalEmployees > 0 
    ? Math.round((activeEmployeesCount / totalEmployees) * 100) 
    : 0

  const incidentRate = ordersLast30Days > 0 
    ? ((incidentsLast30Days / ordersLast30Days) * 100).toFixed(2)
    : '0.00'

  const avgOrdersPerDay = ordersLast30Days > 0 
    ? Math.round(ordersLast30Days / 30) 
    : 0

  return {
    companies: {
      total: totalCompanies,
      active: activeCompanies,
      suspended: suspendedCompanies,
      withIssues: companiesWithIssues,
    },
    employees: {
      total: totalEmployees,
      active: activeEmployeesCount,
      adoptionRate, // %
    },
    orders: {
      today: ordersToday,
      thisMonth: ordersThisMonth,
      last30Days: ordersLast30Days,
      avgPerDay: avgOrdersPerDay,
    },
    incidents: {
      open: incidentsOpen,
      last30Days: incidentsLast30Days,
      rate: parseFloat(incidentRate), // %
    },
    financial: {
      monthlySpend: Number(totalSpendThisMonth),
      avgTicket: ordersThisMonth > 0 
        ? Number(totalSpendThisMonth) / ordersThisMonth 
        : 0,
    },
  }
}

// ============================================================================
// LISTADO DE EMPRESAS CON FILTROS Y PAGINACIÓN
// ============================================================================

/**
 * Obtener lista de empresas con KPIs y filtros
 * Para la tabla principal de empresas
 */
export async function getCompanies({
  page = 1,
  pageSize = 20,
  search,
  status,
  plan,
  deductibilityIssues,
}: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  plan?: string
  deductibilityIssues?: boolean
} = {}) {
  const thirtyDaysAgo = subDays(new Date(), 30)

  // Construir filtros
  const where: any = {
    type: 'EMPRESA',
    deletedAt: null,
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { subdomain: { contains: search, mode: 'insensitive' } },
      { companies: { some: { cif: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  if (status) {
    where.status = status
  }

  // Obtener empresas
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        companies: {
          include: {
            policy: true,
            saasPlan: { select: { id: true, code: true, name: true } },
            sites: {
              where: { active: true },
              include: {
                _count: {
                  select: { employees: true },
                },
              },
            },
            cateringAssignments: {
              where: { active: true, type: 'PRIMARY' },
              take: 1,
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count({ where }),
  ])

  // Enriquecer cada empresa con KPIs
  const companiesWithKPIs = await Promise.all(
    tenants.map(async (tenant) => {
      const company = tenant.companies[0]
      if (!company) return null

      // KPIs de pedidos, incidencias y adopción (definición canónica única)
      const [ordersLast30Days, incidents, adoption] = await Promise.all([
        prisma.order.count({
          where: {
            tenantEmpresa: tenant.id,
            serviceDate: { gte: thirtyDaysAgo },
            deletedAt: null,
          },
        }),
        prisma.incident.count({
          where: {
            tenantEmpresa: tenant.id,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        }),
        getCompanyAdoption(tenant.id),
      ])

      const totalEmployees = adoption.totalEmployees
      const activeEmployees = adoption.activeEmployees
      const adoptionRate = adoption.adoptionRate

      const hasDeductibilityIssue = company.policy && Number(company.policy.limitPerDay) > 11.00

      return {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        company: {
          id: company.id,
          legalName: company.legalName,
          cif: company.cif,
          plan: company.saasPlan?.name ?? '—',
          saasPlanId: company.saasPlanId,
          sector: company.sector,
        },
        policy: company.policy ? {
          cutoffTime: company.policy.cutoffTime,
          limitPerDay: Number(company.policy.limitPerDay),
          daysActive: company.policy.daysActive,
        } : null,
        sites: company.sites.length,
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          adoptionRate,
        },
        orders: {
          last30Days: ordersLast30Days,
        },
        incidents: {
          open: incidents,
        },
        catering: company.cateringAssignments[0] ? {
          tenantId: company.cateringAssignments[0].tenantCatering,
        } : null,
        alerts: {
          deductibilityIssue: hasDeductibilityIssue,
          lowAdoption: adoptionRate < 50,
          highIncidents: incidents > 5,
        },
        createdAt: tenant.createdAt,
      }
    })
  )

  // Filtrar nulos y aplicar filtros adicionales
  let filteredCompanies = companiesWithKPIs.filter((c) => c !== null)

  if (plan) {
    filteredCompanies = filteredCompanies.filter((c) => c?.company.plan === plan)
  }

  if (deductibilityIssues) {
    filteredCompanies = filteredCompanies.filter((c) => c?.alerts.deductibilityIssue)
  }

  return {
    companies: filteredCompanies,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ============================================================================
// DETALLE COMPLETO DE UNA EMPRESA
// ============================================================================

/**
 * Obtener información COMPLETA de una empresa
 * Para la página de detalle con todos los tabs
 */
export async function getCompanyByIdComplete(tenantId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30)
  const ninetyDaysAgo = subDays(new Date(), 90)
  const startOfCurrentMonth = startOfMonth(new Date())

  // Obtener tenant con toda la información relacionada
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId, type: 'EMPRESA' },
    include: {
      companies: {
        include: {
          policy: true,
          saasPlan: { select: { id: true, code: true, name: true } },
          sites: {
            where: { active: true }, // CompanySite usa 'active', no 'deletedAt'
            include: {
              employees: {
                where: { deletedAt: null }, // Employee sí tiene deletedAt
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
                },
              },
              _count: {
                select: { employees: true },
              },
            },
          },
          cateringAssignments: {
            where: { active: true },
            orderBy: { priority: 'asc' },
          },
        },
      },
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          nameEnc: true,
          role: true,
          mfaEnabled: true,
          status: true,
          createdAt: true,
        },
      },
    },
  })

  const company = tenant?.companies[0]
  if (!tenant || !company) {
    return null
  }

  // KPIs paralelos
  const [
    orders30Days,
    orders90Days,
    ordersThisMonth,
    ordersDelivered30Days,
    incidents30Days,
    incidentsOpen,
    recentOrders,
    totalSpend30Days,
    totalSpendThisMonth,
  ] = await Promise.all([
    // Pedidos últimos 30 días
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    }),
    // Pedidos últimos 90 días
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: ninetyDaysAgo },
        deletedAt: null,
      },
    }),
    // Pedidos este mes
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
    }),
    // Pedidos entregados (30 días)
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        status: 'DELIVERED',
        deletedAt: null,
      },
    }),
    // Incidencias últimos 30 días
    prisma.incident.findMany({
      where: {
        tenantEmpresa: tenantId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            serviceDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Incidencias abiertas
    prisma.incident.count({
      where: {
        tenantEmpresa: tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
    // Pedidos recientes (sin info de empleado porque Order no tiene relación con Employee)
    prisma.order.findMany({
      where: {
        tenantEmpresa: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        employeeId: true, // Solo el ID, no la relación
        serviceDate: true,
        status: true,
        menuType: true,
        price: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Gasto total 30 días
    prisma.order.aggregate({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      _sum: { price: true },
    }).then((result) => result._sum.price || 0),
    // Gasto este mes
    prisma.order.aggregate({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
      _sum: { price: true },
    }).then((result) => result._sum.price || 0),
  ])

  // Adopción/empleados: definición canónica única (mes natural + todos ACTIVE).
  // Igual en detalle, lista y portal → mismo número en todas las pantallas.
  const adoption = await getCompanyAdoption(tenantId)
  const totalEmployees = adoption.totalEmployees
  const activeEmployeesThisMonth = adoption.activeEmployees
  const adoptionRate = adoption.adoptionRate

  // Mapa empleadoId → nombre descifrado (reusa los empleados ya cargados por sede)
  // para resolver el nombre en "Pedidos recientes" sin query extra.
  const employeeNameById = new Map<string, string>()
  for (const site of company.sites) {
    for (const emp of site.employees) {
      employeeNameById.set(emp.id, decryptNameSafe(emp.user.nameEnc))
    }
  }

  const incidentRate = orders30Days > 0
    ? ((incidents30Days.length / orders30Days) * 100).toFixed(2)
    : '0.00'

  const deliverySuccessRate = orders30Days > 0 
    ? Math.round((ordersDelivered30Days / orders30Days) * 100)
    : 0

  const avgTicket30Days = orders30Days > 0 
    ? Number(totalSpend30Days) / orders30Days 
    : 0

  const avgTicketThisMonth = ordersThisMonth > 0 
    ? Number(totalSpendThisMonth) / ordersThisMonth 
    : 0

  // Obtener información del catering asignado
  const primaryCatering = company.cateringAssignments.find(
    (assignment) => assignment.type === 'PRIMARY'
  )

  let cateringInfo = null
  if (primaryCatering) {
    const cateringTenant = await prisma.tenant.findUnique({
      where: { id: primaryCatering.tenantCatering },
      select: {
        id: true,
        name: true,
        subdomain: true,
        contactEmail: true,
        contactPhone: true,
      },
    })
    cateringInfo = {
      ...cateringTenant,
      assignment: {
        type: primaryCatering.type,
        zones: primaryCatering.zones,
        slaPunctuality: primaryCatering.slaPunctuality ? Number(primaryCatering.slaPunctuality) : null,
        slaIncidentRate: primaryCatering.slaIncidentRate ? Number(primaryCatering.slaIncidentRate) : null,
        assignedAt: primaryCatering.assignedAt,
      },
    }
  }

  // Detectar alertas
  const hasDeductibilityIssue = company.policy && Number(company.policy.limitPerDay) > 11.00
  const hasLowAdoption = adoptionRate < 50
  const hasHighIncidents = incidentsOpen > 5
  const hasNoOrders = orders30Days === 0

  return {
    // Información base
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    primaryColor: tenant.primaryColor,
    logoUrl: tenant.logoUrl,
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,

    // Company
    company: {
      id: company.id,
      legalName: company.legalName,
      cif: company.cif,
      billingAddress: company.billingAddress,
      plan: company.saasPlan?.name ?? '—',
      saasPlanId: company.saasPlanId,
      sector: company.sector,
      contactRrhhName: company.contactRrhhName,
      contactRrhhEmail: company.contactRrhhEmail,
      contactRrhhPhone: company.contactRrhhPhone,
      contactFinanceName: company.contactFinanceName,
      contactFinanceEmail: company.contactFinanceEmail,
      contactFinancePhone: company.contactFinancePhone,
      employeeCount: company.employeeCount,
      contractSignedAt: company.contractSignedAt,
      contractUrl: company.contractUrl,
      monthlySpend: company.monthlySpend ? Number(company.monthlySpend) : 0,
      deductibilityRate: company.deductibilityRate ? Number(company.deductibilityRate) : 100,
      adoptionRate: company.adoptionRate ? Number(company.adoptionRate) : 0,
    },

    // Policy
    policy: company.policy ? {
      id: company.policy.id,
      cutoffTime: company.policy.cutoffTime,
      daysActive: company.policy.daysActive,
      limitPerDay: Number(company.policy.limitPerDay),
      copayCompany: Number(company.policy.copayCompany),
      copayEmployee: Number(company.policy.copayEmployee),
      noShowRule: company.policy.noShowRule,
      effectiveFrom: company.policy.effectiveFrom,
      effectiveTo: company.policy.effectiveTo,
      version: company.policy.version,
    } : null,

    // Sedes
    sites: company.sites.map((site) => ({
      id: site.id,
      name: site.name,
      address: site.address,
      city: site.city,
      postalCode: site.postalCode,
      deliveryWindow: site.deliveryWindow,
      contactName: site.contactName,
      contactPhone: site.contactPhone,
      employeeCount: site._count.employees,
      active: site.active,
      employees: site.employees.map((emp) => ({
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        position: emp.position,
        startDate: emp.startDate,
        status: emp.status,
        user: {
          id: emp.user.id,
          email: emp.user.email,
          name: decryptNameSafe(emp.user.nameEnc),
          status: emp.user.status,
        },
      })),
    })),

    // Catering asignado
    catering: cateringInfo,

    // Usuarios
    users: tenant.users.map((user) => ({
      id: user.id,
      email: user.email,
      name: decryptNameSafe(user.nameEnc),
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      status: user.status,
      createdAt: user.createdAt,
    })),

    // KPIs
    kpis: {
      // Pedidos
      orders30Days,
      orders90Days,
      ordersThisMonth,
      ordersDelivered30Days,
      deliverySuccessRate, // %
      avgOrdersPerDay: Math.round(orders30Days / 30),
      
      // Empleados (definición canónica: mes natural + todos ACTIVE)
      totalEmployees,
      activeEmployeesThisMonth,
      adoptionRate, // %

      // Incidencias
      incidentsOpen,
      incidents30Days: incidents30Days.length,
      incidentRate: parseFloat(incidentRate), // %
      
      // Financiero
      totalSpend30Days: Number(totalSpend30Days),
      totalSpendThisMonth: Number(totalSpendThisMonth),
      avgTicket30Days,
      avgTicketThisMonth,
    },

    // Incidencias recientes
    recentIncidents: incidents30Days,

    // Pedidos recientes (con nombre del empleado resuelto desde los ya cargados)
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      employeeId: order.employeeId,
      employeeName: employeeNameById.get(order.employeeId) ?? null,
      serviceDate: order.serviceDate,
      status: order.status,
      menuType: order.menuType,
      price: Number(order.price),
      createdAt: order.createdAt,
    })),

    // Alertas
    alerts: {
      deductibilityIssue: hasDeductibilityIssue,
      lowAdoption: hasLowAdoption,
      highIncidents: hasHighIncidents,
      noOrders: hasNoOrders,
      totalAlerts: [
        hasDeductibilityIssue,
        hasLowAdoption,
        hasHighIncidents,
        hasNoOrders,
      ].filter(Boolean).length,
    },
  }
}

/**
 * Obtener información completa de una empresa (versión simplificada - legacy)
 * Incluye todo lo necesario para el dashboard de empresa
 */
export async function getCompanyById(tenantId: string) {
  // Obtener tenant (base)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId, type: 'EMPRESA' },
    include: {
      companies: {
        include: {
          policy: true,
          saasPlan: { select: { id: true, code: true, name: true } },
          sites: {
            where: { active: true },
            include: {
              _count: {
                select: { employees: true },
              },
            },
          },
        },
      },
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          nameEnc: true,
          role: true,
          mfaEnabled: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  })

  const company = tenant?.companies[0]
  if (!tenant || !company) {
    return null
  }

  // KPIs: Obtener pedidos de los últimos 30 días
  const thirtyDaysAgo = subDays(new Date(), 30)
  const [totalOrders, activeEmployees, recentIncidents] = await Promise.all([
    // Total de pedidos en los últimos 30 días
    prisma.order.count({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    }),

    // Empleados activos (que han pedido en los últimos 30 días)
    prisma.order.findMany({
      where: {
        tenantEmpresa: tenantId,
        serviceDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: { employeeId: true },
      distinct: ['employeeId'],
    }).then((orders) => orders.length),

    // Incidencias de los últimos 30 días
    prisma.incident.findMany({
      where: {
        tenantEmpresa: tenantId,
        createdAt: { gte: thirtyDaysAgo },
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

  // Calcular tasa de adopción
  const totalEmployees = company.sites.reduce(
    (sum, site) => sum + site._count.employees,
    0
  )
  const adoptionRate =
    totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0

  return {
    // Información base del tenant
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    primaryColor: tenant.primaryColor,
    logoUrl: tenant.logoUrl,
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone,
    address: tenant.address,
    city: tenant.city,
    postalCode: tenant.postalCode,
    country: tenant.country,
    timezone: tenant.timezone,
    currency: tenant.currency,
    language: tenant.language,
    notes: tenant.notes,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,

    // Información de la empresa
    company: {
      id: company.id,
      legalName: company.legalName,
      cif: company.cif,
      billingAddress: company.billingAddress,
      plan: company.saasPlan?.name ?? '—',
      saasPlanId: company.saasPlanId,
      billingCycle: company.billingCycle,
      // Política de servicio incluida en company
      policy: company.policy,
    },

    // Sedes
    sites: company.sites.map((site) => ({
      id: site.id,
      name: site.name,
      address: site.address,
      deliveryWindow: site.deliveryWindow,
      employeeCount: site._count.employees,
      active: site.active,
    })),

    // Usuarios
    users: tenant.users,

    // KPIs
    kpis: {
      totalOrders,
      activeEmployees,
      totalEmployees,
      adoptionRate,
      incidentsCount: recentIncidents.length,
    },

    // Incidencias recientes
    recentIncidents,
  }
}

/**
 * Obtener catering asignado a una empresa
 */
export async function getAssignedCatering(_tenantId: string) {
  // Por ahora retornamos null hasta que se implemente RestaurantAssignment
  // TODO: Implementar cuando se defina la lógica de asignación
  return null
}

/**
 * Obtener actividad reciente de una empresa (últimos pedidos)
 */
export async function getCompanyActivity(tenantId: string, limit = 10) {
  const orders = await prisma.order.findMany({
    where: {
      tenantEmpresa: tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      serviceDate: true,
      status: true,
      menuType: true,
      price: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return orders
}

/**
 * Crear una empresa completa
 * Crea: Tenant + Company + CompanyPolicy + CompanySite inicial
 */
export async function createCompany(data: {
  name: string
  subdomain: string
  contactEmail?: string
  contactPhone?: string
  primaryColor?: string
  logoUrl?: string
  legalName: string
  cif: string
  billingAddress: string
  saasPlanId?: string | null
  billingCycle?: 'MONTHLY' | 'YEARLY'
  policy: {
    cutoffTime: string
    daysActive: string[]
    limitPerDay: number
    copayCompany: number
    copayEmployee: number
    noShowRule: 'CHARGE' | 'NO_CHARGE' | 'PARTIAL'
  }
  site: {
    name: string
    address: string
    deliveryWindow?: string
  }
  timezone?: string
  currency?: string
  language?: string
}) {
  // Usar transacción para crear todo de forma atómica
  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear Tenant
    const tenant = await tx.tenant.create({
      data: {
        type: 'EMPRESA',
        name: data.name,
        subdomain: data.subdomain,
        status: 'ACTIVE',
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
        timezone: data.timezone || 'Europe/Madrid',
        currency: data.currency || 'EUR',
        language: data.language || 'es',
      },
    })

    // 2. Crear Company
    const company = await tx.company.create({
      data: {
        tenantId: tenant.id,
        legalName: data.legalName,
        cif: data.cif,
        billingAddress: data.billingAddress,
        saasPlanId: data.saasPlanId ?? null,
        billingCycle: data.billingCycle ?? 'MONTHLY',
        // Ancla de aniversario: al asignar plan, arranca la suscripción hoy (F3).
        subscriptionStartedAt: data.saasPlanId ? new Date() : null,
      },
    })

    // 3. Crear CompanyPolicy
    const policy = await tx.companyPolicy.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        cutoffTime: data.policy.cutoffTime,
        daysActive: data.policy.daysActive,
        limitPerDay: data.policy.limitPerDay,
        copayCompany: data.policy.copayCompany,
        copayEmployee: data.policy.copayEmployee,
        noShowRule: data.policy.noShowRule,
      },
    })

    // 4. Crear Sede inicial
    const site = await tx.companySite.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        name: data.site.name,
        address: data.site.address,
        deliveryWindow: data.site.deliveryWindow,
        active: true,
      },
    })

    return {
      tenant,
      company,
      policy,
      site,
    }
  })

  return result.tenant
}

/**
 * Actualizar una empresa
 * Actualiza: Tenant, Company y CompanyPolicy
 */
export async function updateCompany(
  tenantId: string,
  data: Partial<{
    name: string
    contactEmail?: string
    contactPhone?: string
    primaryColor?: string
    logoUrl?: string
    legalName: string
    billingAddress: string
    saasPlanId: string | null
    billingCycle: 'MONTHLY' | 'YEARLY'
    policy: {
      cutoffTime: string
      daysActive: string[]
      limitPerDay: number
      copayCompany: number
      copayEmployee: number
      noShowRule: 'CHARGE' | 'NO_CHARGE' | 'PARTIAL'
    }
  }>
) {
  await prisma.$transaction(async (tx) => {
    // 1. Actualizar Tenant
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl,
      },
    })

    // 2. Si hay datos de company, actualizar
    if (
      data.legalName ||
      data.billingAddress ||
      data.saasPlanId ||
      data.billingCycle
    ) {
      const company = await tx.company.findFirst({
        where: { tenantId },
      })

      if (company) {
        // Si aún no tiene ancla de aniversario y (ya) tiene plan, arrancarla (F3).
        const startsSubscription =
          !company.subscriptionStartedAt &&
          (data.saasPlanId || company.saasPlanId)
        await tx.company.update({
          where: { id: company.id },
          data: {
            legalName: data.legalName,
            billingAddress: data.billingAddress,
            ...(data.saasPlanId ? { saasPlanId: data.saasPlanId } : {}),
            ...(data.billingCycle ? { billingCycle: data.billingCycle } : {}),
            ...(startsSubscription ? { subscriptionStartedAt: new Date() } : {}),
          },
        })
      }
    }

    // 3. Si hay datos de política, actualizar
    if (data.policy) {
      const company = await tx.company.findFirst({
        where: { tenantId },
      })

      if (company) {
        await tx.companyPolicy.update({
          where: { companyId: company.id },
          data: {
            cutoffTime: data.policy.cutoffTime,
            daysActive: data.policy.daysActive,
            limitPerDay: data.policy.limitPerDay,
            copayCompany: data.policy.copayCompany,
            copayEmployee: data.policy.copayEmployee,
            noShowRule: data.policy.noShowRule,
          },
        })
      }
    }
  })
}

