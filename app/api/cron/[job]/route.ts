import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { apiError } from '@/lib/api/respond'
import { runJob, type JobSummary } from '@/lib/jobs/run'
import { lockOrdersJob } from '@/lib/jobs/lock-orders'
import { retentionJob } from '@/lib/jobs/retention'
import { generateMonthBilling } from '@/lib/billing/generate-month'
import { captureMrrSnapshot } from '@/lib/business-plan/snapshot'
import { serviceDayFromDate } from '@/lib/orders/cutoff'

/**
 * POST /api/cron/<job> — punto de entrada de los jobs programados.
 *
 * Los invoca el cron del HOST (mismo patrón que el cron de backups; crontab de
 * ejemplo en RUNBOOK §17) con `Authorization: Bearer $CRON_SECRET`. Cada
 * ejecución queda registrada en `job_runs` (exclusión mutua incluida).
 */
export const dynamic = 'force-dynamic'

/** Período (YYYY-MM) del mes ANTERIOR al día dado en TZ de negocio. */
function previousPeriod(now: Date): string {
  const today = serviceDayFromDate(now)
  const year = today.month === 1 ? today.year - 1 : today.year
  const month = today.month === 1 ? 12 : today.month - 1
  return `${year}-${String(month).padStart(2, '0')}`
}

const JOBS: Record<string, () => Promise<JobSummary>> = {
  // Cada ~5 min: congela pedidos cuyo cutoff pasó (CONFIRMED → LOCKED).
  'lock-orders': lockOrdersJob,
  // Día 1 de cada mes: settlements + facturas SaaS del mes anterior.
  'monthly-billing': async () => {
    const period = previousPeriod(new Date())
    const result = await generateMonthBilling({ period, actorId: 'system' })
    return { ...result }
  },
  // Diario: upsert del snapshot MRR del mes en curso (el valor de fin de mes
  // queda como cierre, sin depender de que alguien pulse el botón).
  'mrr-snapshot': async () => {
    const result = await captureMrrSnapshot()
    return { ...result }
  },
  // Semanal: aplica las políticas de retención configuradas en admin.
  retention: retentionJob,
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ job: string }> }
) {
  const { job } = await params

  if (!env.CRON_SECRET) {
    return apiError(503, 'CRON_SECRET no configurado en este entorno')
  }
  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return apiError(401, 'No autorizado')
  }

  const handler = JOBS[job]
  if (!handler) {
    return apiError(404, `Job desconocido: ${job}`)
  }

  const outcome = await runJob(job, handler)
  const status = outcome.ok ? 200 : outcome.skipped ? 202 : 500
  return NextResponse.json(outcome, { status })
}
