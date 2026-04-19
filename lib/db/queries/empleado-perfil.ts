/**
 * Queries para Perfil del Empleado
 * Vista simple de datos personales y estadísticas
 */

import { prisma } from '@/lib/db/prisma'
import { subDays, startOfMonth, endOfMonth } from 'date-fns'
import { parseDietPrefs } from '@/lib/types/diet-prefs'

// ============================================================================
// OBTENER PERFIL COMPLETO DEL EMPLEADO
// ============================================================================

export async function getEmployeeProfile(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          nameEnc: true,
          phoneEnc: true,
          createdAt: true,
        },
      },
      site: {
        select: {
          name: true,
          address: true,
          city: true,
          company: {
            select: {
              id: true,
              legalName: true,
              policy: {
                select: {
                  limitPerDay: true,
                  cutoffTime: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!employee) {
    throw new Error('Empleado no encontrado')
  }

  // Estadísticas del mes actual
  const startMonth = startOfMonth(new Date())
  const endMonth = endOfMonth(new Date())

  const [
    ordersThisMonth,
    totalSpentThisMonth,
    cancelledThisMonth,
  ] = await Promise.all([
    // Total de pedidos este mes
    prisma.order.count({
      where: {
        employeeId,
        serviceDate: {
          gte: startMonth,
          lte: endMonth,
        },
        status: {
          in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF', 'DELIVERED'],
        },
      },
    }),
    
    // Gasto total este mes
    prisma.order.aggregate({
      where: {
        employeeId,
        serviceDate: {
          gte: startMonth,
          lte: endMonth,
        },
        status: {
          in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF', 'DELIVERED'],
        },
      },
      _sum: {
        price: true,
      },
    }),
    
    // Pedidos cancelados este mes
    prisma.order.count({
      where: {
        employeeId,
        serviceDate: {
          gte: startMonth,
          lte: endMonth,
        },
        status: 'CANCELLED_BEFORE_CUTOFF',
      },
    }),
  ])

  // Estadísticas últimos 30 días
  const last30Days = subDays(new Date(), 30)

  const [
    ordersLast30Days,
    totalSpentLast30Days,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        employeeId,
        serviceDate: {
          gte: last30Days,
        },
        status: {
          in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF', 'DELIVERED'],
        },
      },
    }),
    
    prisma.order.aggregate({
      where: {
        employeeId,
        serviceDate: {
          gte: last30Days,
        },
        status: {
          in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF', 'DELIVERED'],
        },
      },
      _sum: {
        price: true,
      },
    }),
  ])

  // Último pedido
  const lastOrder = await prisma.order.findFirst({
    where: {
      employeeId,
    },
    orderBy: {
      serviceDate: 'desc',
    },
    select: {
      serviceDate: true,
      status: true,
      price: true,
    },
  })

  const dietPrefs = parseDietPrefs(employee.dietPrefs)

  return {
    employee: {
      id: employee.id,
      name: employee.user.nameEnc,
      email: employee.user.email,
      phone: employee.user.phoneEnc,
      employeeNumber: employee.employeeNumber,
      department: employee.department,
      position: employee.position,
      startDate: employee.startDate,
      active: employee.status === 'ACTIVE',
      memberSince: employee.user.createdAt,
      allergens: dietPrefs.allergies,
      blockAllergensEnabled: dietPrefs.blockAllergensEnabled,
    },
    company: {
      name: employee.site.company.legalName,
      logoUrl: null,
      dailyLimit: employee.site.company.policy?.limitPerDay ? Number(employee.site.company.policy.limitPerDay) : 11,
      monthlyLimit: null,
    },
    site: employee.site ? {
      name: employee.site.name,
      address: employee.site.address,
      city: employee.site.city,
    } : null,
    stats: {
      thisMonth: {
        orders: ordersThisMonth,
        spent: totalSpentThisMonth._sum.price ? Number(totalSpentThisMonth._sum.price) : 0,
        cancelled: cancelledThisMonth,
      },
      last30Days: {
        orders: ordersLast30Days,
        spent: totalSpentLast30Days._sum.price ? Number(totalSpentLast30Days._sum.price) : 0,
      },
      lastOrder: lastOrder ? {
        date: lastOrder.serviceDate,
        status: lastOrder.status,
        price: Number(lastOrder.price),
      } : null,
    },
  }
}

// ============================================================================
// OBTENER HISTORIAL MENSUAL (para gráfica)
// ============================================================================

export async function getEmployeeMonthlyHistory(employeeId: string, months: number = 6) {
  const history = []
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const startMonth = startOfMonth(date)
    const endMonth = endOfMonth(date)

    const [ordersCount, totalSpent] = await Promise.all([
      prisma.order.count({
        where: {
          employeeId,
          serviceDate: {
            gte: startMonth,
            lte: endMonth,
          },
          status: {
            in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF', 'DELIVERED'],
          },
        },
      }),
      
      prisma.order.aggregate({
        where: {
          employeeId,
          serviceDate: {
            gte: startMonth,
            lte: endMonth,
          },
          status: {
            in: ['CONFIRMED', 'LOCKED_AFTER_CUTOFF', 'DELIVERED'],
          },
        },
        _sum: {
          price: true,
        },
      }),
    ])

    history.push({
      month: startMonth,
      orders: ordersCount,
      spent: totalSpent._sum.price ? Number(totalSpent._sum.price) : 0,
    })
  }

  return history
}

// ============================================================================
// ACTUALIZAR DATOS BÁSICOS DEL EMPLEADO
// ============================================================================

export async function updateEmployeeProfile(
  employeeId: string,
  data: {
    phone?: string
  }
) {
  // Solo permitir actualizar teléfono por ahora
  // Los demás datos son gestionados por RRHH
  // Employee no tiene relación inversa 'user' en update nested; actualizamos User directamente
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true },
  })
  if (!employee) {
    throw new Error('Empleado no encontrado')
  }
  return prisma.user.update({
    where: { id: employee.userId },
    data: { phoneEnc: data.phone },
  })
}

