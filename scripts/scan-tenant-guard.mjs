// Analizador estático (F5): encuentra TODA lectura de lista/agregado sobre un
// modelo multi-tenant que no lleve filtro de tenant ni acotación por `id`, es
// decir, las que dispararían el guard con TENANT_GUARD_ENFORCE=true.
// Uso: node scripts/scan-tenant-guard.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MODELS = new Set([
  'user','employee','company','companySite','companyPolicy','companyPolicyHistory',
  'companySettings','companyCateringAssignment','restaurant','restaurantDocument',
  'restaurantAudit','dish','dishSchedule','order','orderHistory','orderRating',
  'deliveryProof','invoice','invoiceLine','incident','notification','fiscalReport',
  'deliveryRoute','deliveryRouteSite','userInvitation','dishRating','penalty',
  'settlement','saasInvoice','menuTemplate','deliveryZone','gdprRequest',
  'dpaAgreement','activityMessage','holidayOverride',
])
const READS = new Set(['findMany','findFirst','findFirstOrThrow','count','aggregate','groupBy'])
// Detecta clave de tenant/id tanto con `:` como en forma abreviada `{ tenantId }`.
const TENANT_OR_ID =
  /\b(tenantId|tenantEmpresa|tenantCatering)\b|\bid\s*:|\btenant\s*:|\bcompany\s*:/

const ROOTS = ['lib', 'app', 'components']
const files = []
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    const s = statSync(p)
    if (s.isDirectory()) { if (!/node_modules|\.next/.test(p)) walk(p) }
    else if (/\.(ts|tsx)$/.test(p)) files.push(p)
  }
}
for (const r of ROOTS) walk(r)

// Extrae el texto (...) balanceado desde la posición de la apertura.
function balanced(src, openIdx) {
  let depth = 0
  for (let i = openIdx; i < src.length && i < openIdx + 4000; i++) {
    const c = src[i]
    if (c === '(') depth++
    else if (c === ')') { depth--; if (depth === 0) return src.slice(openIdx, i + 1) }
  }
  return src.slice(openIdx, openIdx + 400)
}

const re = /\b(prisma|tx)\.([a-zA-Z]+)\.(findMany|findFirst|findFirstOrThrow|count|aggregate|groupBy)\s*\(/g
const hits = []
for (const f of files) {
  // Los admin-*.ts y prisma-admin usan el cliente sin guard → no cuentan.
  if (/lib\/db\/queries\/admin-/.test(f) || /prisma-admin/.test(f)) continue
  const src = readFileSync(f, 'utf8')
  let m
  while ((m = re.exec(src))) {
    const model = m[2]
    if (!MODELS.has(model)) continue
    const openIdx = src.indexOf('(', m.index + m[0].length - 1)
    const argText = balanced(src, openIdx)
    if (!TENANT_OR_ID.test(argText)) {
      const line = src.slice(0, m.index).split('\n').length
      hits.push({ f, line, model, action: m[3], snippet: argText.replace(/\s+/g, ' ').slice(0, 90) })
    }
  }
}

hits.sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : a.line - b.line))
console.log(`\nCANDIDATOS A DISPARAR EL GUARD: ${hits.length}\n`)
for (const h of hits) console.log(`  ${h.f}:${h.line}  ${h.model}.${h.action}  ${h.snippet}`)
