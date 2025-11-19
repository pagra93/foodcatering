/**
 * Modal para subir documentos de catering
 * Incluye validación de fechas y tipo de documento
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const uploadDocumentSchema = z.object({
  type: z.enum([
    'SANITARY_REGISTRATION',
    'LIABILITY_INSURANCE',
    'FOOD_HANDLER_CERTIFICATE',
    'APPCC_CERTIFICATE',
    'OTHER',
  ]),
  file: z.instanceof(File).optional(),
  issuedAt: z.string().min(1, 'La fecha de emisión es obligatoria'),
  expiresAt: z.string().min(1, 'La fecha de caducidad es obligatoria'),
})

type UploadDocumentFormData = z.infer<typeof uploadDocumentSchema>

type UploadDocumentModalProps = {
  isOpen: boolean
  onClose: () => void
  cateringId: string
  onSuccess?: () => void
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  cateringId,
  onSuccess,
}: UploadDocumentModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UploadDocumentFormData>({
    resolver: zodResolver(uploadDocumentSchema),
  })

  const documentType = watch('type')

  const onSubmit = async (data: UploadDocumentFormData) => {
    setIsUploading(true)
    try {
      // TODO: Implementar la lógica de subida
      console.log('Subiendo documento:', data, selectedFile)
      
      // Simulación de subida
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Resetear formulario
      reset()
      setSelectedFile(null)
      
      // Callback de éxito
      if (onSuccess) {
        onSuccess()
      }
      
      // Cerrar modal
      onClose()
    } catch (error) {
      console.error('Error subiendo documento:', error)
      alert('Error al subir el documento')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setValue('file', file)
    }
  }

  const documentTypeLabels: Record<string, string> = {
    SANITARY_REGISTRATION: 'Registro Sanitario',
    LIABILITY_INSURANCE: 'Seguro de Responsabilidad Civil',
    FOOD_HANDLER_CERTIFICATE: 'Certificado de Manipulador de Alimentos',
    APPCC_CERTIFICATE: 'Certificado APPCC',
    OTHER: 'Otro Documento',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>
            Sube un documento obligatorio para el catering. Asegúrate de que el
            archivo sea legible y las fechas sean correctas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de documento */}
          <div>
            <Label htmlFor="type">
              Tipo de Documento <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={(value) =>
                setValue(
                  'type',
                  value as UploadDocumentFormData['type']
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>
            )}
          </div>

          {/* Archivo */}
          <div>
            <Label htmlFor="file">
              Archivo (PDF, JPG, PNG) <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              {!selectedFile ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-colors hover:border-blue-400 hover:bg-blue-50">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Haz clic para seleccionar un archivo
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      setValue('file', undefined)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="issuedAt">
                Fecha de Emisión <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                id="issuedAt"
                {...register('issuedAt')}
                className="mt-1"
              />
              {errors.issuedAt && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.issuedAt.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="expiresAt">
                Fecha de Caducidad <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                id="expiresAt"
                {...register('expiresAt')}
                className="mt-1"
              />
              {errors.expiresAt && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.expiresAt.message}
                </p>
              )}
            </div>
          </div>

          {/* Info adicional según tipo */}
          {documentType === 'SANITARY_REGISTRATION' && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Registro Sanitario:</strong> Documento obligatorio
                emitido por la autoridad sanitaria. Debe estar vigente en todo
                momento.
              </p>
            </div>
          )}

          {documentType === 'LIABILITY_INSURANCE' && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Seguro RC:</strong> Cobertura mínima recomendada de
                300.000€. Verifica que incluya responsabilidad por
                intoxicaciones alimentarias.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Documento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

