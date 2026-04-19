/**
 * Queries para /admin/operations/*. Scope global SUPER_ADMIN.
 */

import { prisma } from '@/lib/db/prisma'

// ─── Impersonación ─────────────────────────────────────────────────────

export async function getImpersonationHistory(limit = 50) {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'IMPERSONATE',
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })

  const actorIds = [...new Set(logs.map((l) => l.actorId))]
  const targetIds = [
    ...new Set(
      logs.map((l) => l.entityId).filter((id): id is string => Boolean(id))
    ),
  ]
  const allIds = [...new Set([...actorIds, ...targetIds])]

  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, email: true, nameEnc: true, role: true, tenantId: true },
  })
  const userById = new Map(users.map((u) => [u.id, u]))

  const tenantIds = [...new Set(users.map((u) => u.tenantId))]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, type: true },
  })
  const tenantById = new Map(tenants.map((t) => [t.id, t]))

  return logs.map((l) => {
    const actor = userById.get(l.actorId)
    const target = userById.get(l.entityId)
    return {
      id: l.id,
      timestamp: l.timestamp,
      actor: actor
        ? {
            id: actor.id,
            email: actor.email,
            name: actor.nameEnc,
            role: actor.role,
          }
        : null,
      target: target
        ? {
            id: target.id,
            email: target.email,
            name: target.nameEnc,
            role: target.role,
            tenant: tenantById.get(target.tenantId) ?? null,
          }
        : null,
      ip: l.ip,
    }
  })
}

// ─── Backups ───────────────────────────────────────────────────────────

export async function getBackupEvents(limit = 50) {
  return prisma.backupEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getBackupKPIs() {
  const latest = await prisma.backupEvent.findFirst({
    orderBy: { createdAt: 'desc' },
  })
  const total = await prisma.backupEvent.count()
  const last7d = await prisma.backupEvent.count({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  })
  const hoursSinceLast = latest
    ? Math.round((Date.now() - latest.createdAt.getTime()) / (1000 * 60 * 60))
    : null

  return {
    total,
    last7d,
    latestAt: latest?.createdAt ?? null,
    hoursSinceLast,
    stale: hoursSinceLast !== null && hoursSinceLast > 25, // >25h sin backup = alerta
  }
}

// ─── Migraciones (consulta directa a _prisma_migrations) ───────────────

export type PrismaMigrationRow = {
  id: string
  checksum: string
  finished_at: Date | null
  migration_name: string
  logs: string | null
  rolled_back_at: Date | null
  started_at: Date
  applied_steps_count: number
}

export async function getPrismaMigrations(): Promise<PrismaMigrationRow[]> {
  // _prisma_migrations no está en el schema Prisma; query raw.
  const rows = await prisma.$queryRaw<PrismaMigrationRow[]>`
    SELECT id, checksum, finished_at, migration_name, logs,
           rolled_back_at, started_at, applied_steps_count
    FROM "_prisma_migrations"
    ORDER BY started_at DESC
  `
  return rows
}

// ─── Maintenance ───────────────────────────────────────────────────────

export async function getActiveMaintenanceWindow() {
  const now = new Date()
  return prisma.maintenanceWindow.findFirst({
    where: {
      startsAt: { lte: now },
      endsAt: { gte: now },
      disabledAt: null,
    },
  })
}

export async function getUpcomingMaintenanceWindows(limit = 20) {
  return prisma.maintenanceWindow.findMany({
    where: {
      OR: [
        // Activas o futuras
        { startsAt: { lte: new Date() }, endsAt: { gte: new Date() }, disabledAt: null },
        { startsAt: { gte: new Date() }, disabledAt: null },
      ],
    },
    orderBy: { startsAt: 'asc' },
    take: limit,
  })
}

export async function getMaintenanceHistory(limit = 30) {
  return prisma.maintenanceWindow.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ─── Health checks ─────────────────────────────────────────────────────

export async function runHealthChecks() {
  const start = Date.now()
  const results: {
    name: string
    status: 'OK' | 'WARN' | 'FAIL'
    detail: string
  }[] = []

  // 1. BD
  try {
    const t0 = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - t0
    results.push({
      name: 'Base de datos',
      status: latency > 500 ? 'WARN' : 'OK',
      detail: `SELECT 1 · ${latency}ms`,
    })
  } catch (err) {
    results.push({
      name: 'Base de datos',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : 'Error desconocido',
    })
  }

  // 2. Último backup
  const latestBackup = await prisma.backupEvent.findFirst({
    orderBy: { createdAt: 'desc' },
  })
  if (!latestBackup) {
    results.push({
      name: 'Backups',
      status: 'WARN',
      detail: 'Sin registro de backups — verifica cron',
    })
  } else {
    const hours = Math.round(
      (Date.now() - latestBackup.createdAt.getTime()) / (1000 * 60 * 60)
    )
    results.push({
      name: 'Backups',
      status: hours > 25 ? 'FAIL' : hours > 15 ? 'WARN' : 'OK',
      detail: `Último hace ${hours}h (${latestBackup.fileName})`,
    })
  }

  // 3. Memoria Node
  const mem = process.memoryUsage()
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024)
  results.push({
    name: 'Memoria Node',
    status: heapMB > 512 ? 'WARN' : 'OK',
    detail: `Heap ${heapMB} / ${heapTotalMB} MB`,
  })

  // 4. Uptime
  const uptimeSec = Math.round(process.uptime())
  const days = Math.floor(uptimeSec / 86400)
  const hours = Math.floor((uptimeSec % 86400) / 3600)
  const minutes = Math.floor((uptimeSec % 3600) / 60)
  results.push({
    name: 'Uptime proceso',
    status: 'OK',
    detail: `${days}d ${hours}h ${minutes}m`,
  })

  // 5. Mantenimiento activo
  const maintenance = await getActiveMaintenanceWindow()
  results.push({
    name: 'Mantenimiento',
    status: maintenance ? 'WARN' : 'OK',
    detail: maintenance
      ? `Activo hasta ${maintenance.endsAt.toISOString()}`
      : 'Sin ventanas activas',
  })

  const totalMs = Date.now() - start
  return { results, totalMs }
}
