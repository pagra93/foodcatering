/**
 * Script para verificar y crear la relación Company ↔ Catering
 * Uso: npx tsx scripts/verify-and-fix-catering-assignment.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Verificando relación ACME ↔ Delicias Express...\n')

  try {
    // 1. Buscar empresa ACME
    const acmeCompany = await prisma.company.findFirst({
      where: {
        legalName: {
          contains: 'ACME',
          mode: 'insensitive',
        },
      },
      include: {
        tenant: true,
      },
    })

    if (!acmeCompany) {
      console.error('❌ No se encontró la empresa ACME')
      console.log('💡 Ejecuta el seed: npm run db:seed')
      return
    }

    console.log('✅ Empresa ACME encontrada:')
    console.log(`   - ID: ${acmeCompany.id}`)
    console.log(`   - Nombre: ${acmeCompany.legalName}`)
    console.log(`   - Tenant ID: ${acmeCompany.tenantId}`)
    console.log(`   - Tenant Name: ${acmeCompany.tenant.name}\n`)

    // 2. Buscar catering Delicias Express
    const deliciasRestaurant = await prisma.restaurant.findFirst({
      where: {
        legalName: {
          contains: 'Delicias',
          mode: 'insensitive',
        },
      },
      include: {
        tenant: true,
      },
    })

    if (!deliciasRestaurant) {
      console.error('❌ No se encontró el catering Delicias Express')
      console.log('💡 Ejecuta el seed: npm run db:seed')
      return
    }

    console.log('✅ Catering Delicias Express encontrado:')
    console.log(`   - ID: ${deliciasRestaurant.id}`)
    console.log(`   - Nombre: ${deliciasRestaurant.legalName}`)
    console.log(`   - Tenant ID: ${deliciasRestaurant.tenantId}`)
    console.log(`   - Tenant Name: ${deliciasRestaurant.tenant.name}\n`)

    // 3. Verificar si existe la relación
    const existingAssignment = await prisma.companyCateringAssignment.findFirst({
      where: {
        companyId: acmeCompany.id,
        tenantCatering: deliciasRestaurant.tenantId,
      },
    })

    if (existingAssignment) {
      console.log('✅ RELACIÓN YA EXISTE:')
      console.log(`   - ID: ${existingAssignment.id}`)
      console.log(`   - Tipo: ${existingAssignment.type}`)
      console.log(`   - Activa: ${existingAssignment.active}`)
      console.log(`   - Prioridad: ${existingAssignment.priority}\n`)
      
      if (!existingAssignment.active) {
        console.log('⚠️  La relación existe pero está INACTIVA')
        console.log('   Activando...')
        
        await prisma.companyCateringAssignment.update({
          where: { id: existingAssignment.id },
          data: { active: true },
        })
        
        console.log('✅ Relación activada correctamente\n')
      }
      
      console.log('✅ TODO CORRECTO - La empresa ACME tiene catering asignado')
      return
    }

    // 4. Si no existe, crearla
    console.log('⚠️  NO EXISTE LA RELACIÓN - Creando...\n')

    const newAssignment = await prisma.companyCateringAssignment.create({
      data: {
        tenantEmpresa: acmeCompany.tenantId,
        tenantCatering: deliciasRestaurant.tenantId,
        companyId: acmeCompany.id,
        type: 'PRIMARY',
        zones: [{ name: 'Centro Madrid', postalCodes: ['28013', '28001'] }],
        priority: 1,
        slaPunctuality: 95.0,
        slaIncidentRate: 5.0,
        active: true,
        assignedAt: new Date(),
        assignedBy: 'system',
      },
    })

    console.log('✅ RELACIÓN CREADA EXITOSAMENTE:')
    console.log(`   - ID: ${newAssignment.id}`)
    console.log(`   - Empresa: ${acmeCompany.legalName}`)
    console.log(`   - Catering: ${deliciasRestaurant.legalName}`)
    console.log(`   - Tipo: ${newAssignment.type}`)
    console.log(`   - Activa: ${newAssignment.active}\n`)

    console.log('✅ TODO RESUELTO - Ahora los empleados de ACME pueden ver menús')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

