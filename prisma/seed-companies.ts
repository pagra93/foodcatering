/**
 * SEED: Empresas con Datos Reales
 * 
 * Crea 5 empresas completas con:
 * - Tenant + Company + Policy + Sites + Employees
 * - Asignaciones a caterings (de seed-caterings.ts)
 * - Usuarios admin
 * - Pedidos de prueba
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { subDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🏢 Iniciando seed de empresas...\n')

  // ============================================================================
  // 0. Limpiar empresas de prueba existentes (opcional)
  // ============================================================================
  const existingCompanies = await prisma.tenant.findMany({
    where: { 
      type: 'EMPRESA',
      OR: [
        { subdomain: 'techcorp' },
        { subdomain: 'consultoria-digital' },
        { subdomain: 'innovaretail' },
        { subdomain: 'finanzasplus' },
        { subdomain: 'mediacreative' },
      ]
    }
  })

  if (existingCompanies.length > 0) {
    console.log(`⚠️  Encontradas ${existingCompanies.length} empresas de prueba existentes.`)
    console.log('   Eliminándolas para evitar duplicados...\n')
    
    for (const tenant of existingCompanies) {
      // Eliminar users, employees, sites, policies, companies y tenants en orden
      await prisma.employee.deleteMany({ where: { tenantId: tenant.id } })
      await prisma.user.deleteMany({ where: { tenantId: tenant.id } })
      await prisma.companySite.deleteMany({ where: { tenantId: tenant.id } })
      await prisma.companyPolicy.deleteMany({ where: { tenantId: tenant.id } })
      await prisma.companyCateringAssignment.deleteMany({ where: { tenantEmpresa: tenant.id } })
      await prisma.company.deleteMany({ where: { tenantId: tenant.id } })
      await prisma.tenant.delete({ where: { id: tenant.id } })
    }
    
    console.log('  ✅ Empresas de prueba eliminadas\n')
  }

  // ============================================================================
  // 1. Obtener caterings existentes para asignación
  // ============================================================================
  const caterings = await prisma.tenant.findMany({
    where: { type: 'CATERING' },
    include: { restaurants: true },
  })

  if (caterings.length === 0) {
    console.log('⚠️  No hay caterings disponibles. Ejecuta seed-caterings.ts primero.')
    return
  }

  console.log(`✅ Encontrados ${caterings.length} caterings para asignar\n`)

  // ============================================================================
  // 2. Datos de las 5 empresas
  // ============================================================================
  const companies = [
    {
      name: 'TechCorp Solutions',
      subdomain: 'techcorp',
      legalName: 'TechCorp Solutions S.L.',
      cif: 'B98765432',
      sector: 'Tecnología',
      plan: 'ENTERPRISE' as const,
      contactRrhhName: 'María García',
      contactRrhhEmail: 'rrhh@techcorp.com',
      contactRrhhPhone: '+34 911 222 333',
      contactFinanceName: 'Carlos Ruiz',
      contactFinanceEmail: 'finanzas@techcorp.com',
      contactFinancePhone: '+34 911 222 334',
      policy: {
        cutoffTime: '11:00',
        daysActive: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        limitPerDay: 11.00,
        copayCompany: 11.00,
        copayEmployee: 0,
        noShowRule: 'CHARGE' as const,
      },
      sites: [
        {
          name: 'Oficina Central - Madrid',
          address: 'Calle Serrano, 123',
          city: 'Madrid',
          postalCode: '28006',
          deliveryWindow: '13:00-14:30',
          employees: 45,
        },
        {
          name: 'Centro de Desarrollo - Pozuelo',
          address: 'Avenida Europa, 10',
          city: 'Pozuelo de Alarcón',
          postalCode: '28224',
          deliveryWindow: '13:30-15:00',
          employees: 25,
        },
      ],
    },
    {
      name: 'Consultoría Digital Pro',
      subdomain: 'consultoria-digital',
      legalName: 'Consultoría Digital Pro S.A.',
      cif: 'A19876543',
      sector: 'Consultoría',
      plan: 'GROWTH' as const,
      contactRrhhName: 'Ana López',
      contactRrhhEmail: 'ana.lopez@consultoria.com',
      contactRrhhPhone: '+34 912 345 678',
      contactFinanceName: 'Pedro Sánchez',
      contactFinanceEmail: 'pedro.sanchez@consultoria.com',
      contactFinancePhone: '+34 912 345 679',
      policy: {
        cutoffTime: '10:30',
        daysActive: ['monday', 'tuesday', 'wednesday', 'thursday'],
        limitPerDay: 10.50,
        copayCompany: 8.00,
        copayEmployee: 2.50,
        noShowRule: 'NO_CHARGE' as const,
      },
      sites: [
        {
          name: 'Sede Principal',
          address: 'Gran Vía, 45',
          city: 'Madrid',
          postalCode: '28013',
          deliveryWindow: '13:00-14:00',
          employees: 32,
        },
      ],
    },
    {
      name: 'InnovaRetail',
      subdomain: 'innovaretail',
      legalName: 'InnovaRetail España S.L.',
      cif: 'B23456789',
      sector: 'Retail',
      plan: 'STARTER' as const,
      contactRrhhName: 'Laura Martín',
      contactRrhhEmail: 'lmartin@innovaretail.es',
      contactRrhhPhone: '+34 913 456 789',
      contactFinanceName: 'Jorge Fernández',
      contactFinanceEmail: 'jfernandez@innovaretail.es',
      contactFinancePhone: '+34 913 456 790',
      policy: {
        cutoffTime: '11:00',
        daysActive: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        limitPerDay: 9.00,
        copayCompany: 9.00,
        copayEmployee: 0,
        noShowRule: 'PARTIAL' as const,
      },
      sites: [
        {
          name: 'Tienda Central',
          address: 'Calle Goya, 78',
          city: 'Madrid',
          postalCode: '28001',
          deliveryWindow: '12:30-14:00',
          employees: 18,
        },
      ],
    },
    {
      name: 'FinanzasPlus',
      subdomain: 'finanzasplus',
      legalName: 'FinanzasPlus Asesoría S.L.',
      cif: 'B34567890',
      sector: 'Servicios Financieros',
      plan: 'GROWTH' as const,
      contactRrhhName: 'Isabel Torres',
      contactRrhhEmail: 'itorres@finanzasplus.com',
      contactRrhhPhone: '+34 914 567 890',
      contactFinanceName: 'Roberto Díaz',
      contactFinanceEmail: 'rdiaz@finanzasplus.com',
      contactFinancePhone: '+34 914 567 891',
      policy: {
        cutoffTime: '10:00',
        daysActive: ['monday', 'tuesday', 'wednesday', 'thursday'],
        limitPerDay: 11.00,
        copayCompany: 11.00,
        copayEmployee: 0,
        noShowRule: 'NO_CHARGE' as const,
      },
      sites: [
        {
          name: 'Oficina Madrid Centro',
          address: 'Paseo de la Castellana, 200',
          city: 'Madrid',
          postalCode: '28046',
          deliveryWindow: '13:00-14:30',
          employees: 28,
        },
      ],
    },
    {
      name: 'MediaCreative Studio',
      subdomain: 'mediacreative',
      legalName: 'MediaCreative Studio S.L.',
      cif: 'B45678901',
      sector: 'Marketing y Publicidad',
      plan: 'ENTERPRISE' as const,
      contactRrhhName: 'Sofía Romero',
      contactRrhhEmail: 'sromero@mediacreative.es',
      contactRrhhPhone: '+34 915 678 901',
      contactFinanceName: 'Miguel Ángel Castro',
      contactFinanceEmail: 'mcastro@mediacreative.es',
      contactFinancePhone: '+34 915 678 902',
      policy: {
        cutoffTime: '11:30',
        daysActive: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        limitPerDay: 11.00,
        copayCompany: 7.00,
        copayEmployee: 4.00,
        noShowRule: 'CHARGE' as const,
      },
      sites: [
        {
          name: 'Estudio Principal',
          address: 'Calle Velázquez, 88',
          city: 'Madrid',
          postalCode: '28006',
          deliveryWindow: '13:30-15:00',
          employees: 35,
        },
        {
          name: 'Coworking Centro',
          address: 'Plaza de España, 1',
          city: 'Madrid',
          postalCode: '28008',
          deliveryWindow: '13:00-14:30',
          employees: 15,
        },
      ],
    },
  ]

  // ============================================================================
  // 3. Crear empresas
  // ============================================================================
  const adminPassword = await bcrypt.hash('admin123', 10)

  for (let i = 0; i < companies.length; i++) {
    const companyData = companies[i]
    if (!companyData) continue
    console.log(`\n🏢 Creando empresa ${i + 1}/5: ${companyData.name}...`)

    // 3.1 Crear Tenant
    const tenant = await prisma.tenant.create({
      data: {
        type: 'EMPRESA',
        name: companyData.name,
        subdomain: companyData.subdomain,
        status: 'ACTIVE',
        contactEmail: companyData.contactRrhhEmail,
        contactPhone: companyData.contactRrhhPhone,
        primaryColor: '#2563eb',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        language: 'es',
      },
    })

    console.log(`  ✅ Tenant creado: ${tenant.id}`)

    // 3.2 Crear Company
    const company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        legalName: companyData.legalName,
        cif: companyData.cif,
        billingAddress: companyData.sites[0]?.address ?? '',
        plan: companyData.plan,
        sector: companyData.sector,
        contactRrhhName: companyData.contactRrhhName,
        contactRrhhEmail: companyData.contactRrhhEmail,
        contactRrhhPhone: companyData.contactRrhhPhone,
        contactFinanceName: companyData.contactFinanceName,
        contactFinanceEmail: companyData.contactFinanceEmail,
        contactFinancePhone: companyData.contactFinancePhone,
        employeeCount: companyData.sites.reduce((sum, s) => sum + s.employees, 0),
        contractSignedAt: subDays(new Date(), 90),
        monthlySpend: 0,
        deductibilityRate: 100.00,
        adoptionRate: 0,
      },
    })

    console.log(`  ✅ Company creado: ${company.id}`)

    // 3.3 Crear Policy
    await prisma.companyPolicy.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        cutoffTime: companyData.policy.cutoffTime,
        daysActive: companyData.policy.daysActive,
        limitPerDay: companyData.policy.limitPerDay,
        copayCompany: companyData.policy.copayCompany,
        copayEmployee: companyData.policy.copayEmployee,
        noShowRule: companyData.policy.noShowRule,
        effectiveFrom: subDays(new Date(), 90),
      },
    })

    console.log(`  ✅ Policy creado`)

    // 3.4 Crear Sites y Empleados
    let globalEmployeeCounter = 0 // Contador global para evitar duplicados de email
    
    for (const siteData of companyData.sites) {
      const site = await prisma.companySite.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          name: siteData.name,
          address: siteData.address,
          city: siteData.city,
          postalCode: siteData.postalCode,
          deliveryWindow: siteData.deliveryWindow,
          active: true,
        },
      })

      console.log(`    ✅ Site creado: ${site.name} (${siteData.employees} empleados)`)

      // Crear empleados para esta sede (idempotente: upsert por tenantId+email)
      for (let j = 0; j < siteData.employees; j++) {
        globalEmployeeCounter++
        const employeeEmail = `empleado${globalEmployeeCounter}@${companyData.subdomain}.com`
        const employeeName = `Empleado ${globalEmployeeCounter} ${companyData.name}`

        const user = await prisma.user.upsert({
          where: { tenantId_email: { tenantId: tenant.id, email: employeeEmail } },
          update: {},
          create: {
            tenantId: tenant.id,
            email: employeeEmail,
            nameEnc: employeeName,
            passwordHash: adminPassword,
            role: 'EMPLEADO',
            status: 'ACTIVE',
            mfaEnabled: false,
          },
        })

        const existingEmployee = await prisma.employee.findFirst({
          where: { userId: user.id },
        })
        if (!existingEmployee) {
          await prisma.employee.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              siteId: site.id,
              employeeNumber: `EMP${i + 1}${globalEmployeeCounter}`.padStart(8, '0'),
              department: ['Tecnología', 'RRHH', 'Finanzas', 'Marketing', 'Operaciones'][j % 5],
              position: ['Developer', 'Analista', 'Manager', 'Consultor', 'Especialista'][j % 5],
              startDate: subDays(new Date(), Math.floor(Math.random() * 365)),
              weeklyMenuDays: companyData.policy.daysActive.length,
              status: 'ACTIVE',
            },
          })
        }
      }
    }

    // 3.5 Crear usuario admin de empresa (idempotente)
    await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: `admin@${companyData.subdomain}.com` },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: `admin@${companyData.subdomain}.com`,
        nameEnc: companyData.contactRrhhName,
        passwordHash: adminPassword,
        role: 'ADMIN_EMPRESA',
        status: 'ACTIVE',
        mfaEnabled: true,
      },
    })

    console.log(`  ✅ Usuario admin creado`)

    // 3.6 Asignar catering (rotar entre caterings disponibles)
    const assignedCatering = caterings[i % caterings.length]
    const firstSite = companyData.sites[0]
    if (!assignedCatering || !firstSite) {
      console.log('  ⚠️  No hay catering o sede para asignar; saltando')
      continue
    }

    await prisma.companyCateringAssignment.upsert({
      where: {
        companyId_tenantCatering: {
          companyId: company.id,
          tenantCatering: assignedCatering.id,
        },
      },
      update: {},
      create: {
        tenantEmpresa: tenant.id,
        tenantCatering: assignedCatering.id,
        companyId: company.id,
        type: 'PRIMARY',
        zones: [{ name: 'Centro Madrid', postalCodes: [firstSite.postalCode] }],
        priority: 1,
        slaPunctuality: 95.0,
        slaIncidentRate: 3.0,
        active: true,
        assignedBy: tenant.id, // Temporal, debería ser un user ID
        assignedAt: subDays(new Date(), 90),
      },
    })

    console.log(`  ✅ Catering asignado: ${assignedCatering.name}`)
  }

  console.log('\n✅ Seed de empresas completado!\n')
  console.log('📊 Resumen:')
  console.log(`   - ${companies.length} empresas creadas`)
  console.log(`   - ${companies.reduce((sum, c) => sum + c.sites.length, 0)} sedes creadas`)
  console.log(
    `   - ${companies.reduce((sum, c) => sum + c.sites.reduce((s, site) => s + site.employees, 0), 0)} empleados creados`
  )
  console.log(`   - ${companies.length} caterings asignados`)
  console.log('\n🔐 Credenciales:')
  console.log('   Email: admin@{subdomain}.com')
  console.log('   Password: admin123')
  console.log('\n   (También cada empleado con empleadoN@{subdomain}.com / admin123)')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

