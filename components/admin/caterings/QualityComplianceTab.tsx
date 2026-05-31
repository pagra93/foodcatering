/**
 * Tab de Calidad & Cumplimiento para Caterings
 * Incluye: Documentos, Auditorías, Sanciones/Bonificaciones, Políticas
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
  Download,
  Eye,
  Calendar,
  Shield,
  Award,
  Ban,
  Info,
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
import { UploadDocumentModal } from './UploadDocumentModal'

type Document = {
  id: string
  type: string
  fileUrl: string
  issuedAt: Date
  expiresAt: Date
  status: string
  verifiedBy: string | null
  verifiedAt: Date | null
}

type QualityComplianceTabProps = {
  documents: Document[]
  cateringId: string
}

// Helper para obtener el nombre del documento en español
function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SANITARY_REGISTRATION: 'Registro Sanitario',
    LIABILITY_INSURANCE: 'Seguro RC',
    FOOD_HANDLER_CERTIFICATE: 'Certificado Manipulador',
    APPCC_CERTIFICATE: 'Certificado APPCC',
    OTHER: 'Otro Documento',
  }
  return labels[type] || type
}

// Helper para obtener el color del badge según el estado
function getDocumentStatusColor(
  status: string
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'VALID':
      return 'success'
    case 'EXPIRING_SOON':
      return 'warning'
    case 'EXPIRED':
      return 'destructive'
    default:
      return 'secondary'
  }
}

// Helper para obtener el icono según el estado
function getDocumentStatusIcon(status: string) {
  switch (status) {
    case 'VALID':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'EXPIRING_SOON':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case 'EXPIRED':
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Info className="h-4 w-4 text-gray-400" />
  }
}

// Helper para obtener el label del estado
function getDocumentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    VALID: 'Válido',
    EXPIRING_SOON: 'Próximo a caducar',
    EXPIRED: 'Caducado',
  }
  return labels[status] || status
}

export function QualityComplianceTab({
  documents,
  cateringId,
}: QualityComplianceTabProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Agrupar documentos por tipo
  const documentsByType: Record<string, Document[]> = {}
  documents.forEach((doc) => {
    const bucket = documentsByType[doc.type] ?? []
    bucket.push(doc)
    documentsByType[doc.type] = bucket
  })

  // Contar documentos por estado
  const validDocs = documents.filter((d) => d.status === 'VALID').length
  const expiringSoonDocs = documents.filter((d) => d.status === 'EXPIRING_SOON')
    .length
  const expiredDocs = documents.filter((d) => d.status === 'EXPIRED').length

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Calidad & Cumplimiento
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Documentación obligatoria, auditorías y cumplimiento de SLAs
          </p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Subir Documento
        </Button>
      </div>

      {/* Modal de subida */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        cateringId={cateringId}
        onSuccess={() => {
          // TODO: Refrescar la lista de documentos
          console.log('Documento subido exitosamente')
        }}
      />

      {/* Resumen de documentos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Documentos
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Válidos</p>
                <p className="text-2xl font-bold text-green-600">{validDocs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Por Caducar</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {expiringSoonDocs}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Caducados</p>
                <p className="text-2xl font-bold text-red-600">{expiredDocs}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de documentos */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">
            Documentos Obligatorios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Documento</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Fecha Caducidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-gray-500"
                  >
                    <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm">No hay documentos subidos</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Sube los documentos obligatorios para activar el catering
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDocumentStatusIcon(doc.status)}
                        <span className="font-medium text-gray-900">
                          {getDocumentTypeLabel(doc.type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {format(new Date(doc.issuedAt), 'dd/MM/yyyy', {
                          locale: es,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {format(new Date(doc.expiresAt), 'dd/MM/yyyy', {
                          locale: es,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDocumentStatusColor(doc.status)}>
                        {getDocumentStatusLabel(doc.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.verifiedBy && doc.verifiedAt ? (
                        <div className="text-sm">
                          <p className="text-gray-900">✓ Verificado</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(doc.verifiedAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Sin verificar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Auditorías */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Auditorías
            </CardTitle>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Planificar Auditoría
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 text-gray-500">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium">No hay auditorías registradas</p>
            <p className="text-xs text-gray-400 mt-1">
              Las auditorías internas y externas aparecerán aquí
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sanciones y Bonificaciones */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sanciones */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Sanciones por SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Ban className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium">Sin sanciones registradas</p>
              <p className="text-xs text-gray-400 mt-1">
                Histórico de penalizaciones por incumplimiento
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bonificaciones */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Bonificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Award className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium">
                Sin bonificaciones registradas
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Incentivos por cumplimiento excepcional
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Políticas de Alérgenos */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">
            Política de Alérgenos y Etiquetado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-primary">
                  Cumplimiento de Normativa
                </h4>
                <p className="mt-1 text-sm text-primary">
                  El catering debe declarar todos los alérgenos presentes en sus
                  platos según la normativa europea (Reglamento UE 1169/2011).
                </p>
                <ul className="mt-2 space-y-1 text-xs text-primary">
                  <li>
                    ✓ Declaración obligatoria de 14 alérgenos principales
                  </li>
                  <li>
                    ✓ Etiquetado claro y visible en todos los menús
                  </li>
                  <li>
                    ✓ Notificación inmediata de cambios en ingredientes
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500">
                  Etiquetas Activas
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">14</p>
                <p className="text-xs text-gray-500">alérgenos declarados</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500">
                  Adhesión a Política
                </p>
                <p className="mt-1 text-2xl font-bold text-green-600">100%</p>
                <p className="text-xs text-gray-500">platos etiquetados</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500">
                  Última Actualización
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  15/11/2025
                </p>
                <p className="text-xs text-gray-500">hace 1 día</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

