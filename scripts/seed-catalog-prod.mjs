/**
 * Seed del CATÁLOGO de referencia para PRODUCCIÓN — autocontenido e IDEMPOTENTE.
 *
 * Datos de configuración (NO datos ficticios de demo): planes SaaS de sistema +
 * sus features, reglas fiscales (IVA), alérgenos, festivos de sistema, motivos de
 * incidencia de sistema, checklist OWASP y defaults de branding. Sin esto, esas
 * pantallas del admin salen vacías en prod (las migraciones crean las tablas
 * vacías; los seeds TS no corren en el contenedor porque no hay `tsx`).
 *
 * JavaScript puro (solo `@prisma/client`), lee `scripts/catalog-data.json`.
 * Se ejecuta dentro del contenedor de Coolify (o lo llama el entrypoint tras
 * `migrate deploy`):
 *   ALLOW_PROD=1 node scripts/seed-catalog-prod.mjs
 *
 * En dev:  node --env-file=.env scripts/seed-catalog-prod.mjs
 *
 * Idempotente (upsert por clave natural / create-si-no-existe). No toca datos de
 * tenants ni datos transaccionales. NO pisa SystemSettings si ya está configurado.
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  const dbName = url.split('/').pop()?.split('?')[0] ?? '(desconocida)'
  if (/prod/i.test(dbName) && process.env.ALLOW_PROD !== '1') {
    console.error(
      `❌ DATABASE_URL apunta a '${dbName}' (parece producción). Aborta.\n` +
        '   Ejecuta con ALLOW_PROD=1 si es intencional.'
    )
    process.exit(1)
  }

  const data = JSON.parse(
    readFileSync(new URL('./catalog-data.json', import.meta.url), 'utf8')
  )
  console.log(`🌱 Catálogo (prod) en '${dbName}'`)

  const prisma = new PrismaClient()
  try {
    // 1. Planes SaaS de sistema + features
    for (const p of data.saasPlans ?? []) {
      const fields = {
        name: p.name,
        description: p.description,
        planType: p.planType,
        scope: p.scope,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        maxEmployees: p.maxEmployees,
        maxSites: p.maxSites,
        maxCaterings: p.maxCaterings,
        maxOrdersMonth: p.maxOrdersMonth,
        pricingModel: p.pricingModel,
        commissionPct: p.commissionPct,
        flatMonthlyFee: p.flatMonthlyFee,
        maxCompanies: p.maxCompanies,
        supportLevel: p.supportLevel ?? undefined,
        active: p.active,
      }
      const plan = await prisma.saasPlan.upsert({
        where: { code: p.code },
        create: { code: p.code, ...fields },
        update: fields,
      })
      await prisma.planFeature.deleteMany({ where: { planId: plan.id } })
      if (p.featureKeys?.length) {
        await prisma.planFeature.createMany({
          data: p.featureKeys.map((featureKey) => ({ planId: plan.id, featureKey })),
          skipDuplicates: true,
        })
      }
    }
    console.log(`  · planes SaaS: ${data.saasPlans?.length ?? 0}`)

    // 2. Reglas fiscales (IVA)
    for (const t of data.taxRules ?? []) {
      const fields = {
        name: t.name,
        rate: t.rate,
        category: t.category,
        region: t.region,
        validFrom: new Date(t.validFrom),
        validTo: t.validTo ? new Date(t.validTo) : null,
        active: t.active,
      }
      await prisma.taxRule.upsert({
        where: { code: t.code },
        create: { code: t.code, ...fields },
        update: fields,
      })
    }
    console.log(`  · reglas fiscales: ${data.taxRules?.length ?? 0}`)

    // 3. Alérgenos
    for (const a of data.allergens ?? []) {
      const fields = { name: a.name, category: a.category, description: a.description, icon: a.icon, active: a.active }
      await prisma.allergen.upsert({
        where: { code: a.code },
        create: { code: a.code, ...fields },
        update: fields,
      })
    }
    console.log(`  · alérgenos: ${data.allergens?.length ?? 0}`)

    // 4. Festivos de sistema (create-si-no-existe; no hay clave única)
    let holidaysCreated = 0
    for (const h of data.holidays ?? []) {
      const date = new Date(h.date)
      const existing = await prisma.holiday.findFirst({
        where: { date, name: h.name, regionCode: h.regionCode ?? null, tenantId: null },
        select: { id: true },
      })
      if (!existing) {
        await prisma.holiday.create({
          data: { date, name: h.name, regionCode: h.regionCode ?? null, description: h.description ?? null },
        })
        holidaysCreated++
      }
    }
    console.log(`  · festivos: +${holidaysCreated} (de ${data.holidays?.length ?? 0})`)

    // 5. Motivos de incidencia de sistema
    for (const r of data.incidentReasons ?? []) {
      const fields = {
        name: r.name,
        description: r.description,
        defaultSeverity: r.defaultSeverity,
        category: r.category,
        requiresCompensation: r.requiresCompensation,
        scope: r.scope,
        active: r.active,
      }
      await prisma.incidentReason.upsert({
        where: { code: r.code },
        create: { code: r.code, ...fields },
        update: fields,
      })
    }
    console.log(`  · motivos de incidencia: ${data.incidentReasons?.length ?? 0}`)

    // 6. Checklist OWASP (create-si-la-categoría no tiene ítems)
    let owaspCreated = 0
    for (const s of data.securityChecks ?? []) {
      const existing = await prisma.securityCheck.findFirst({ where: { category: s.category }, select: { id: true } })
      if (!existing) {
        await prisma.securityCheck.create({
          data: { category: s.category, item: s.item, status: s.status ?? 'PENDING', evidence: s.evidence ?? null },
        })
        owaspCreated++
      }
    }
    console.log(`  · OWASP: +${owaspCreated} (de ${data.securityChecks?.length ?? 0})`)

    // 7. Defaults de branding (singleton) — solo crear si no existe, no pisar config
    if (data.systemSettings) {
      await prisma.systemSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data.systemSettings },
        update: {},
      })
      console.log('  · systemSettings: asegurado')
    }

    console.log('✅ Catálogo (prod) completado')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌ Error en catálogo (prod):', e)
  process.exit(1)
})
