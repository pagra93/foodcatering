/**
 * Seed del RBAC dinámico para PRODUCCIÓN — autocontenido e IDEMPOTENTE.
 *
 * Por qué existe: la migración `add_rbac_dynamic` crea las tablas roles/
 * permissions/role_permissions VACÍAS; los datos los siembra `prisma/seed-rbac.ts`
 * (TypeScript, necesita `tsx`, que NO está en el contenedor de prod). Este script
 * es JavaScript puro (solo `@prisma/client`, que sí está en prod) y siembra el
 * catálogo exacto capturado en `scripts/rbac-catalog.json`:
 *   1) upsert de los permisos del catálogo,
 *   2) upsert de los roles del sistema + sus permisos (reset exacto al catálogo),
 *   3) backfill de `User.roleId` desde `User.role` (match por baseRole).
 *
 * Se ejecuta DENTRO del contenedor de Coolify (donde ya está DATABASE_URL):
 *   ALLOW_PROD=1 node scripts/seed-rbac-prod.mjs
 *
 * En dev (BD comidas_dev):
 *   node --env-file=.env scripts/seed-rbac-prod.mjs
 *
 * Guarda anti-accidente: aborta si la BD tiene 'prod' en el nombre salvo que se
 * pase ALLOW_PROD=1. Idempotente: se puede relanzar sin peligro.
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

  const catalog = JSON.parse(
    readFileSync(new URL('./rbac-catalog.json', import.meta.url), 'utf8')
  )
  const { permissions, roles } = catalog
  console.log(
    `🌱 RBAC seed (prod) en '${dbName}' — ${permissions.length} permisos, ${roles.length} roles de sistema`
  )

  const prisma = new PrismaClient()
  try {
    // 1. Catálogo de permisos
    for (const p of permissions) {
      await prisma.permission.upsert({
        where: { key: p.key },
        create: { key: p.key, resource: p.resource, action: p.action, portal: p.portal, description: p.description },
        update: { resource: p.resource, action: p.action, portal: p.portal, description: p.description },
      })
    }
    const allPerms = await prisma.permission.findMany({ select: { id: true, key: true } })
    const permIdByKey = new Map(allPerms.map((p) => [p.key, p.id]))

    // 2. Roles del sistema + sus permisos (reset exacto al catálogo)
    for (const r of roles) {
      const role = await prisma.role.upsert({
        where: { key: r.key },
        create: {
          key: r.key,
          name: r.name,
          description: r.description,
          category: r.category,
          baseRole: r.baseRole,
          isSystem: true,
        },
        update: {
          name: r.name,
          description: r.description,
          category: r.category,
          baseRole: r.baseRole,
          isSystem: true,
        },
      })
      const data = r.permissionKeys
        .map((k) => permIdByKey.get(k))
        .filter(Boolean)
        .map((permissionId) => ({ roleId: role.id, permissionId }))
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
      await prisma.rolePermission.createMany({ data, skipDuplicates: true })
      console.log(`  · ${r.key}: ${data.length} permisos`)
    }

    // 3. Backfill User.roleId desde User.role (match por baseRole)
    const systemRoles = await prisma.role.findMany({
      where: { isSystem: true },
      select: { id: true, baseRole: true },
    })
    let backfilled = 0
    for (const sr of systemRoles) {
      if (!sr.baseRole) continue
      const res = await prisma.user.updateMany({
        where: { role: sr.baseRole, roleId: null },
        data: { roleId: sr.id },
      })
      backfilled += res.count
    }
    console.log(`  · backfill User.roleId: ${backfilled} usuarios`)
    console.log('✅ RBAC seed (prod) completado')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌ Error en RBAC seed (prod):', e)
  process.exit(1)
})
