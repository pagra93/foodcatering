/**
 * Seed de DEMO
 *
 * Crea un entorno listo para enseñar todas las pantallas de los 4 portales:
 * - 1 empresa con 5 empleados + RRHH + finanzas
 * - 1 catering con chef + repartidor + admin
 * - ~45 días de historial (pedidos, entregas, ratings, incidencias)
 * - Facturación mensual (Invoice, Settlement, SaasInvoice) del mes pasado y mes actual parcial
 * - Catálogos base (Allergen, SaasPlan, TaxRule, IncidentReason, SystemSettings)
 *
 * Idempotente: se puede re-ejecutar; los datos operativos se regeneran, los catálogos usan upsert.
 *
 * Ejecución:
 *   DATABASE_URL="<prod>" pnpm tsx prisma/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client'
import { ensureSystemPlans } from './_ensure-plans'
import type { OrderStatus } from '@prisma/client'
import bcryptjs from 'bcryptjs'
import { subDays, startOfDay, startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import {
  CANONICAL_ALLERGENS,
  splitEtiquetas,
  normalizeAllergyCodes,
} from './seed-allergens'

const { hash } = bcryptjs
const prisma = new PrismaClient()

const today = startOfDay(new Date())
const HISTORY_DAYS = 45

async function main() {
  console.log('🌱 Seed DEMO iniciando...')
  console.log(`   Target: ${process.env['DATABASE_URL']?.replace(/:[^:@]*@/, ':***@') ?? '(sin DATABASE_URL)'}\n`)

  // ============================================================================
  // 1. CATÁLOGOS BASE
  // ============================================================================
  console.log('📚 Catálogos base...')

  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      brandName: 'Plati',
      defaultPrimaryColor: '#E0492A',
    },
  })

  // Catálogo de planes: lo siembra prisma/seed-plans.ts (features + límites +
  // scope). Aquí solo garantizamos que existan los 3 de sistema (idempotente).
  const saasPlans = [
    { code: 'starter', name: 'Starter', monthlyPrice: 49, maxEmployees: 20, maxOrdersMonth: 500, support: 'BASIC' },
    { code: 'growth', name: 'Growth', monthlyPrice: 149, maxEmployees: 100, maxOrdersMonth: 3000, support: 'PRIORITY' },
    { code: 'enterprise', name: 'Enterprise', monthlyPrice: 499, maxEmployees: null, maxOrdersMonth: null, support: 'DEDICATED' },
  ]
  for (const plan of saasPlans) {
    await prisma.saasPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: {
        code: plan.code,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        maxEmployees: plan.maxEmployees,
        maxOrdersMonth: plan.maxOrdersMonth,
        supportLevel: plan.support,
      },
    })
  }

  const taxRules = [
    { code: 'IVA_COMIDA', name: 'IVA 10% comida', rate: 10, category: 'food' },
    { code: 'IVA_GENERAL', name: 'IVA 21% general', rate: 21, category: 'service' },
  ]
  for (const tax of taxRules) {
    await prisma.taxRule.upsert({
      where: { code: tax.code },
      update: {},
      create: {
        code: tax.code,
        name: tax.name,
        rate: tax.rate,
        category: tax.category,
        validFrom: new Date('2024-01-01'),
      },
    })
  }

  for (const a of CANONICAL_ALLERGENS) {
    await prisma.allergen.upsert({
      where: { code: a.code },
      update: { name: a.name, category: a.category, active: true },
      create: a,
    })
  }

  const incidentReasons = [
    { code: 'LATE_DELIVERY', name: 'Entrega tardía', category: 'DELIVERY', defaultSeverity: 'MEDIUM' as const, requiresCompensation: true },
    { code: 'WRONG_ORDER', name: 'Pedido erróneo', category: 'QUALITY', defaultSeverity: 'HIGH' as const, requiresCompensation: true },
    { code: 'QUALITY_ISSUE', name: 'Problema de calidad', category: 'QUALITY', defaultSeverity: 'HIGH' as const, requiresCompensation: true },
    { code: 'MISSING_ITEM', name: 'Plato faltante', category: 'DELIVERY', defaultSeverity: 'MEDIUM' as const, requiresCompensation: true },
    { code: 'TEMPERATURE', name: 'Temperatura incorrecta', category: 'QUALITY', defaultSeverity: 'MEDIUM' as const, requiresCompensation: false },
  ]
  for (const r of incidentReasons) {
    await prisma.incidentReason.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    })
  }

  const holidays = [
    { date: new Date(today.getFullYear(), 0, 1), name: 'Año Nuevo' },
    { date: new Date(today.getFullYear(), 4, 1), name: 'Día del Trabajador' },
    { date: new Date(today.getFullYear(), 11, 25), name: 'Navidad' },
  ]
  for (const h of holidays) {
    const existing = await prisma.holiday.findFirst({
      where: { date: h.date, name: h.name, scope: 'NATIONAL' },
    })
    if (!existing) {
      await prisma.holiday.create({
        data: { date: h.date, name: h.name, scope: 'NATIONAL' },
      })
    }
  }

  console.log('   ✅ catálogos base OK')

  // ============================================================================
  // 2. TENANT ROOT + SUPER_ADMIN
  // ============================================================================
  console.log('👑 Tenant ROOT + super admin...')

  const rootTenant = await prisma.tenant.upsert({
    where: { subdomain: 'admin' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      type: 'ROOT',
      name: 'Administración Plataforma',
      subdomain: 'admin',
      status: 'ACTIVE',
      config: { theme: 'admin', features: ['all'] },
    },
  })

  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: rootTenant.id, email: 'admin@plati.es' } },
    update: {},
    create: {
      tenantId: rootTenant.id,
      email: 'admin@plati.es',
      passwordHash: await hash('Admin123!', 10),
      nameEnc: 'Súper Administrador',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log('   ✅ admin@plati.es / Admin123!')

  // ============================================================================
  // 3. TENANT EMPRESA — "Demo Empresa"
  // ============================================================================
  console.log('🏢 Empresa de demo...')

  const empresaTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demoempresa' },
    update: {},
    create: {
      type: 'EMPRESA',
      name: 'Demo Empresa',
      subdomain: 'demoempresa',
      status: 'ACTIVE',
      config: { branding: { primaryColor: '#2563eb' } },
    },
  })

  const planIdByCode = await ensureSystemPlans(prisma)
  const company = await prisma.company.upsert({
    where: { tenantId: empresaTenant.id },
    update: { saasPlanId: planIdByCode.get('growth') ?? null },
    create: {
      tenantId: empresaTenant.id,
      legalName: 'Demo Empresa S.L.',
      cif: 'B99999999',
      billingAddress: 'Calle Demo 1, 28013 Madrid',
      saasPlanId: planIdByCode.get('growth') ?? null,
      sector: 'Tecnología',
      employeeCount: 5,
      contactRrhhName: 'Laura Martín',
      contactRrhhEmail: 'rrhh@demoempresa.com',
      contactRrhhPhone: '+34 91 000 00 01',
      contactFinanceName: 'Pablo Ruiz',
      contactFinanceEmail: 'finanzas@demoempresa.com',
      contactFinancePhone: '+34 91 000 00 02',
      contractSignedAt: subMonths(today, 2),
      adoptionRate: 85,
      deductibilityRate: 100,
    },
  })

  await prisma.companyPolicy.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      companyId: company.id,
      cutoffTime: '11:00',
      daysActive: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      limitPerDay: 11.0,
      copayCompany: 8.5,
      copayEmployee: 2.5,
      noShowRule: 'NO_CHARGE',
    },
  })

  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      companyId: company.id,
      deliveryLocation: 'Recepción - Planta Baja',
      deliveryInstructions: 'Llamar al timbre',
      notificationsEmail: ['rrhh@demoempresa.com', 'finanzas@demoempresa.com'],
      notifyDailySummary: true,
      notifyIncidents: true,
      notifyInvoices: true,
      notifyLowAdoption: true,
      defaultViewEmployees: 'table',
      defaultPeriodReports: 'month',
      alertCancellationRate: 20,
      alertAdoptionRate: 50,
      alertDeductibilityRate: 85,
    },
  })

  const site = await prisma.companySite.upsert({
    where: { id: 'demoempresa-sede-central' },
    update: {},
    create: {
      id: 'demoempresa-sede-central',
      tenantId: empresaTenant.id,
      companyId: company.id,
      name: 'Sede Central Madrid',
      address: 'Calle Demo 1',
      postalCode: '28013',
      city: 'Madrid',
      contactName: 'Laura Martín',
      contactPhone: '+34 91 000 00 01',
      deliveryWindow: '13:00-14:00',
      deliveryNotes: 'Entregar en recepción',
      active: true,
    },
  })

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: empresaTenant.id, email: 'admin@demoempresa.com' } },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      email: 'admin@demoempresa.com',
      passwordHash: await hash('Empresa123!', 10),
      nameEnc: 'Laura Martín (Admin)',
      role: 'ADMIN_EMPRESA',
      status: 'ACTIVE',
    },
  })

  const rrhhUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: empresaTenant.id, email: 'rrhh@demoempresa.com' } },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      email: 'rrhh@demoempresa.com',
      passwordHash: await hash('Rrhh123!', 10),
      nameEnc: 'Laura Martín (RRHH)',
      role: 'RRHH',
      status: 'ACTIVE',
    },
  })

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: empresaTenant.id, email: 'finanzas@demoempresa.com' } },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      email: 'finanzas@demoempresa.com',
      passwordHash: await hash('Finanzas123!', 10),
      nameEnc: 'Pablo Ruiz (Finanzas)',
      role: 'FINANZAS',
      status: 'ACTIVE',
    },
  })

  const empleadosData = [
    { nombre: 'Marta Sánchez', email: 'marta.sanchez@demoempresa.com', departamento: 'Desarrollo', alergias: [] },
    { nombre: 'Javier Moreno', email: 'javier.moreno@demoempresa.com', departamento: 'Diseño', alergias: ['nuts'] },
    { nombre: 'Lucía Herrera', email: 'lucia.herrera@demoempresa.com', departamento: 'Marketing', alergias: [] },
    { nombre: 'David Castro', email: 'david.castro@demoempresa.com', departamento: 'Ventas', alergias: ['lactose'] },
    { nombre: 'Beatriz Navarro', email: 'beatriz.navarro@demoempresa.com', departamento: 'Operaciones', alergias: ['gluten'] },
  ]

  const empleados: { id: string; userId: string }[] = []
  for (const emp of empleadosData) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: empresaTenant.id, email: emp.email } },
      update: {},
      create: {
        tenantId: empresaTenant.id,
        email: emp.email,
        passwordHash: await hash('Empleado123!', 10),
        nameEnc: emp.nombre,
        role: 'EMPLEADO',
        status: 'ACTIVE',
      },
    })
    let employee = await prisma.employee.findFirst({ where: { userId: user.id } })
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          tenantId: empresaTenant.id,
          userId: user.id,
          siteId: site.id,
          department: emp.departamento,
          dietPrefs: {
            restrictions: emp.alergias.includes('gluten') ? ['sin_gluten'] : [],
            preferences: [],
            allergies: normalizeAllergyCodes(emp.alergias),
            calorieTarget: 2000,
          },
          status: 'ACTIVE',
        },
      })
    }
    empleados.push({ id: employee.id, userId: user.id })
  }

  console.log(`   ✅ ${empleados.length} empleados + admin/rrhh/finanzas`)

  // ============================================================================
  // 4. TENANT CATERING — "Demo Catering"
  // ============================================================================
  console.log('🍽️  Catering de demo...')

  const cateringTenant = await prisma.tenant.upsert({
    where: { subdomain: 'democatering' },
    update: {},
    create: {
      type: 'CATERING',
      name: 'Demo Catering',
      subdomain: 'democatering',
      status: 'ACTIVE',
      config: { branding: { primaryColor: '#ef4444' } },
    },
  })

  const restaurant = await prisma.restaurant.upsert({
    where: { tenantId: cateringTenant.id },
    update: {},
    create: {
      tenantId: cateringTenant.id,
      legalName: 'Demo Catering S.L.',
      displayName: 'Demo Catering Madrid',
      cif: 'B88888888',
      billingAddress: 'Calle Cocina 1, 28020 Madrid',
      contactPerson: 'Chef Demo',
      contactEmail: 'chef@democatering.com',
      contactPhone: '+34 91 000 10 00',
      dailyCapacity: 100,
      zones: [{ name: 'Centro', postalCodes: ['28001', '28013'], maxDistance: 5 }],
      // El cobro vive en el plan de catering (no en Restaurant).
      saasPlanId:
        (await prisma.saasPlan.findUnique({
          where: { code: 'cat-estandar' },
          select: { id: true },
        }))?.id ?? null,
      punctualityRate: 96,
      incidentRate: 2,
      averageRating: 4.4,
      documentsStatus: 'OK',
      operationalStatus: 'ACTIVE',
    },
  })

  await prisma.restaurantDocument.upsert({
    where: { id: 'doc-democatering-sanitario' },
    update: {},
    create: {
      id: 'doc-democatering-sanitario',
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      type: 'REGISTRO_SANITARIO',
      fileUrl: '/docs/registro.pdf',
      issuedAt: subMonths(today, 6),
      expiresAt: new Date(today.getFullYear() + 2, 11, 31),
      status: 'VALID',
    },
  })

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: cateringTenant.id, email: 'admin@democatering.com' } },
    update: {},
    create: {
      tenantId: cateringTenant.id,
      email: 'admin@democatering.com',
      passwordHash: await hash('Catering123!', 10),
      nameEnc: 'Admin Catering',
      role: 'ADMIN_CATERING',
      status: 'ACTIVE',
    },
  })

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: cateringTenant.id, email: 'chef@democatering.com' } },
    update: {},
    create: {
      tenantId: cateringTenant.id,
      email: 'chef@democatering.com',
      passwordHash: await hash('Chef123!', 10),
      nameEnc: 'Chef Demo',
      role: 'CHEF',
      status: 'ACTIVE',
    },
  })

  const repartidorUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: cateringTenant.id, email: 'reparto@democatering.com' } },
    update: {},
    create: {
      tenantId: cateringTenant.id,
      email: 'reparto@democatering.com',
      passwordHash: await hash('Reparto123!', 10),
      nameEnc: 'Repartidor Demo',
      role: 'REPARTIDOR',
      status: 'ACTIVE',
    },
  })

  // ============================================================================
  // 5. ASIGNACIÓN CATERING ↔ EMPRESA
  // ============================================================================
  await prisma.companyCateringAssignment.upsert({
    where: { companyId_tenantCatering: { companyId: company.id, tenantCatering: cateringTenant.id } },
    update: {},
    create: {
      tenantEmpresa: empresaTenant.id,
      tenantCatering: cateringTenant.id,
      companyId: company.id,
      type: 'PRIMARY',
      zones: [{ name: 'Centro Madrid', postalCodes: ['28013'] }],
      priority: 1,
      slaPunctuality: 95,
      slaIncidentRate: 5,
      active: true,
      assignedAt: subMonths(today, 2),
      assignedBy: rrhhUser.id,
    },
  })

  // ============================================================================
  // 6. PLATOS
  // ============================================================================
  console.log('🥘 Platos...')

  const platosData = [
    { nombre: 'Gazpacho andaluz', curso: 'FIRST', precio: 3.5, etiquetas: ['vegan', 'gluten_free'], kcal: 120 },
    { nombre: 'Ensalada César', curso: 'FIRST', precio: 4.0, etiquetas: ['contains_gluten'], kcal: 280 },
    { nombre: 'Crema de verduras', curso: 'FIRST', precio: 3.2, etiquetas: ['vegan', 'gluten_free'], kcal: 150 },
    { nombre: 'Pasta boloñesa', curso: 'FIRST', precio: 4.5, etiquetas: ['contains_gluten'], kcal: 380 },
    { nombre: 'Pollo al horno', curso: 'SECOND', precio: 6.5, etiquetas: ['gluten_free', 'high_protein'], kcal: 420 },
    { nombre: 'Merluza a la plancha', curso: 'SECOND', precio: 7.0, etiquetas: ['gluten_free', 'omega3'], kcal: 180 },
    { nombre: 'Ternera guisada', curso: 'SECOND', precio: 7.5, etiquetas: ['gluten_free'], kcal: 450 },
    { nombre: 'Lasaña vegetal', curso: 'SECOND', precio: 6.0, etiquetas: ['vegetarian', 'contains_gluten'], kcal: 320 },
    { nombre: 'Yogur natural', curso: 'DESSERT', precio: 1.0, etiquetas: ['vegetarian'], kcal: 80 },
    { nombre: 'Fruta de temporada', curso: 'DESSERT', precio: 1.0, etiquetas: ['vegan', 'gluten_free'], kcal: 90 },
    { nombre: 'Flan casero', curso: 'DESSERT', precio: 1.5, etiquetas: ['vegetarian'], kcal: 180 },
    { nombre: 'Brownie', curso: 'DESSERT', precio: 1.3, etiquetas: ['vegetarian', 'contains_gluten'], kcal: 220 },
  ]

  const platos: { id: string; name: string; course: string; basePrice: number }[] = []
  for (const p of platosData) {
    let dish = await prisma.dish.findFirst({
      where: { tenantId: cateringTenant.id, restaurantId: restaurant.id, name: p.nombre },
    })
    if (!dish) {
      const { labels, allergenCodes } = splitEtiquetas(p.etiquetas)
      dish = await prisma.dish.create({
        data: {
          tenantId: cateringTenant.id,
          restaurantId: restaurant.id,
          name: p.nombre,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          course: p.curso as any,
          labels,
          allergens: {
            create: allergenCodes.map((code) => ({
              allergen: { connect: { code } },
            })),
          },
          nutrition: { kcal: p.kcal, protein: 20, carbs: 30, fat: 10 },
          basePrice: p.precio,
          active: true,
        },
      })
    }
    platos.push({ id: dish.id, name: dish.name, course: dish.course, basePrice: Number(dish.basePrice) })
  }

  console.log(`   ✅ ${platos.length} platos`)

  // ============================================================================
  // 7. DATOS OPERATIVOS — limpiar antes para idempotencia
  // ============================================================================
  console.log('🧹 Limpiando historial operativo anterior del tenant demo...')

  await prisma.incident.deleteMany({ where: { tenantEmpresa: empresaTenant.id } })
  await prisma.dishRating.deleteMany({ where: { tenantEmpresa: empresaTenant.id } })
  await prisma.orderRating.deleteMany({ where: { order: { tenantEmpresa: empresaTenant.id } } })
  await prisma.deliveryProof.deleteMany({ where: { order: { tenantEmpresa: empresaTenant.id } } })
  await prisma.deliveryEvent.deleteMany({ where: { order: { tenantEmpresa: empresaTenant.id } } })
  await prisma.orderHistory.deleteMany({ where: { order: { tenantEmpresa: empresaTenant.id } } })
  await prisma.invoiceLine.deleteMany({ where: { invoice: { tenantEmpresa: empresaTenant.id } } })
  await prisma.invoice.deleteMany({ where: { tenantEmpresa: empresaTenant.id } })
  await prisma.order.deleteMany({ where: { tenantEmpresa: empresaTenant.id } })
  await prisma.settlement.deleteMany({ where: { tenantCatering: cateringTenant.id } })
  await prisma.saasInvoice.deleteMany({ where: { tenantEmpresa: empresaTenant.id } })

  // ============================================================================
  // 8. PEDIDOS HISTÓRICOS — 45 días laborables hacia atrás
  // ============================================================================
  console.log(`📦 Generando ${HISTORY_DAYS} días de historial...`)

  const firsts = platos.filter((p) => p.course === 'FIRST')
  const seconds = platos.filter((p) => p.course === 'SECOND')
  const desserts = platos.filter((p) => p.course === 'DESSERT')

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T

  type CreatedOrder = {
    id: string
    employeeId: string
    serviceDate: Date
    status: OrderStatus
    price: number
    first: { id: string; name: string }
    second: { id: string; name: string }
    dessert: { id: string; name: string }
  }

  const ordersByMonth = new Map<string, CreatedOrder[]>()
  let totalOrders = 0

  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const fecha = subDays(today, i)
    const dia = fecha.getDay()
    if (dia === 0 || dia === 6) continue

    // 4 de 5 empleados piden cada día (en promedio)
    const shuffled = [...empleados].sort(() => Math.random() - 0.5)
    const asistentes = shuffled.slice(0, 4 + (Math.random() < 0.4 ? 1 : 0))

    for (const emp of asistentes) {
      const first = pick(firsts)
      const second = pick(seconds)
      const dessert = pick(desserts)
      const price = first.basePrice + second.basePrice + dessert.basePrice

      // 92% delivered, 4% cancelled before cutoff, 4% no show
      const r = Math.random()
      const status: OrderStatus = r < 0.92 ? 'DELIVERED' : r < 0.96 ? 'CANCELLED_BEFORE_CUTOFF' : 'NO_SHOW'

      const order = await prisma.order.create({
        data: {
          tenantEmpresa: empresaTenant.id,
          tenantCatering: cateringTenant.id,
          employeeId: emp.id,
          siteId: site.id,
          serviceDate: fecha,
          menuType: 'FULL',
          price,
          selection: {
            first: { dishId: first.id, name: first.name },
            second: { dishId: second.id, name: second.name },
            dessert: { dishId: dessert.id, name: dessert.name },
          },
          status,
          createdBy: emp.userId,
          lastModifiedBy: emp.userId,
          integrityHash: `demo-${fecha.toISOString().slice(0, 10)}-${emp.id.slice(0, 8)}`,
        },
      })
      totalOrders++

      if (status === 'DELIVERED') {
        const deliveredAt = new Date(fecha.getTime() + 13 * 60 * 60 * 1000)
        await prisma.deliveryProof.create({
          data: {
            orderId: order.id,
            deliveredAt,
            deliveredBy: repartidorUser.id,
            deliveryMethod: 'in_person',
            signatureImageUrl: `/proofs/${order.id}.jpg`,
            geoLocation: { lat: 40.4168, lon: -3.7038 },
            verificationHash: `demo-proof-${order.id.slice(0, 8)}`,
          },
        })

        // 60% dejan rating: por pedido (legacy) + por plato (nuevo)
        if (Math.random() < 0.6) {
          const rating = 3 + Math.floor(Math.random() * 3)
          await prisma.orderRating.create({
            data: {
              orderId: order.id,
              employeeId: emp.id,
              rating,
              tasteRating: rating,
              portionRating: rating,
              presentationRating: rating,
              comment: rating >= 4 ? 'Rico y a tiempo' : 'Correcto',
            },
          })

          // Valoración por plato (fuente de la reputación). Variamos ±1 por plato
          // para que los leaderboards tengan señal.
          const clamp = (n: number) => Math.max(1, Math.min(5, n))
          const perDish: {
            dishId: string
            course: 'FIRST' | 'SECOND' | 'DESSERT'
            comment: string | null
          }[] = [
            { dishId: first.id, course: 'FIRST', comment: null },
            {
              dishId: second.id,
              course: 'SECOND',
              comment: rating >= 4 ? 'Rico y a tiempo' : 'Correcto',
            },
            { dishId: dessert.id, course: 'DESSERT', comment: null },
          ]
          await prisma.dishRating.createMany({
            data: perDish.map((d) => ({
              orderId: order.id,
              dishId: d.dishId,
              course: d.course,
              employeeId: emp.id,
              tenantCatering: cateringTenant.id,
              tenantEmpresa: empresaTenant.id,
              serviceDate: fecha,
              rating: clamp(rating + (Math.floor(Math.random() * 3) - 1)),
              comment: d.comment,
            })),
          })
        }
      }

      const monthKey = format(fecha, 'yyyy-MM')
      if (!ordersByMonth.has(monthKey)) ordersByMonth.set(monthKey, [])
      ordersByMonth.get(monthKey)!.push({
        id: order.id,
        employeeId: emp.id,
        serviceDate: fecha,
        status,
        price,
        first,
        second,
        dessert,
      })
    }
  }

  console.log(`   ✅ ${totalOrders} pedidos`)

  // ============================================================================
  // 9. INCIDENCIAS
  // ============================================================================
  console.log('⚠️  Incidencias...')

  const deliveredOrders = [...ordersByMonth.values()].flat().filter((o) => o.status === 'DELIVERED').slice(-10)
  const incidentTypes = ['LATE_DELIVERY', 'WRONG_ORDER', 'TEMPERATURE'] as const
  for (let i = 0; i < Math.min(3, deliveredOrders.length); i++) {
    const pedido = deliveredOrders[i]
    if (!pedido) continue
    const type = incidentTypes[i % incidentTypes.length]!
    await prisma.incident.create({
      data: {
        tenantEmpresa: empresaTenant.id,
        tenantCatering: cateringTenant.id,
        orderId: pedido.id,
        type,
        severity: 'MEDIUM',
        status: 'RESOLVED',
        openedBy: pedido.employeeId,
        resolvedAt: new Date(pedido.serviceDate.getTime() + 15 * 60 * 60 * 1000),
        resolution: {
          type: 'COMPENSATION',
          amount: 5.0,
          details: `Compensación aplicada por incidencia ${type}`,
        },
      },
    })
  }

  console.log('   ✅ 3 incidencias')

  // ============================================================================
  // 10. FACTURACIÓN — Invoices mensuales (Catering → Empresa)
  // ============================================================================
  console.log('💶 Facturas + Settlements + SaasInvoices...')

  const currentMonth = format(today, 'yyyy-MM')
  const prevMonthDate = subMonths(today, 1)
  const prevMonth = format(prevMonthDate, 'yyyy-MM')
  let invoiceSeq = 1

  for (const [period, orders] of ordersByMonth.entries()) {
    const delivered = orders.filter((o) => o.status === 'DELIVERED')
    if (delivered.length === 0) continue

    const subtotal = delivered.reduce((sum, o) => sum + o.price, 0)
    const taxRate = 10 // IVA comida
    const taxAmount = +(subtotal * taxRate / 100).toFixed(2)
    const total = +(subtotal + taxAmount).toFixed(2)

    const isCurrent = period === currentMonth
    const number = `FAC-${period.replace('-', '')}-${String(invoiceSeq++).padStart(4, '0')}`
    const periodStart = startOfMonth(orders[0]!.serviceDate)
    const periodEnd = endOfMonth(orders[0]!.serviceDate)

    const invoice = await prisma.invoice.create({
      data: {
        tenantCatering: cateringTenant.id,
        tenantEmpresa: empresaTenant.id,
        companyId: company.id,
        period,
        number,
        issueDate: isCurrent ? today : endOfMonth(orders[0]!.serviceDate),
        dueDate: isCurrent
          ? new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
          : new Date(endOfMonth(orders[0]!.serviceDate).getTime() + 30 * 24 * 60 * 60 * 1000),
        startDate: periodStart,
        endDate: periodEnd,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: isCurrent ? 'DRAFT' : 'PAID',
        paidAt: isCurrent ? null : new Date(endOfMonth(orders[0]!.serviceDate).getTime() + 5 * 24 * 60 * 60 * 1000),
        paymentMethod: isCurrent ? null : 'TRANSFER',
        integrityHash: `demo-invoice-${number}`,
      },
    })

    // InvoiceLines
    for (const o of delivered) {
      await prisma.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          date: o.serviceDate,
          orderId: o.id,
          employeeId: o.employeeId,
          concept: `${o.first.name} + ${o.second.name} + ${o.dessert.name}`,
          amount: o.price,
          facturableFlag: 'FULL',
        },
      })
    }

    // Settlement (catering → plataforma) solo para meses cerrados
    if (!isCurrent) {
      const commissionRate = 0.1
      const commissionAmount = +(total * commissionRate).toFixed(2)
      const netOwed = commissionAmount
      await prisma.settlement.create({
        data: {
          tenantCatering: cateringTenant.id,
          period,
          grossAmount: total,
          commissionRate,
          commissionAmount,
          penalties: 0,
          netOwed,
          status: 'PAID',
          issuedAt: endOfMonth(orders[0]!.serviceDate),
          dueBy: new Date(endOfMonth(orders[0]!.serviceDate).getTime() + 10 * 24 * 60 * 60 * 1000),
          paidAt: new Date(endOfMonth(orders[0]!.serviceDate).getTime() + 8 * 24 * 60 * 60 * 1000),
          paymentRef: `TRF-${period}-DEMO`,
          integrityHash: `demo-settlement-${period}`,
        },
      })
    }
  }

  // SaasInvoices (plataforma → empresa, plan mensual)
  let saasSeq = 1
  for (const period of [prevMonth, currentMonth]) {
    const isCurrent = period === currentMonth
    const number = `SAAS-${period.replace('-', '')}-${String(saasSeq++).padStart(4, '0')}`
    await prisma.saasInvoice.create({
      data: {
        tenantEmpresa: empresaTenant.id,
        period,
        planCode: 'GROWTH',
        planName: 'Growth',
        number,
        subtotal: 149,
        taxRate: 21,
        taxAmount: 31.29,
        total: 180.29,
        status: isCurrent ? 'ISSUED' : 'PAID',
        issuedAt: isCurrent ? today : endOfMonth(prevMonthDate),
        dueBy: isCurrent
          ? new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
          : new Date(endOfMonth(prevMonthDate).getTime() + 15 * 24 * 60 * 60 * 1000),
        paidAt: isCurrent ? null : new Date(endOfMonth(prevMonthDate).getTime() + 3 * 24 * 60 * 60 * 1000),
        paymentMethod: isCurrent ? null : 'CARD',
        integrityHash: `demo-saas-${period}`,
      },
    })
  }

  console.log(`   ✅ ${ordersByMonth.size} facturas + ${ordersByMonth.size - 1} settlements + 2 saas invoices`)

  // ============================================================================
  // 11. BACKUP EVENTS (para portal admin)
  // ============================================================================
  console.log('💾 Backup events...')

  await prisma.backupEvent.deleteMany({ where: { notes: 'demo-seed' } })
  for (let i = 0; i < 5; i++) {
    await prisma.backupEvent.create({
      data: {
        fileName: `backup-${format(subDays(today, i), 'yyyy-MM-dd')}.sql.gz`,
        fileSize: BigInt(42_000_000 + Math.floor(Math.random() * 2_000_000)),
        hash: `sha256-demo-${i}`,
        createdBy: 'cron',
        source: 'cron',
        notes: 'demo-seed',
      },
    })
  }

  console.log('   ✅ 5 backups')

  // ============================================================================
  // AUDIT LOG
  // ============================================================================
  await prisma.auditLog.create({
    data: {
      tenantId: rootTenant.id,
      actorId: superAdmin.id,
      action: 'CREATE',
      entity: 'system',
      entityId: 'seed-demo',
      diff: { orders: totalOrders, invoices: ordersByMonth.size, ran: new Date().toISOString() },
      hash: `seed-demo-${Date.now()}`,
    },
  })

  // ============================================================================
  // RESUMEN
  // ============================================================================
  console.log('\n' + '='.repeat(64))
  console.log('🎉 Seed DEMO completo')
  console.log('='.repeat(64))
  console.log('\n🌐 SUBDOMINIOS')
  console.log('  admin.plati.es          → Portal super admin')
  console.log('  demoempresa.plati.es    → Portal empresa')
  console.log('  democatering.plati.es   → Portal catering')
  console.log('\n👤 USUARIOS')
  console.log('  SUPER_ADMIN   admin@plati.es          / Admin123!')
  console.log('  ADMIN_EMPRESA admin@demoempresa.com        / Empresa123!')
  console.log('  RRHH          rrhh@demoempresa.com         / Rrhh123!')
  console.log('  FINANZAS      finanzas@demoempresa.com     / Finanzas123!')
  console.log('  EMPLEADOS (x5)  marta.sanchez|javier.moreno|lucia.herrera|')
  console.log('                  david.castro|beatriz.navarro @demoempresa.com / Empleado123!')
  console.log('  ADMIN_CATERING admin@democatering.com       / Catering123!')
  console.log('  CHEF          chef@democatering.com         / Chef123!')
  console.log('  REPARTIDOR    reparto@democatering.com      / Reparto123!')
  console.log('\n📊 DATOS')
  console.log(`  ${totalOrders} pedidos en ${HISTORY_DAYS} días`)
  console.log(`  ${ordersByMonth.size} facturas Catering→Empresa`)
  console.log(`  ${Math.max(0, ordersByMonth.size - 1)} settlements`)
  console.log(`  2 SaaS invoices Empresa→Plataforma`)
  console.log(`  3 incidencias · 5 backups · 12 platos`)
  console.log('='.repeat(64) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed-demo:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
