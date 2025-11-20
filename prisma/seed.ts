/**
 * Seed completo de la base de datos
 * Crea datos realistas para testing
 */

import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'
import { subDays, addDays, startOfDay } from 'date-fns'

const { hash } = bcryptjs

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed completo...')

  // ============================================================================
  // 1. TENANT ROOT (Súper Admin)
  // ============================================================================
  console.log('📦 Creando tenant root...')
  
  const rootTenant = await prisma.tenant.upsert({
    where: { subdomain: 'admin' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      type: 'ROOT',
      name: 'Administración Plataforma',
      subdomain: 'admin',
      status: 'ACTIVE',
      config: {
        theme: 'admin',
        features: ['all'],
      },
    },
  })

  // Usuario súper admin
  await prisma.user.upsert({
    where: { 
      tenantId_email: {
        tenantId: rootTenant.id,
        email: 'admin@sintupper.com'
      }
    },
    update: {},
    create: {
      tenantId: rootTenant.id,
      email: 'admin@sintupper.com',
      passwordHash: await hash('Admin123!', 10),
      nameEnc: 'Súper Administrador',
      role: 'SUPER_ADMIN',
      mfaEnabled: false,
      status: 'ACTIVE',
    },
  })

  console.log('✅ Root tenant y admin creados')

  // ============================================================================
  // 2. TENANT EMPRESA - ACME CORPORATION
  // ============================================================================
  console.log('📦 Creando empresa ACME Corporation...')

  const empresaTenant = await prisma.tenant.upsert({
    where: { subdomain: 'acme' },
    update: {},
    create: {
      type: 'EMPRESA',
      name: 'ACME Corporation',
      subdomain: 'acme',
      status: 'ACTIVE',
      config: {
        branding: {
          primaryColor: '#0066cc',
          logo: '/logos/acme.png',
        },
        features: ['ai_nutrition', 'auto_selection'],
      },
    },
  })

  // Company data
  const company = await prisma.company.upsert({
    where: { tenantId: empresaTenant.id },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      legalName: 'ACME Corporation S.L.',
      cif: 'B12345678',
      billingAddress: 'Calle Gran Vía 1, 28013 Madrid',
      plan: 'GROWTH',
      sector: 'Tecnología',
      employeeCount: 50,
      contactRrhhName: 'María García',
      contactRrhhEmail: 'rrhh@acme.com',
      contactRrhhPhone: '+34 91 123 45 67',
      contactFinanceName: 'Carlos López',
      contactFinanceEmail: 'finanzas@acme.com',
      contactFinancePhone: '+34 91 123 45 68',
      contractSignedAt: new Date('2024-01-15'),
      adoptionRate: 0,
      deductibilityRate: 100,
    },
  })

  // Company policy
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

  // Company settings
  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      companyId: company.id,
      deliveryLocation: 'Recepción - Planta Baja',
      deliveryInstructions: 'Llamar al timbre de entrega',
      notificationsEmail: ['rrhh@acme.com', 'finanzas@acme.com'],
      notifyDailySummary: true,
      notifyIncidents: true,
      notifyInvoices: true,
      notifyLowAdoption: true,
      defaultViewEmployees: 'table',
      defaultPeriodReports: 'month',
      alertCancellationRate: 20.0,
      alertAdoptionRate: 50.0,
      alertDeductibilityRate: 85.0,
    },
  })

  // Company site
  const site = await prisma.companySite.upsert({
    where: { id: 'acme-sede-central' },
    update: {},
    create: {
      id: 'acme-sede-central',
      tenantId: empresaTenant.id,
      companyId: company.id,
      name: 'Sede Central Madrid',
      address: 'Calle Gran Vía 1',
      postalCode: '28013',
      city: 'Madrid',
      contactName: 'María García',
      contactPhone: '+34 91 123 45 67',
      deliveryWindow: '13:00-14:00',
      deliveryNotes: 'Entregar en recepción',
      active: true,
    },
  })

  // Usuarios empresa
  const rrhhUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: empresaTenant.id,
        email: 'rrhh@acme.com',
      },
    },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      email: 'rrhh@acme.com',
      passwordHash: await hash('Rrhh123!', 10),
      nameEnc: 'María García (RRHH)',
      role: 'RRHH',
      status: 'ACTIVE',
    },
  })

  const finanzasUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: empresaTenant.id,
        email: 'finanzas@acme.com',
      },
    },
    update: {},
    create: {
      tenantId: empresaTenant.id,
      email: 'finanzas@acme.com',
      passwordHash: await hash('Finanzas123!', 10),
      nameEnc: 'Carlos López (Finanzas)',
      role: 'FINANZAS',
      status: 'ACTIVE',
    },
  })

  // Crear 10 empleados realistas
  const empleados = [
    { nombre: 'Laura Gómez', email: 'laura.gomez@acme.com', departamento: 'Desarrollo', alergias: [] },
    { nombre: 'Pedro Martínez', email: 'pedro.martinez@acme.com', departamento: 'Diseño', alergias: ['nuts'] },
    { nombre: 'Ana Rodríguez', email: 'ana.rodriguez@acme.com', departamento: 'Marketing', alergias: [] },
    { nombre: 'Miguel Torres', email: 'miguel.torres@acme.com', departamento: 'Ventas', alergias: [] },
    { nombre: 'Carmen Sánchez', email: 'carmen.sanchez@acme.com', departamento: 'Desarrollo', alergias: ['lactose'] },
    { nombre: 'David López', email: 'david.lopez@acme.com', departamento: 'Desarrollo', alergias: [] },
    { nombre: 'Elena Fernández', email: 'elena.fernandez@acme.com', departamento: 'RRHH', alergias: [] },
    { nombre: 'Javier García', email: 'javier.garcia@acme.com', departamento: 'Operaciones', alergias: [] },
    { nombre: 'Sofía Martín', email: 'sofia.martin@acme.com', departamento: 'Finanzas', alergias: ['gluten'] },
    { nombre: 'Alberto Ruiz', email: 'alberto.ruiz@acme.com', departamento: 'Ventas', alergias: [] },
  ]

  const empleadosCreados = []

  for (const emp of empleados) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
      tenantId: empresaTenant.id,
          email: emp.email,
    },
      },
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

    // Verificar si el empleado ya existe
    let employee = await prisma.employee.findFirst({
      where: { userId: user.id },
    })

    if (!employee) {
      employee = await prisma.employee.create({
    data: {
      tenantId: empresaTenant.id,
          userId: user.id,
      siteId: site.id,
          department: emp.departamento,
      dietPrefs: {
            restrictions: emp.alergias.includes('gluten') ? ['gluten_free'] : [],
        preferences: [],
            allergies: emp.alergias,
            calorieTarget: 2000,
      },
      status: 'ACTIVE',
    },
  })
    }

    empleadosCreados.push(employee)
  }

  console.log('✅ Empresa ACME, usuarios y 10 empleados creados')

  // ============================================================================
  // 3. TENANT CATERING - DELICIAS EXPRESS
  // ============================================================================
  console.log('📦 Creando catering Delicias Express...')

  const cateringTenant = await prisma.tenant.upsert({
    where: { subdomain: 'deliciasexpress' },
    update: {},
    create: {
      type: 'CATERING',
      name: 'Delicias Express',
      subdomain: 'deliciasexpress',
      status: 'ACTIVE',
      config: {
        branding: {
          primaryColor: '#ff6b6b',
          logo: '/logos/delicias.png',
        },
      },
    },
  })

  // Restaurant data
  const restaurant = await prisma.restaurant.upsert({
    where: { tenantId: cateringTenant.id },
    update: {},
    create: {
      tenantId: cateringTenant.id,
      legalName: 'Delicias Express S.L.',
      displayName: 'Delicias Express Madrid',
      cif: 'B87654321',
      billingAddress: 'Calle de la Cocina 5, 28020 Madrid',
      contactPerson: 'Ana Rodríguez',
      contactEmail: 'chef@deliciasexpress.com',
      contactPhone: '+34 91 987 65 43',
      dailyCapacity: 200,
      zones: [
        { name: 'Centro', postalCodes: ['28001', '28002', '28003', '28013'], maxDistance: 5 },
      ],
      commission: 0.10, // 10%
      punctualityRate: 95.5,
      incidentRate: 2.1,
      averageRating: 4.3,
      documentsStatus: 'OK',
      operationalStatus: 'ACTIVE',
    },
  })

  // Documentos del catering
  await prisma.restaurantDocument.upsert({
    where: { id: 'doc-delicias-sanitario' },
    update: {},
    create: {
      id: 'doc-delicias-sanitario',
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      type: 'REGISTRO_SANITARIO',
      fileUrl: '/docs/registro-sanitario.pdf',
      issuedAt: new Date('2024-01-01'),
      expiresAt: new Date('2026-12-31'),
      status: 'VALID',
    },
  })

  await prisma.restaurantDocument.upsert({
    where: { id: 'doc-delicias-rc' },
    update: {},
    create: {
      id: 'doc-delicias-rc',
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      type: 'RC',
      fileUrl: '/docs/seguro-rc.pdf',
      issuedAt: new Date('2024-01-01'),
      expiresAt: new Date('2025-12-31'),
      status: 'VALID',
    },
  })

  // Usuarios catering
  const chefUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: cateringTenant.id,
        email: 'chef@deliciasexpress.com',
      },
    },
    update: {},
    create: {
      tenantId: cateringTenant.id,
      email: 'chef@deliciasexpress.com',
      passwordHash: await hash('Chef123!', 10),
      nameEnc: 'Ana Rodríguez (Chef)',
      role: 'CHEF',
      status: 'ACTIVE',
    },
  })

  const repartidorUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: cateringTenant.id,
        email: 'reparto@deliciasexpress.com',
      },
    },
    update: {},
    create: {
      tenantId: cateringTenant.id,
      email: 'reparto@deliciasexpress.com',
      passwordHash: await hash('Reparto123!', 10),
      nameEnc: 'Miguel Torres (Repartidor)',
      role: 'REPARTIDOR',
      status: 'ACTIVE',
    },
  })

  // ============================================================================
  // 4. ASIGNACIÓN CATERING ↔ EMPRESA (¡CRÍTICO!)
  // ============================================================================
  console.log('🔗 Creando relación ACME ↔ Delicias Express...')

  await prisma.companyCateringAssignment.upsert({
    where: {
      companyId_tenantCatering: {
        companyId: company.id,
        tenantCatering: cateringTenant.id,
      },
      },
    update: {},
    create: {
      tenantEmpresa: empresaTenant.id,
      tenantCatering: cateringTenant.id,
      companyId: company.id,
      type: 'PRIMARY',
      zones: [{ name: 'Centro Madrid', postalCodes: ['28013'] }],
      priority: 1,
      slaPunctuality: 95.0,
      slaIncidentRate: 5.0,
      active: true,
      assignedAt: new Date('2024-01-15'),
      assignedBy: rrhhUser.id,
    },
  })

  console.log('✅ Relación ACME ↔ Delicias creada')

  // ============================================================================
  // 5. PLATOS DEL CATERING
  // ============================================================================
  console.log('🍽️ Creando menú de platos...')

  const platos = [
    // Primeros
    { nombre: 'Gazpacho andaluz', curso: 'FIRST', precio: 3.5, etiquetas: ['vegan', 'gluten_free', 'low_calorie'], kcal: 120 },
    { nombre: 'Ensalada César', curso: 'FIRST', precio: 4.0, etiquetas: ['contains_gluten'], kcal: 280 },
    { nombre: 'Crema de verduras', curso: 'FIRST', precio: 3.2, etiquetas: ['vegan', 'gluten_free'], kcal: 150 },
    { nombre: 'Pasta carbonara', curso: 'FIRST', precio: 4.5, etiquetas: ['contains_gluten', 'contains_egg'], kcal: 380 },
    
    // Segundos
    { nombre: 'Pollo al horno con patatas', curso: 'SECOND', precio: 6.5, etiquetas: ['gluten_free', 'high_protein'], kcal: 420 },
    { nombre: 'Merluza a la plancha', curso: 'SECOND', precio: 7.0, etiquetas: ['gluten_free', 'low_fat', 'omega3'], kcal: 180 },
    { nombre: 'Ternera guisada', curso: 'SECOND', precio: 7.5, etiquetas: ['gluten_free', 'high_protein'], kcal: 450 },
    { nombre: 'Lasaña de verduras', curso: 'SECOND', precio: 6.0, etiquetas: ['vegetarian', 'contains_gluten'], kcal: 320 },
    
    // Postres
    { nombre: 'Yogur natural', curso: 'DESSERT', precio: 1.0, etiquetas: ['vegetarian', 'probiotic'], kcal: 80 },
    { nombre: 'Fruta de temporada', curso: 'DESSERT', precio: 1.0, etiquetas: ['vegan', 'gluten_free', 'seasonal'], kcal: 90 },
    { nombre: 'Flan casero', curso: 'DESSERT', precio: 1.5, etiquetas: ['vegetarian', 'contains_egg'], kcal: 180 },
    { nombre: 'Helado', curso: 'DESSERT', precio: 1.2, etiquetas: ['vegetarian'], kcal: 150 },
  ]

  const platosCreados = []
  for (const p of platos) {
    const dish = await prisma.dish.create({
      data: {
        tenantId: cateringTenant.id,
        restaurantId: restaurant.id,
        name: p.nombre,
        course: p.curso as any,
        labels: p.etiquetas,
        nutrition: {
          kcal: p.kcal,
          protein: 20,
          carbs: 30,
          fat: 10,
        },
        basePrice: p.precio,
        active: true,
      },
    })
    platosCreados.push(dish)
  }

  console.log(`✅ ${platosCreados.length} platos creados`)

  // ============================================================================
  // 6. PEDIDOS HISTÓRICOS (Últimos 20 días laborables)
  // ============================================================================
  console.log('📦 Generando pedidos históricos...')

  const hoy = startOfDay(new Date())
  let pedidosCreados = 0

  // Generar pedidos para los últimos 20 días laborables (L-V)
  for (let i = 1; i <= 30; i++) {
    const fecha = subDays(hoy, i)
    const diaSemana = fecha.getDay()
    
    // Saltar fines de semana
    if (diaSemana === 0 || diaSemana === 6) continue

    // 70% de los empleados piden cada día (aprox 7 de 10)
    // Fisher-Yates shuffle para garantizar unicidad
    const shuffled = [...empleadosCreados]
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]]
    }
    const empleadosQuePiden = shuffled.slice(0, 7 + Math.floor(Math.random() * 3))

    for (const empleado of empleadosQuePiden) {
      // Seleccionar platos aleatorios
      const primero = platosCreados.filter((p) => p.course === 'FIRST')[Math.floor(Math.random() * 4)]
      const segundo = platosCreados.filter((p) => p.course === 'SECOND')[Math.floor(Math.random() * 4)]
      const postre = platosCreados.filter((p) => p.course === 'DESSERT')[Math.floor(Math.random() * 4)]

      const precioTotal = Number(primero.basePrice) + Number(segundo.basePrice) + Number(postre.basePrice)

      // 95% entregados, 3% cancelados antes, 2% no show
      const rand = Math.random()
      let estado: string
      if (rand < 0.95) estado = 'DELIVERED'
      else if (rand < 0.98) estado = 'CANCELLED_BEFORE_CUTOFF'
      else estado = 'NO_SHOW'

      const order = await prisma.order.create({
      data: {
          tenantEmpresa: empresaTenant.id,
          tenantCatering: cateringTenant.id,
          employeeId: empleado.id,
          siteId: site.id,
          serviceDate: fecha,
          menuType: 'FULL',
          price: precioTotal,
          selection: {
            first: { dishId: primero.id, name: primero.name },
            second: { dishId: segundo.id, name: segundo.name },
            dessert: { dishId: postre.id, name: postre.name },
          },
          status: estado,
          createdBy: empleado.userId,
          lastModifiedBy: empleado.userId,
          integrityHash: `hash-${Date.now()}-${Math.random()}`,
      },
    })

      // Si fue entregado, crear delivery proof y rating
      if (estado === 'DELIVERED') {
        const deliveredAt = new Date(fecha.getTime() + 13 * 60 * 60 * 1000) // 13:00
        await prisma.deliveryProof.create({
      data: {
            orderId: order.id,
            deliveredAt,
            deliveredBy: repartidorUser.id,
            deliveryMethod: 'in_person',
            signatureImageUrl: `/proofs/${order.id}.jpg`,
            geoLocation: { lat: 40.4168, lon: -3.7038 },
            verificationHash: `hash-${Date.now()}-${Math.random()}`,
      },
    })

        // 60% de los usuarios dejan rating
        if (Math.random() < 0.6) {
          const rating = 3 + Math.floor(Math.random() * 3) // 3-5 estrellas
          await prisma.orderRating.create({
      data: {
              orderId: order.id,
              employeeId: empleado.id,
              rating,
              tasteRating: rating,
              portionRating: rating,
              presentationRating: rating,
              comment: rating >= 4 ? 'Muy rico' : 'Correcto',
      },
    })
        }
      }

      pedidosCreados++
    }

    if (pedidosCreados % 50 === 0) {
      console.log(`  ... ${pedidosCreados} pedidos creados`)
    }
  }

  console.log(`✅ ${pedidosCreados} pedidos históricos creados`)

  // ============================================================================
  // 7. INCIDENCIAS (3-4 incidencias de ejemplo)
  // ============================================================================
  console.log('⚠️ Creando incidencias de ejemplo...')

  const pedidosConIncidencia = await prisma.order.findMany({
    where: {
      tenantEmpresa: empresaTenant.id,
      status: 'DELIVERED',
      },
    take: 3,
    orderBy: { serviceDate: 'desc' },
    })

  for (const pedido of pedidosConIncidencia) {
    await prisma.incident.create({
      data: {
        tenantEmpresa: empresaTenant.id,
        tenantCatering: cateringTenant.id,
        orderId: pedido.id,
        type: 'LATE_DELIVERY',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        openedBy: pedido.employeeId,
        resolvedAt: new Date(pedido.serviceDate.getTime() + 15 * 60 * 60 * 1000),
        resolution: {
          type: 'COMPENSATION',
          amount: 5.0,
          details: 'Compensación aplicada por retraso de 20 minutos',
        },
      },
    })
  }

  console.log('✅ 3 incidencias creadas')

  // ============================================================================
  // 8. AUDIT LOG
  // ============================================================================
  await prisma.auditLog.create({
    data: {
      tenantId: rootTenant.id,
      actorId: rrhhUser.id,
      action: 'CREATE',
      entity: 'system',
      entityId: 'complete_seed',
      diff: {
        action: 'complete_database_seed',
        timestamp: new Date().toISOString(),
        orders: pedidosCreados,
      },
      hash: `seed-${Date.now()}`,
    },
  })

  // ============================================================================
  // RESUMEN FINAL
  // ============================================================================
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DEL SEED COMPLETO')
  console.log('='.repeat(60))
  console.log('\n🏢 TENANTS:')
  console.log('  ✅ Root (admin.sintupper.com)')
  console.log('  ✅ ACME Corporation (acme.sintupper.com)')
  console.log('  ✅ Delicias Express (deliciasexpress.sintupper.com)')
  
  console.log('\n👥 USUARIOS:')
  console.log('  ROOT:')
  console.log('    📧 admin@sintupper.com / Admin123!')
  console.log('\n  ACME (Empresa):')
  console.log('    📧 rrhh@acme.com / Rrhh123!')
  console.log('    📧 finanzas@acme.com / Finanzas123!')
  console.log('    📧 laura.gomez@acme.com / Empleado123!')
  console.log(`    ... +9 empleados más`)
  console.log('\n  DELICIAS EXPRESS (Catering):')
  console.log('    📧 chef@deliciasexpress.com / Chef123!')
  console.log('    📧 reparto@deliciasexpress.com / Reparto123!')
  
  console.log('\n📊 DATOS GENERADOS:')
  console.log(`  ✅ 10 empleados`)
  console.log(`  ✅ ${platosCreados.length} platos`)
  console.log(`  ✅ ${pedidosCreados} pedidos (últimos 20 días laborables)`)
  console.log(`  ✅ ~${Math.floor(pedidosCreados * 0.6)} ratings`)
  console.log(`  ✅ 3 incidencias`)
  console.log(`  ✅ 1 relación catering activa`)
  
  console.log('\n🔗 RELACIONES:')
  console.log('  ✅ ACME ↔ Delicias Express (PRIMARY)')
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Seed completado exitosamente!')
  console.log('\n💡 Ahora puedes:')
  console.log('   1. Desplegar en Coolify')
  console.log('   2. Acceder a acme.sintupper.com/login')
  console.log('   3. Ver datos reales en todas las páginas')
  console.log('='.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
