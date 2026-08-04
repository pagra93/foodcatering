import { Prisma } from '@prisma/client'
// Los jobs son operación cross-tenant → cliente sin guard.
import { prismaAdmin } from '@/lib/db/prisma-admin'
import { logger } from '@/lib/log'

/**
 * Ejecuta un job con exclusión mutua y registro persistente en `job_runs`.
 *
 * El "lock" es el índice único parcial job_runs_running_key (una fila sin
 * finished_at por job): funciona con N réplicas y sin depender de advisory
 * locks de sesión (que exigen mantener la misma conexión del pool). Una
 * ejecución colgada >2 h (crash/redeploy) se marca stale y libera el lock.
 */

const STALE_RUN_MS = 2 * 60 * 60 * 1000

export type JobSummary = Record<string, unknown>

export type JobOutcome = {
  ok: boolean
  skipped?: boolean
  runId?: string
  summary?: JobSummary
  error?: string
}

async function claimRun(job: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await prismaAdmin.jobRun.create({ data: { job } })
    } catch (e) {
      const conflict =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
      if (!conflict) throw e

      const running = await prismaAdmin.jobRun.findFirst({
        where: { job, finishedAt: null },
      })
      if (running && Date.now() - running.startedAt.getTime() < STALE_RUN_MS) {
        return null // otra ejecución viva: saltar
      }
      if (running) {
        await prismaAdmin.jobRun.update({
          where: { id: running.id },
          data: {
            finishedAt: new Date(),
            ok: false,
            error: 'stale: superó las 2h sin terminar (crash o redeploy)',
          },
        })
      }
    }
  }
  return null
}

export async function runJob(
  job: string,
  fn: () => Promise<JobSummary>
): Promise<JobOutcome> {
  const run = await claimRun(job)
  if (!run) {
    return { ok: false, skipped: true, error: 'ya hay una ejecución en curso' }
  }

  const log = logger.child({ job, runId: run.id })
  log.info('job start')
  try {
    const summary = await fn()
    await prismaAdmin.jobRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: true,
        summary: summary as Prisma.InputJsonValue,
      },
    })
    log.info({ summary }, 'job ok')
    return { ok: true, runId: run.id, summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await prismaAdmin.jobRun
      .update({
        where: { id: run.id },
        data: { finishedAt: new Date(), ok: false, error: message },
      })
      .catch(() => undefined)
    log.error({ err: error }, 'job failed')
    return { ok: false, runId: run.id, error: message }
  }
}
