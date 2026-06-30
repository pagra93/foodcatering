/**
 * Seed del RBAC dinámico (idempotente).
 * - Inserta el catálogo de permisos (lib/auth/permission-catalog.ts).
 * - Crea/actualiza los 12 roles del sistema y sus permisos.
 * - Backfill de User.roleId desde User.role (match por baseRole).
 *
 * Ejecutar: pnpm tsx prisma/seed-rbac.ts
 */

import { PrismaClient } from '@prisma/client'
import type { RoleCategory, UserRole } from '@prisma/client'
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  resolveRolePermissionKeys,
} from '../lib/auth/permission-catalog'

const prisma = new PrismaClient()

async function main() {
  console.log(`🌱 RBAC seed — ${PERMISSION_CATALOG.length} permisos, ${SYSTEM_ROLES.length} roles del sistema`)

  // 1. Catálogo de permisos
  for (const p of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, resource: p.resource, action: p.action, portal: p.portal, description: p.description },
      update: { resource: p.resource, action: p.action, portal: p.portal, description: p.description },
    })
  }

  const allPerms = await prisma.permission.findMany({ select: { id: true, key: true } })
  const permIdByKey = new Map(allPerms.map((p) => [p.key, p.id]))

  // 2. Roles del sistema + sus permisos
  for (const r of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      create: {
        key: r.key,
        name: r.name,
        description: r.description,
        category: r.category as RoleCategory,
        baseRole: r.baseRole as UserRole,
        isSystem: true,
      },
      update: {
        name: r.name,
        description: r.description,
        category: r.category as RoleCategory,
        baseRole: r.baseRole as UserRole,
        isSystem: true,
      },
    })

    const keys = resolveRolePermissionKeys(r.permissions)
    const data = keys
      .map((k) => permIdByKey.get(k))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({ roleId: role.id, permissionId }))

    // Reset para que el rol del sistema refleje exactamente el catálogo.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.rolePermission.createMany({ data, skipDuplicates: true })
    console.log(`  · ${r.key}: ${data.length} permisos`)
  }

  // 3. Backfill User.roleId desde User.role
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
  console.log('✅ RBAC seed completado')
}

main()
  .catch((e) => {
    console.error('❌ Error en RBAC seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
