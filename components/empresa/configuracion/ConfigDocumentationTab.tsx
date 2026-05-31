'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Upload, CheckCircle2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DocumentUploadDialog } from './DocumentUploadDialog'

type ConfigDocumentationTabProps = {
  company: {
    contractSignedAt: Date | null
    contractUrl: string | null
    digitalCertificateUrl: string | null
    cifDocumentUrl: string | null
    contractAnnexes: any | null
    createdAt: Date
  }
}

export function ConfigDocumentationTab({ company }: ConfigDocumentationTabProps) {
  const router = useRouter()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{
    type: 'contract' | 'cif' | 'certificate' | 'annex'
    name: string
  } | null>(null)

  const documents = [
    {
      id: 'contract',
      name: 'Contrato Principal',
      description: 'Contrato de servicios firmado con Comida.com',
      url: company.contractUrl,
      uploadedAt: company.contractSignedAt,
      required: true,
    },
    {
      id: 'cif',
      name: 'Documento CIF',
      description: 'Certificado de identificación fiscal de la empresa',
      url: company.cifDocumentUrl,
      uploadedAt: null,
      required: true,
    },
    {
      id: 'certificate',
      name: 'Certificado Digital',
      description: 'Certificado digital para firma electrónica',
      url: company.digitalCertificateUrl,
      uploadedAt: null,
      required: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Documentos Principales */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documentos Principales
        </h3>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between p-4 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  {doc.required && (
                    <Badge variant="outline" className="text-xs">
                      Requerido
                    </Badge>
                  )}
                  {doc.url && (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Subido
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                {doc.uploadedAt && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Subido el{' '}
                    {format(new Date(doc.uploadedAt), "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {doc.url ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.url} download>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedDocument({
                          type: doc.id as 'contract' | 'cif' | 'certificate',
                          name: doc.name,
                        })
                        setUploadDialogOpen(true)
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Reemplazar
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedDocument({
                        type: doc.id as 'contract' | 'cif' | 'certificate',
                        name: doc.name,
                      })
                      setUploadDialogOpen(true)
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Subir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Anexos del Contrato */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Anexos del Contrato
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedDocument({
                type: 'annex',
                name: 'Anexo del Contrato',
              })
              setUploadDialogOpen(true)
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Añadir Anexo
          </Button>
        </div>
        {company.contractAnnexes && Array.isArray(company.contractAnnexes) ? (
          <div className="space-y-3">
            {company.contractAnnexes.map((annexName: string, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{annexName}</p>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No hay anexos adjuntos al contrato
          </p>
        )}
      </Card>

      {/* Información del Contrato */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Información del Contrato</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Fecha de Firma</p>
            <p className="text-base text-gray-900 mt-1">
              {company.contractSignedAt
                ? format(
                    new Date(company.contractSignedAt),
                    "d 'de' MMMM, yyyy",
                    { locale: es }
                  )
                : 'No disponible'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Fecha de Alta</p>
            <p className="text-base text-gray-900 mt-1">
              {format(new Date(company.createdAt), "d 'de' MMMM, yyyy", {
                locale: es,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Estado del Contrato</p>
            <Badge variant="success" className="mt-1">
              Activo
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Próxima Renovación</p>
            <p className="text-base text-gray-900 mt-1">
              {company.contractSignedAt
                ? format(
                    new Date(
                      new Date(company.contractSignedAt).setFullYear(
                        new Date(company.contractSignedAt).getFullYear() + 1
                      )
                    ),
                    "d 'de' MMMM, yyyy",
                    { locale: es }
                  )
                : 'No disponible'}
            </p>
          </div>
        </div>
      </Card>

      {/* Términos Aceptados */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Términos y Condiciones</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Términos Generales Aceptados
              </p>
              <p className="text-xs text-green-700">
                Aceptado el{' '}
                {format(new Date(company.createdAt), "d 'de' MMMM, yyyy", {
                  locale: es,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Política de Privacidad Aceptada
              </p>
              <p className="text-xs text-green-700">
                Aceptado el{' '}
                {format(new Date(company.createdAt), "d 'de' MMMM, yyyy", {
                  locale: es,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Condiciones de Servicio Aceptadas
              </p>
              <p className="text-xs text-green-700">
                Aceptado el{' '}
                {format(new Date(company.createdAt), "d 'de' MMMM, yyyy", {
                  locale: es,
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm">
            Ver Términos Generales
          </Button>
          <Button variant="outline" size="sm">
            Ver Política de Privacidad
          </Button>
        </div>
      </Card>

      {/* Historial de Renovaciones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de Renovaciones</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-4 p-3 rounded-lg border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-semibold text-primary">1</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Contrato Inicial</p>
              <p className="text-sm text-gray-600 mt-1">
                {company.contractSignedAt
                  ? format(
                      new Date(company.contractSignedAt),
                      "d 'de' MMMM, yyyy",
                      { locale: es }
                    )
                  : format(new Date(company.createdAt), "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
              </p>
              <Badge variant="success" className="mt-2">
                Activo
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Diálogo de Subida */}
      {selectedDocument && (
        <DocumentUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={() => router.refresh()}
          documentType={selectedDocument.type}
          documentName={selectedDocument.name}
        />
      )}
    </div>
  )
}

