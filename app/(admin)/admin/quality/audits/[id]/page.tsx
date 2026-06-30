import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AuditType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRequiredSession } from '@/lib/auth/session'
import { getRestaurantAuditById } from '@/lib/db/queries/admin-audits'
import { AuditDetailForm } from '@/components/admin/quality/audits/AuditDetailForm'

const TYPE_LABEL: Record<AuditType, string> = {
  SANITARIA: 'Sanitaria',
  OPERATIVA: 'Operativa',
  SATISFACCION: 'Satisfacción',
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getRequiredSession()
  const { id } = await params
  const audit = await getRestaurantAuditById(id)
  if (!audit) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/quality/audits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Auditorías
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              Auditoría {TYPE_LABEL[audit.auditType]}
            </h1>
            <Badge variant="outline">{TYPE_LABEL[audit.auditType]}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {format(audit.auditedAt, "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-gray-500">Score</p>
          <p className={`text-3xl font-bold ${scoreColor(audit.score)}`}>
            {audit.score}
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Catering</p>
          {audit.catering ? (
            <Link
              href={`/admin/caterings/${audit.catering.id}`}
              className="mt-1 inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <Building2 className="h-4 w-4" />
              {audit.catering.name}
            </Link>
          ) : (
            <p className="mt-1 font-medium text-gray-400">— (catering no encontrado)</p>
          )}
          {audit.catering?.subdomain && (
            <p className="font-mono text-[10px] text-gray-500">
              {audit.catering.subdomain}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Informe PDF</p>
          {audit.reportUrl ? (
            <a
              href={audit.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ver informe
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Sin PDF adjunto</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Notas</p>
          <p className="mt-1 text-sm text-gray-700">
            {audit.notes || <span className="text-gray-400">Sin notas</span>}
          </p>
        </Card>
      </div>

      <AuditDetailForm
        audit={{
          id: audit.id,
          auditType: audit.auditType,
          score: audit.score,
          auditedAt: audit.auditedAt,
          reportUrl: audit.reportUrl,
          notes: audit.notes,
        }}
      />
    </div>
  )
}
