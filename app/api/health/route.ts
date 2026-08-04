import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * Health check público y ligero: BD accesible + sin migraciones a medias.
 * Lo consumen el HEALTHCHECK del contenedor, Coolify y el monitor de uptime
 * externo. No requiere sesión y no expone datos de negocio (solo el SHA del
 * build, que ya es público en el repo).
 */
export const dynamic = 'force-dynamic'

const startedAt = new Date()

export async function GET() {
  const meta = {
    sha: process.env['BUILD_SHA'] ?? 'unknown',
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  }

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    return NextResponse.json({ ok: false, db: false, ...meta }, { status: 503 })
  }

  // Migración empezada y no terminada = deploy roto (el entrypoint arrancó con
  // schema desactualizado) → 503 para que el healthcheck/Coolify lo marque.
  // Si la tabla no existe (entornos con `db push`, CI) se ignora: la BD ya
  // respondió al SELECT 1 de arriba.
  let unfinishedMigrations = 0
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `
    unfinishedMigrations = rows[0]?.count ?? 0
  } catch {
    // Sin historial de migraciones en esta BD: no se puede evaluar.
  }

  if (unfinishedMigrations > 0) {
    return NextResponse.json(
      { ok: false, db: true, unfinishedMigrations, ...meta },
      { status: 503 }
    )
  }

  return NextResponse.json({ ok: true, db: true, ...meta })
}
