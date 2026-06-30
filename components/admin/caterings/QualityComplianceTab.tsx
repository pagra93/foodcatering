/**
 * Tab de Calidad & Cumplimiento del catering (datos reales).
 * Documentos, Auditorías (RestaurantAudit), Sanciones (Penalty) y alérgenos
 * calculados desde los platos. Sin datos inventados.
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Upload,
  Shield,
  Ban,
  Info,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/utils'
import { UploadDocumentModal } from './UploadDocumentModal'

type Doc = {
  id: string
  type: string
  fileUrl: string
  issuedAt: Date
  expiresAt: Date
  status: string
  verifiedBy: string | null
  verifiedAt: Date | null
}
type Audit = {
  id: string
  auditType: string
  score: number
  auditedAt: Date
  reportUrl: string | null
  notes: string | null
}
type Penalty = {
  id: string
  type: string
  reason: string
  amount: number
  status: string
  appliedAt: Date
}
type Allergens = {
  totalDishes: number
  labeledDishes: number
  pctLabeled: number
  distinctLabels: number
}

type Props = {
  documents: Doc[]
  audits: Audit[]
  penalties: Penalty[]
  allergens: Allergens
  cateringId: string
}

// Enums reales de Prisma
const DOC_TYPE: Record<string, string> = {
  REGISTRO_SANITARIO: 'Registro Sanitario',
  RC: 'Seguro RC',
  MANIPULADORES: 'Cert. Manipuladores',
  OTROS: 'Otro',
}
const DOC_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  VALID: { label: 'Válido', variant: 'success' },
  EXPIRING: { label: 'Próximo a caducar', variant: 'warning' },
  EXPIRED: { label: 'Caducado', variant: 'destructive' },
}
const AUDIT_TYPE: Record<string, string> = {
  SANITARIA: 'Sanitaria',
  OPERATIVA: 'Operativa',
  SATISFACCION: 'Satisfacción',
}
const PENALTY_TYPE: Record<string, string> = {
  SLA_BREACH: 'Incumplimiento SLA',
  DOC_EXPIRED: 'Documento caducado',
  INCIDENT_THRESHOLD: 'Exceso de incidencias',
  MANUAL: 'Manual',
}
const PENALTY_STATUS: Record<string, { label: string; variant: 'secondary' | 'destructive' | 'success' | 'outline' }> = {
  PENDING: { label: 'Pendiente', variant: 'secondary' },
  APPLIED: { label: 'Aplicada', variant: 'destructive' },
  DISPUTED: { label: 'En disputa', variant: 'outline' },
  WAIVED: { label: 'Anulada', variant: 'success' },
}

export function QualityComplianceTab({ documents, audits, penalties, allergens, cateringId }: Props) {
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const valid = documents.filter((d) => d.status === 'VALID').length
  const expiring = documents.filter((d) => d.status === 'EXPIRING').length
  const expired = documents.filter((d) => d.status === 'EXPIRED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Calidad & Cumplimiento</h2>
          <p className="mt-1 text-sm text-gray-500">
            Documentación, auditorías, sanciones y alérgenos del catering.
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Añadir documento
        </Button>
      </div>

      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        cateringId={cateringId}
      />

      {/* Resumen documentos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total documentos</p>
              <p className="text-2xl font-bold">{documents.length}</p>
            </div>
            <FileText className="h-7 w-7 text-gray-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Válidos</p>
              <p className="text-2xl font-bold text-green-600">{valid}</p>
            </div>
            <CheckCircle className="h-7 w-7 text-green-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Por caducar</p>
              <p className="text-2xl font-bold text-yellow-600">{expiring}</p>
            </div>
            <AlertTriangle className="h-7 w-7 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Caducados</p>
              <p className="text-2xl font-bold text-red-600">{expired}</p>
            </div>
            <XCircle className="h-7 w-7 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Documentos */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Documentos obligatorios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Caducidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead className="text-right">Documento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-sm text-gray-500">
                    No hay documentos. Añádelos para activar el catering.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => {
                  const st = DOC_STATUS[doc.status] ?? { label: doc.status, variant: 'secondary' as const }
                  return (
                    <TableRow key={doc.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{DOC_TYPE[doc.type] ?? doc.type}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(doc.issuedAt), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(doc.expiresAt), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {doc.verifiedAt
                          ? `✓ ${format(new Date(doc.verifiedAt), 'dd/MM/yyyy')}`
                          : 'Sin verificar'}
                      </TableCell>
                      <TableCell className="text-right">
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" /> Ver
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Auditorías + Sanciones */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" /> Auditorías
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Puntuación</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Informe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-sm text-gray-500">
                      Sin auditorías registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map((a) => (
                    <TableRow key={a.id} className="hover:bg-gray-50">
                      <TableCell>{AUDIT_TYPE[a.auditType] ?? a.auditType}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${a.score >= 80 ? 'text-emerald-600' : a.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}
                        >
                          {a.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(a.auditedAt), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.reportUrl ? (
                          <a href={a.reportUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            Ver
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="h-5 w-5 text-red-600" /> Sanciones por SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penalties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-sm text-gray-500">
                      Sin sanciones registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  penalties.map((p) => {
                    const st = PENALTY_STATUS[p.status] ?? { label: p.status, variant: 'secondary' as const }
                    return (
                      <TableRow key={p.id} className="hover:bg-gray-50" title={p.reason}>
                        <TableCell>{PENALTY_TYPE[p.type] ?? p.type}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(p.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(new Date(p.appliedAt), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Alérgenos (calculado desde los platos) */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Alérgenos y etiquetado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
            <Info className="mt-0.5 h-5 w-5 text-primary" />
            <p className="text-sm text-primary">
              Normativa UE 1169/2011: el catering debe declarar los 14 alérgenos principales y
              etiquetar todos sus platos. Las cifras se calculan sobre el catálogo real de platos.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Etiquetas distintas en uso</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{allergens.distinctLabels}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Platos etiquetados</p>
              <p
                className={`mt-1 text-2xl font-bold ${allergens.pctLabeled >= 90 ? 'text-green-600' : 'text-amber-600'}`}
              >
                {allergens.pctLabeled}%
              </p>
              <p className="text-xs text-gray-500">
                {allergens.labeledDishes}/{allergens.totalDishes} platos
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Platos en catálogo</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{allergens.totalDishes}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
