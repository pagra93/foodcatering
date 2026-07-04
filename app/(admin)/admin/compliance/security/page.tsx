import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getSecurityChecks,
  getSecurityKPIs,
  getSecurityReports,
} from '@/lib/db/queries/admin-security'
import {
  SecurityManager,
  type SecurityCheckRow,
  type SecurityReportRow,
} from '@/components/admin/compliance/security/SecurityManager'

export default async function SecurityPage() {
  const [kpis, checks, reports] = await Promise.all([
    getSecurityKPIs(),
    getSecurityChecks(),
    getSecurityReports(10),
  ])

  const checkRows: SecurityCheckRow[] = checks.map((c) => ({
    id: c.id,
    category: c.category,
    item: c.item,
    status: c.status,
    evidence: c.evidence,
  }))
  const reportRows: SecurityReportRow[] = reports.map((r) => ({
    id: r.id,
    title: r.title,
    scanner: r.scanner,
    scannedAt: r.scannedAt.toISOString().slice(0, 10),
    pdfUrl: r.pdfUrl,
    severity: r.severity,
    notes: r.notes,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/compliance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Compliance
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Seguridad — OWASP + Pentest</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Checklist de los 10 controles OWASP Top 10 con evidencia documentada,
          e informes externos de pentesting. Útil para clientes que piden
          evidencia de seguridad en due diligence.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Verificados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {kpis.verified}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Fallidos</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{kpis.failed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {kpis.pending}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Informes pentest</p>
          <p className="mt-1 text-2xl font-bold">{kpis.totalReports}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Hallazgos graves</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {kpis.criticalFindings}
          </p>
        </Card>
      </div>

      <SecurityManager checks={checkRows} reports={reportRows} />
    </div>
  )
}
