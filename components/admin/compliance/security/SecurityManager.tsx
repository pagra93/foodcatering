'use client'

/**
 * Registro OWASP + pentest: checklist editable (estado/evidencia por control) y
 * subida de informes de pentest. Cablea las server actions ya existentes
 * (upsertSecurityCheckAction / createSecurityReportAction). Patrón de TaxRuleManager.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle, XCircle, Pencil, Plus, ExternalLink, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  upsertSecurityCheckAction,
  createSecurityReportAction,
} from './actions'

type Category =
  | 'OWASP_A01_ACCESS_CONTROL'
  | 'OWASP_A02_CRYPTO_FAILURES'
  | 'OWASP_A03_INJECTION'
  | 'OWASP_A04_INSECURE_DESIGN'
  | 'OWASP_A05_SECURITY_MISCONFIG'
  | 'OWASP_A06_VULNERABLE_COMPONENTS'
  | 'OWASP_A07_AUTH_FAILURES'
  | 'OWASP_A08_DATA_INTEGRITY'
  | 'OWASP_A09_LOGGING_MONITORING'
  | 'OWASP_A10_SSRF'
type CheckStatus = 'VERIFIED' | 'FAILED' | 'PENDING'
type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type SecurityCheckRow = {
  id: string
  category: Category
  item: string
  status: CheckStatus
  evidence: string | null
}

export type SecurityReportRow = {
  id: string
  title: string
  scanner: string
  scannedAt: string // YYYY-MM-DD
  pdfUrl: string
  severity: Severity
  notes: string | null
}

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'OWASP_A01_ACCESS_CONTROL', label: 'A01 · Broken Access Control' },
  { value: 'OWASP_A02_CRYPTO_FAILURES', label: 'A02 · Cryptographic Failures' },
  { value: 'OWASP_A03_INJECTION', label: 'A03 · Injection' },
  { value: 'OWASP_A04_INSECURE_DESIGN', label: 'A04 · Insecure Design' },
  { value: 'OWASP_A05_SECURITY_MISCONFIG', label: 'A05 · Security Misconfiguration' },
  { value: 'OWASP_A06_VULNERABLE_COMPONENTS', label: 'A06 · Vulnerable Components' },
  { value: 'OWASP_A07_AUTH_FAILURES', label: 'A07 · Authentication Failures' },
  { value: 'OWASP_A08_DATA_INTEGRITY', label: 'A08 · Data Integrity Failures' },
  { value: 'OWASP_A09_LOGGING_MONITORING', label: 'A09 · Logging & Monitoring Failures' },
  { value: 'OWASP_A10_SSRF', label: 'A10 · SSRF' },
]
const SEVERITIES: Severity[] = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const SEVERITY_COLOR: Record<Severity, string> = {
  INFO: 'bg-gray-100 text-gray-700',
  LOW: 'bg-primary/10 text-primary',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export function SecurityManager({
  checks,
  reports,
}: {
  checks: SecurityCheckRow[]
  reports: SecurityReportRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // ── Control OWASP ──
  const [checkOpen, setCheckOpen] = useState(false)
  const [check, setCheck] = useState<{
    id?: string
    category: Category
    item: string
    status: CheckStatus
    evidence: string
  }>({ category: 'OWASP_A01_ACCESS_CONTROL', item: '', status: 'PENDING', evidence: '' })

  const openNewCheck = () => {
    setError(null)
    setCheck({ category: 'OWASP_A01_ACCESS_CONTROL', item: '', status: 'PENDING', evidence: '' })
    setCheckOpen(true)
  }
  const openEditCheck = (c: SecurityCheckRow) => {
    setError(null)
    setCheck({ id: c.id, category: c.category, item: c.item, status: c.status, evidence: c.evidence ?? '' })
    setCheckOpen(true)
  }
  const saveCheck = () => {
    setError(null)
    if (check.item.trim().length < 5) {
      setError('Describe el control (mínimo 5 caracteres).')
      return
    }
    startTransition(async () => {
      const res = await upsertSecurityCheckAction({
        id: check.id,
        category: check.category,
        item: check.item.trim(),
        status: check.status,
        evidence: check.evidence.trim() || undefined,
      })
      if (!res.success) {
        setError(res.error)
        return
      }
      setCheckOpen(false)
      router.refresh()
    })
  }

  // ── Informe pentest ──
  const [reportOpen, setReportOpen] = useState(false)
  const [report, setReport] = useState<{
    title: string
    scanner: string
    scannedAt: string
    pdfUrl: string
    severity: Severity
    notes: string
  }>({ title: '', scanner: '', scannedAt: '', pdfUrl: '', severity: 'INFO', notes: '' })

  const openNewReport = () => {
    setError(null)
    setReport({ title: '', scanner: '', scannedAt: '', pdfUrl: '', severity: 'INFO', notes: '' })
    setReportOpen(true)
  }
  const saveReport = () => {
    setError(null)
    if (!report.title || !report.scanner || !report.scannedAt || !report.pdfUrl) {
      setError('Título, herramienta, fecha y URL del PDF son obligatorios.')
      return
    }
    startTransition(async () => {
      const res = await createSecurityReportAction({
        title: report.title.trim(),
        scanner: report.scanner.trim(),
        scannedAt: new Date(report.scannedAt),
        pdfUrl: report.pdfUrl.trim(),
        severity: report.severity,
        notes: report.notes.trim() || undefined,
      })
      if (!res.success) {
        setError(res.error)
        return
      }
      setReportOpen(false)
      router.refresh()
    })
  }

  const byCategory = (cat: Category) => checks.filter((c) => c.category === cat)

  return (
    <div className="space-y-6">
      {/* Checklist OWASP */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Checklist OWASP Top 10</h3>
          <Button size="sm" onClick={openNewCheck} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir control
          </Button>
        </div>
        <div className="space-y-3">
          {CATEGORY_OPTIONS.map(({ value: cat, label }) => {
            const items = byCategory(cat)
            const ok = items.filter((c) => c.status === 'VERIFIED').length
            const failed = items.filter((c) => c.status === 'FAILED').length
            return (
              <div key={cat} className="rounded-md border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  {items.length > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        failed > 0
                          ? 'bg-red-100 text-red-700'
                          : ok === items.length
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ok}/{items.length}
                    </span>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="mt-1 text-xs text-gray-400">Sin ítems registrados.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {items.map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-2 text-xs">
                        <span className="flex items-start gap-2 text-gray-600">
                          {c.status === 'VERIFIED' && (
                            <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                          )}
                          {c.status === 'FAILED' && (
                            <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-600" />
                          )}
                          {c.status === 'PENDING' && (
                            <span className="mt-0.5 inline-block h-3 w-3 flex-shrink-0 rounded-full border-2 border-amber-400" />
                          )}
                          <span>
                            {c.item}
                            {c.evidence && <span className="ml-2 text-gray-400">· {c.evidence}</span>}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditCheck(c)}
                          className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Editar control"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Informes pentest */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Informes de pentesting externos</h3>
          <Button size="sm" variant="outline" onClick={openNewReport} disabled={isPending}>
            <Upload className="mr-2 h-4 w-4" />
            Subir informe
          </Button>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no se han subido informes de pentest.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-100 p-3 text-sm"
              >
                <div className="flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {r.scanner} · {format(new Date(r.scannedAt), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[r.severity]}`}>
                  {r.severity}
                </span>
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver PDF
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Dialog control OWASP */}
      <Dialog open={checkOpen} onOpenChange={setCheckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{check.id ? 'Editar control OWASP' : 'Nuevo control OWASP'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat">Categoría</Label>
              <Select
                value={check.category}
                onValueChange={(v) => setCheck((c) => ({ ...c, category: v as Category }))}
              >
                <SelectTrigger id="cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="item">Control</Label>
              <Input
                id="item"
                value={check.item}
                onChange={(e) => setCheck((c) => ({ ...c, item: e.target.value }))}
                placeholder="Qué se controla y cómo se cumple"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={check.status}
                  onValueChange={(v) => setCheck((c) => ({ ...c, status: v as CheckStatus }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERIFIED">Verificado</SelectItem>
                    <SelectItem value="FAILED">Fallido</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="evidence">Evidencia (opcional)</Label>
                <Input
                  id="evidence"
                  value={check.evidence}
                  onChange={(e) => setCheck((c) => ({ ...c, evidence: e.target.value }))}
                  placeholder="Enlace o nota"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={saveCheck} disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog informe pentest */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir informe de pentest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={report.title}
                onChange={(e) => setReport((r) => ({ ...r, title: e.target.value }))}
                placeholder="Pentest anual 2026 — aplicación web"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scanner">Herramienta / proveedor</Label>
                <Input
                  id="scanner"
                  value={report.scanner}
                  onChange={(e) => setReport((r) => ({ ...r, scanner: e.target.value }))}
                  placeholder="OWASP ZAP, empresa X…"
                />
              </div>
              <div>
                <Label htmlFor="scannedAt">Fecha</Label>
                <Input
                  id="scannedAt"
                  type="date"
                  value={report.scannedAt}
                  onChange={(e) => setReport((r) => ({ ...r, scannedAt: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pdfUrl">URL del PDF</Label>
              <Input
                id="pdfUrl"
                type="url"
                value={report.pdfUrl}
                onChange={(e) => setReport((r) => ({ ...r, pdfUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="severity">Severidad máx.</Label>
                <Select
                  value={report.severity}
                  onValueChange={(v) => setReport((r) => ({ ...r, severity: v as Severity }))}
                >
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  value={report.notes}
                  onChange={(e) => setReport((r) => ({ ...r, notes: e.target.value }))}
                  placeholder="Resumen de hallazgos"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={saveReport} disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
