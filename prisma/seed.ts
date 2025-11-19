/**
 * Seed inicial de la base de datos
 * Crea datos de prueba para desarrollo
 */

import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const { hash } = bcryptjs

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

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
  const superAdminUser = await prisma.user.upsert({
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
      nameEnc: 'Súper Administrador', // TODO: cifrar en producción
      role: 'SUPER_ADMIN',
      mfaEnabled: true,
      status: 'ACTIVE',
    },
  })

  console.log('✅ Root tenant y admin creados')

  // ============================================================================
  // 2. TENANT EMPRESA DE PRUEBA
  // ============================================================================
  console.log('📦 Creando empresa de prueba...')

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
  const company = await prisma.company.create({
    data: {
      tenantId: empresaTenant.id,
      legalName: 'ACME Corporation S.L.',
      cif: 'B12345678',
      billingAddress: 'Calle Gran Vía 1, 28013 Madrid',
      plan: 'GROWTH',
    },
  })

  // Company policy
  await prisma.companyPolicy.create({
    data: {
      tenantId: empresaTenant.id,
      companyId: company.id,
      cutoffTime: '11:00',
      daysActive: ['monday', 'tuesday', 'wednesday', 'thursday'],
      limitPerDay: 11.0,
      copayCompany: 6.0,
      copayEmployee: 5.0,
      noShowRule: 'NO_CHARGE',
    },
  })

  // Company site
  const site = await prisma.companySite.create({
    data: {
      tenantId: empresaTenant.id,
      companyId: company.id,
      name: 'Sede Central Madrid',
      address: 'Calle Gran Vía 1, 28013 Madrid',
      deliveryWindow: '13:00-14:00',
      active: true,
    },
  })

  // Usuarios empresa
  const rrhhUser = await prisma.user.create({
    data: {
      tenantId: empresaTenant.id,
      email: 'rrhh@acme.com',
      passwordHash: await hash('Rrhh123!', 10),
      nameEnc: 'María García (RRHH)',
      role: 'RRHH',
      status: 'ACTIVE',
    },
  })

  const finanzasUser = await prisma.user.create({
    data: {
      tenantId: empresaTenant.id,
      email: 'finanzas@acme.com',
      passwordHash: await hash('Finanzas123!', 10),
      nameEnc: 'Carlos López (Finanzas)',
      role: 'FINANZAS',
      status: 'ACTIVE',
    },
  })

  // Empleados de prueba
  const empleado1User = await prisma.user.create({
    data: {
      tenantId: empresaTenant.id,
      email: 'laura.gomez@acme.com',
      passwordHash: await hash('Empleado123!', 10),
      nameEnc: 'Laura Gómez',
      role: 'EMPLEADO',
      status: 'ACTIVE',
    },
  })

  await prisma.employee.create({
    data: {
      tenantId: empresaTenant.id,
      userId: empleado1User.id,
      siteId: site.id,
      dietPrefs: {
        restrictions: ['gluten_free'],
        preferences: ['vegetarian_friendly'],
        allergies: [],
        calorieTarget: 2000,
      },
      status: 'ACTIVE',
    },
  })

  const empleado2User = await prisma.user.create({
    data: {
      tenantId: empresaTenant.id,
      email: 'pedro.martinez@acme.com',
      passwordHash: await hash('Empleado123!', 10),
      nameEnc: 'Pedro Martínez',
      role: 'EMPLEADO',
      status: 'ACTIVE',
    },
  })

  await prisma.employee.create({
    data: {
      tenantId: empresaTenant.id,
      userId: empleado2User.id,
      siteId: site.id,
      dietPrefs: {
        restrictions: [],
        preferences: [],
        allergies: ['nuts'],
        calorieTarget: 2200,
      },
      status: 'ACTIVE',
    },
  })

  console.log('✅ Empresa ACME y usuarios creados')

  // ============================================================================
  // 3. TENANT CATERING DE PRUEBA
  // ============================================================================
  console.log('📦 Creando catering de prueba...')

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
  const restaurant = await prisma.restaurant.create({
    data: {
      tenantId: cateringTenant.id,
      displayName: 'Delicias Express Madrid',
      zones: ['28001', '28002', '28003', '28013'],
      documentsStatus: 'OK',
    },
  })

  // Documentos del catering
  await prisma.restaurantDocument.create({
    data: {
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      type: 'REGISTRO_SANITARIO',
      fileUrl: '/docs/registro-sanitario.pdf',
      issuedAt: new Date('2024-01-01'),
      expiresAt: new Date('2025-12-31'),
      status: 'VALID',
    },
  })

  await prisma.restaurantDocument.create({
    data: {
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
  const chefUser = await prisma.user.create({
    data: {
      tenantId: cateringTenant.id,
      email: 'chef@deliciasexpress.com',
      passwordHash: await hash('Chef123!', 10),
      nameEnc: 'Ana Rodríguez (Chef)',
      role: 'CHEF',
      status: 'ACTIVE',
    },
  })

  const repartidorUser = await prisma.user.create({
    data: {
      tenantId: cateringTenant.id,
      email: 'reparto@deliciasexpress.com',
      passwordHash: await hash('Reparto123!', 10),
      nameEnc: 'Miguel Torres (Repartidor)',
      role: 'REPARTIDOR',
      status: 'ACTIVE',
    },
  })

  // Platos del catering
  const gazpacho = await prisma.dish.create({
    data: {
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      name: 'Gazpacho andaluz',
      course: 'FIRST',
      labels: ['vegan', 'gluten_free', 'low_calorie'],
      nutrition: {
        kcal: 120,
        protein: 2,
        carbs: 15,
        fat: 6,
      },
      basePrice: 3.5,
      active: true,
    },
  })

  const ensaladaCesar = await prisma.dish.create({
    data: {
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      name: 'Ensalada César',
      course: 'FIRST',
      labels: ['contains_gluten', 'contains_egg'],
      nutrition: {
        kcal: 280,
        protein: 12,
        carbs: 20,
        fat: 18,
      },
      basePrice: 4.0,
      active: true,
    },
  })

  const polloHorno = await prisma.dish.create({
    data: {
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      name: 'Pollo al horno con patatas',
      course: 'SECOND',
      labels: ['gluten_free', 'high_protein'],
      nutrition: {
        kcal: 420,
        protein: 35,
        carbs: 30,
        fat: 15,
      },
      basePrice: 6.5,
      active: true,
    },
  })

  const merluzaPlancha = await prisma.dish.create({
    data: {
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      name: 'Merluza a la plancha',
      course: 'SECOND',
      labels: ['gluten_free', 'low_fat', 'omega3'],
      nutrition: {
        kcal: 180,
        protein: 28,
        carbs: 0,
        fat: 7,
      },
      basePrice: 7.0,
      active: true,
    },
  })

  const yogur = await prisma.dish.create({
    data: {
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      name: 'Yogur natural',
      course: 'DESSERT',
      labels: ['vegetarian', 'probiotic'],
      nutrition: {
        kcal: 80,
        protein: 4,
        carbs: 12,
        fat: 2,
      },
      basePrice: 1.0,
      active: true,
    },
  })

  const fruta = await prisma.dish.create({
    data: {
      tenantId: cateringTenant.id,
      restaurantId: restaurant.id,
      name: 'Fruta de temporada',
      course: 'DESSERT',
      labels: ['vegan', 'gluten_free', 'seasonal'],
      nutrition: {
        kcal: 90,
        protein: 1,
        carbs: 22,
        fat: 0,
      },
      basePrice: 1.0,
      active: true,
    },
  })

  // Programar platos para la semana que viene
  const nextMonday = new Date()
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7) + 7)

  for (let i = 0; i < 4; i++) {
    const serviceDate = new Date(nextMonday)
    serviceDate.setDate(serviceDate.getDate() + i)

    // Primeros
    await prisma.dishSchedule.create({
      data: {
        tenantId: cateringTenant.id,
        dishId: gazpacho.id,
        date: serviceDate,
        stockLimit: 50,
        status: 'PUBLISHED',
      },
    })

    await prisma.dishSchedule.create({
      data: {
        tenantId: cateringTenant.id,
        dishId: ensaladaCesar.id,
        date: serviceDate,
        stockLimit: 50,
        status: 'PUBLISHED',
      },
    })

    // Segundos
    await prisma.dishSchedule.create({
      data: {
        tenantId: cateringTenant.id,
        dishId: polloHorno.id,
        date: serviceDate,
        stockLimit: 40,
        status: 'PUBLISHED',
      },
    })

    await prisma.dishSchedule.create({
      data: {
        tenantId: cateringTenant.id,
        dishId: merluzaPlancha.id,
        date: serviceDate,
        stockLimit: 30,
        status: 'PUBLISHED',
      },
    })

    // Postres
    await prisma.dishSchedule.create({
      data: {
        tenantId: cateringTenant.id,
        dishId: yogur.id,
        date: serviceDate,
        status: 'PUBLISHED',
      },
    })

    await prisma.dishSchedule.create({
      data: {
        tenantId: cateringTenant.id,
        dishId: fruta.id,
        date: serviceDate,
        status: 'PUBLISHED',
      },
    })
  }

  console.log('✅ Catering Delicias Express y menús creados')

  // ============================================================================
  // 4. LOG DE AUDITORÍA INICIAL
  // ============================================================================
  await prisma.auditLog.create({
    data: {
      tenantId: rootTenant.id,
      actorId: superAdminUser.id,
      action: 'CREATE',
      entity: 'system',
      entityId: 'initial_seed',
      diff: {
        action: 'initial_database_seed',
        timestamp: new Date().toISOString(),
      },
      hash: 'initial-seed-hash',
    },
  })

  console.log('✅ Log de auditoría creado')

  // ============================================================================
  // RESUMEN
  // ============================================================================
  console.log('\n📊 RESUMEN DEL SEED:')
  console.log('='.repeat(50))
  console.log('\n🏢 TENANTS:')
  console.log('  - Root (admin.comida.localhost)')
  console.log('  - ACME Corporation (acme.comida.localhost)')
  console.log('  - Delicias Express (deliciasexpress.comida.localhost)')
  
  console.log('\n👥 USUARIOS CREADOS:')
  console.log('  ROOT:')
  console.log('    📧 admin@sintupper.com / Admin123!')
  console.log('\n  ACME (Empresa):')
  console.log('    📧 rrhh@acme.com / Rrhh123!')
  console.log('    📧 finanzas@acme.com / Finanzas123!')
  console.log('    📧 laura.gomez@acme.com / Empleado123!')
  console.log('    📧 pedro.martinez@acme.com / Empleado123!')
  console.log('\n  DELICIAS EXPRESS (Catering):')
  console.log('    📧 chef@deliciasexpress.com / Chef123!')
  console.log('    📧 reparto@deliciasexpress.com / Reparto123!')
  
  console.log('\n🍽️ MENÚS:')
  console.log(`  - 6 platos creados (2 primeros, 2 segundos, 2 postres)`)
  console.log(`  - Programados para los próximos 4 días (L-J)`)
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ Seed completado exitosamente!')
  console.log('\n💡 Ahora puedes ejecutar: pnpm dev')
  console.log('   y acceder con cualquiera de los usuarios de arriba.\n')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

