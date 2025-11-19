/**
 * Seed de Caterings de Prueba
 * Crea 5 caterings realistas con toda su información
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper para crear usuarios sin errores de duplicados
async function createUserIfNotExists(data: {
  email: string
  passwordHash: string
  role: string
  status: string
  mfaEnabled: boolean
  tenantId: string
  nameEnc: string
  phoneEnc: string
}) {
  const existing = await prisma.user.findFirst({
    where: { tenantId: data.tenantId, email: data.email },
  })

  if (!existing) {
    await prisma.user.create({ data: data as any })
  }
}

async function main() {
  console.log('🌱 Seeding Caterings de Prueba...\n')

  // Hash de password para usuarios (todos usan "password123")
  const passwordHash = await bcrypt.hash('password123', 10)

  // ==========================================
  // CATERING 1: Catering Delicious
  // ==========================================
  console.log('1️⃣  Creando Catering Delicious...')
  const catering1 = await prisma.tenant.upsert({
    where: { subdomain: 'catering-delicious' },
    update: {},
    create: {
      name: 'Catering Delicious',
      subdomain: 'catering-delicious',
      type: 'CATERING',
      status: 'ACTIVE',
      contactEmail: 'info@delicious.com',
      contactPhone: '+34 912 345 678',
      address: 'Calle Gran Vía 45',
      city: 'Madrid',
      postalCode: '28013',
      country: 'España',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'es',
      primaryColor: '#10B981',
      logoUrl: null,
    },
  })

  await prisma.restaurant.upsert({
    where: { tenantId: catering1.id },
    update: {},
    create: {
      tenantId: catering1.id,
      displayName: 'Catering Delicious',
      legalName: 'Delicious Gastronómico S.L.',
      cif: 'B12345678',
      billingAddress: 'Calle Gran Vía 45, 28013 Madrid',
      iban: 'ES9121000418450200051332',
      contactPerson: 'María García',
      contactEmail: 'maria@delicious.com',
      contactPhone: '+34 912 345 678',
      dailyCapacity: 200,
      preparationWindow: '08:00-11:00',
      deliveryWindow: '12:00-14:00',
      cutoffTime: '11:00',
      leadTimeMinutes: 180,
      operationalDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      zones: [
        { name: 'Centro', postalCodes: ['28001', '28013', '28014'], maxDistance: 5, operator: 'Stuart' },
        { name: 'Norte', postalCodes: ['28020', '28050'], maxDistance: 8, operator: 'Glovo' },
      ],
      commission: 0.05,
      minimumBilling: 500.0,
      paymentCycle: 'MONTHLY',
      punctualityRate: 96.0,
      incidentRate: 1.5,
      averageRating: 4.7,
      documentsStatus: 'OK',
      operationalStatus: 'ACTIVE',
    },
  })

  // Usuario admin del catering
  await createUserIfNotExists({
    email: 'admin@delicious.com',
    passwordHash,
    role: 'ADMIN_CATERING',
    status: 'ACTIVE',
    mfaEnabled: false,
    tenantId: catering1.id,
    nameEnc: 'Admin Delicious',
    phoneEnc: '+34 912 345 678',
  })

  console.log('   ✅ Catering Delicious creado\n')

  // ==========================================
  // CATERING 2: Sabores de la Ciudad
  // ==========================================
  console.log('2️⃣  Creando Sabores de la Ciudad...')
  const catering2 = await prisma.tenant.upsert({
    where: { subdomain: 'sabores-ciudad' },
    update: {},
    create: {
      name: 'Sabores de la Ciudad',
      subdomain: 'sabores-ciudad',
      type: 'CATERING',
      status: 'ACTIVE',
      contactEmail: 'info@saboresciudad.com',
      contactPhone: '+34 915 678 901',
      address: 'Paseo de la Castellana 100',
      city: 'Madrid',
      postalCode: '28046',
      country: 'España',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'es',
      primaryColor: '#F59E0B',
      logoUrl: null,
    },
  })

  await prisma.restaurant.upsert({
    where: { tenantId: catering2.id },
    update: {},
    create: {
      tenantId: catering2.id,
      displayName: 'Sabores de la Ciudad',
      legalName: 'Sabores Urbanos S.A.',
      cif: 'A87654321',
      billingAddress: 'Paseo de la Castellana 100, 28046 Madrid',
      iban: 'ES7620770024003102575766',
      contactPerson: 'Carlos Rodríguez',
      contactEmail: 'carlos@saboresciudad.com',
      contactPhone: '+34 915 678 901',
      dailyCapacity: 350,
      preparationWindow: '08:30-11:00',
      deliveryWindow: '12:00-13:30',
      cutoffTime: '10:30',
      leadTimeMinutes: 150,
      operationalDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      zones: [
        { name: 'Sur', postalCodes: ['28025', '28026'], maxDistance: 10, operator: 'Paack' },
        { name: 'Este', postalCodes: ['28028', '28029'], maxDistance: 7, operator: 'Stuart' },
        { name: 'Oeste', postalCodes: ['28034', '28035'], maxDistance: 6, operator: 'Glovo' },
      ],
      commission: 0.06,
      minimumBilling: 800.0,
      paymentCycle: 'BIWEEKLY',
      punctualityRate: 92.0,
      incidentRate: 3.2,
      averageRating: 4.5,
      documentsStatus: 'WARNING',
      operationalStatus: 'ACTIVE',
    },
  })

  await createUserIfNotExists({
    email: 'admin@saboresciudad.com',
    passwordHash,
    role: 'ADMIN_CATERING',
    status: 'ACTIVE',
    mfaEnabled: true,
    tenantId: catering2.id,
    nameEnc: 'Admin Sabores',
    phoneEnc: '+34 915 678 901',
  })

  console.log('   ✅ Sabores de la Ciudad creado\n')

  // ==========================================
  // CATERING 3: Cocina Rápida Express (SUSPENDIDO)
  // ==========================================
  console.log('3️⃣  Creando Cocina Rápida Express...')
  const catering3 = await prisma.tenant.upsert({
    where: { subdomain: 'cocina-rapida' },
    update: {},
    create: {
      name: 'Cocina Rápida Express',
      subdomain: 'cocina-rapida',
      type: 'CATERING',
      status: 'SUSPENDED',
      contactEmail: 'info@cocinarapida.com',
      contactPhone: '+34 913 456 789',
      address: 'Calle Alcalá 200',
      city: 'Madrid',
      postalCode: '28028',
      country: 'España',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'es',
      primaryColor: '#EF4444',
      logoUrl: null,
    },
  })

  await prisma.restaurant.upsert({
    where: { tenantId: catering3.id },
    update: {},
    create: {
      tenantId: catering3.id,
      displayName: 'Cocina Rápida Express',
      legalName: 'Fast Food Express S.L.',
      cif: 'B98765432',
      billingAddress: 'Calle Alcalá 200, 28028 Madrid',
      iban: 'ES1234567890123456789012',
      contactPerson: 'Ana López',
      contactEmail: 'ana@cocinarapida.com',
      contactPhone: '+34 913 456 789',
      dailyCapacity: 150,
      preparationWindow: '09:00-11:00',
      deliveryWindow: '13:00-14:00',
      cutoffTime: '11:00',
      leadTimeMinutes: 120,
      operationalDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      zones: [
        { name: 'Centro', postalCodes: ['28001', '28013'], maxDistance: 3, operator: 'Stuart' },
      ],
      commission: 0.055,
      minimumBilling: 400.0,
      paymentCycle: 'MONTHLY',
      punctualityRate: 85.0,
      incidentRate: 7.8,
      averageRating: 3.9,
      documentsStatus: 'BLOCKED',
      operationalStatus: 'SUSPENDED',
      suspendedAt: new Date(),
      suspendedReason: 'Documentación sanitaria caducada y múltiples incidencias de calidad',
    },
  })

  await createUserIfNotExists({
    email: 'admin@cocinarapida.com',
    passwordHash,
    role: 'ADMIN_CATERING',
    status: 'DISABLED',
    mfaEnabled: false,
    tenantId: catering3.id,
    nameEnc: 'Admin Cocina Rápida',
    phoneEnc: '+34 913 456 789',
  })

  console.log('   ✅ Cocina Rápida Express creado (SUSPENDIDO)\n')

  // ==========================================
  // CATERING 4: Gourmet Professional
  // ==========================================
  console.log('4️⃣  Creando Gourmet Professional...')
  const catering4 = await prisma.tenant.upsert({
    where: { subdomain: 'gourmet-pro' },
    update: {},
    create: {
      name: 'Gourmet Professional',
      subdomain: 'gourmet-pro',
      type: 'CATERING',
      status: 'ACTIVE',
      contactEmail: 'info@gourmetpro.com',
      contactPhone: '+34 917 890 123',
      address: 'Calle Serrano 75',
      city: 'Madrid',
      postalCode: '28006',
      country: 'España',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'es',
      primaryColor: '#8B5CF6',
      logoUrl: null,
    },
  })

  await prisma.restaurant.upsert({
    where: { tenantId: catering4.id },
    update: {},
    create: {
      tenantId: catering4.id,
      displayName: 'Gourmet Professional',
      legalName: 'Gourmet Catering Premium S.L.',
      cif: 'B11223344',
      billingAddress: 'Calle Serrano 75, 28006 Madrid',
      iban: 'ES9876543210987654321098',
      contactPerson: 'Fernando Martínez',
      contactEmail: 'fernando@gourmetpro.com',
      contactPhone: '+34 917 890 123',
      dailyCapacity: 300,
      preparationWindow: '07:30-11:30',
      deliveryWindow: '12:30-14:30',
      cutoffTime: '11:30',
      leadTimeMinutes: 210,
      operationalDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      zones: [
        { name: 'Centro', postalCodes: ['28001', '28006', '28010'], maxDistance: 5, operator: 'Stuart' },
        { name: 'Norte', postalCodes: ['28016', '28050'], maxDistance: 10, operator: 'Paack' },
      ],
      commission: 0.07,
      minimumBilling: 1000.0,
      paymentCycle: 'MONTHLY',
      punctualityRate: 98.0,
      incidentRate: 0.8,
      averageRating: 4.9,
      documentsStatus: 'OK',
      operationalStatus: 'ACTIVE',
    },
  })

  await createUserIfNotExists({
    email: 'admin@gourmetpro.com',
    passwordHash,
    role: 'ADMIN_CATERING',
    status: 'ACTIVE',
    mfaEnabled: true,
    tenantId: catering4.id,
    nameEnc: 'Admin Gourmet',
    phoneEnc: '+34 917 890 123',
  })

  console.log('   ✅ Gourmet Professional creado\n')

  // ==========================================
  // CATERING 5: Vegetalia Organic (EN REVISIÓN)
  // ==========================================
  console.log('5️⃣  Creando Vegetalia Organic...')
  const catering5 = await prisma.tenant.upsert({
    where: { subdomain: 'vegetalia' },
    update: {},
    create: {
      name: 'Vegetalia Organic',
      subdomain: 'vegetalia',
      type: 'CATERING',
      status: 'ACTIVE',
      contactEmail: 'info@vegetalia.com',
      contactPhone: '+34 914 567 890',
      address: 'Calle Fuencarral 120',
      city: 'Madrid',
      postalCode: '28010',
      country: 'España',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'es',
      primaryColor: '#22C55E',
      logoUrl: null,
    },
  })

  await prisma.restaurant.upsert({
    where: { tenantId: catering5.id },
    update: {},
    create: {
      tenantId: catering5.id,
      displayName: 'Vegetalia Organic',
      legalName: 'Vegetalia Bio Foods S.L.',
      cif: 'B55667788',
      billingAddress: 'Calle Fuencarral 120, 28010 Madrid',
      iban: 'ES5544332211009988776655',
      contactPerson: 'Laura Sánchez',
      contactEmail: 'laura@vegetalia.com',
      contactPhone: '+34 914 567 890',
      dailyCapacity: 100,
      preparationWindow: '07:00-11:00',
      deliveryWindow: '12:00-14:00',
      cutoffTime: '10:00',
      leadTimeMinutes: 240,
      operationalDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      zones: [
        { name: 'Norte', postalCodes: ['28010', '28050'], maxDistance: 8, operator: 'Stuart' },
      ],
      commission: 0.06,
      minimumBilling: 300.0,
      paymentCycle: 'MONTHLY',
      punctualityRate: null,
      incidentRate: null,
      averageRating: null,
      documentsStatus: 'WARNING',
      operationalStatus: 'UNDER_REVIEW',
    },
  })

  await createUserIfNotExists({
    email: 'admin@vegetalia.com',
    passwordHash,
    role: 'ADMIN_CATERING',
    status: 'ACTIVE',
    mfaEnabled: false,
    tenantId: catering5.id,
    nameEnc: 'Admin Vegetalia',
    phoneEnc: '+34 914 567 890',
  })

  console.log('   ✅ Vegetalia Organic creado (EN REVISIÓN)\n')

  // ==========================================
  // Resumen
  // ==========================================
  const totalCaterings = await prisma.tenant.count({
    where: { type: 'CATERING' },
  })

  console.log('\n✅ Seed completado!')
  console.log(`📊 Total de caterings en BD: ${totalCaterings}`)
  console.log('\n📋 Credenciales de acceso (todas usan password: "password123"):')
  console.log('   • admin@delicious.com')
  console.log('   • admin@saboresciudad.com')
  console.log('   • admin@cocinarapida.com')
  console.log('   • admin@gourmetpro.com')
  console.log('   • admin@vegetalia.com\n')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

