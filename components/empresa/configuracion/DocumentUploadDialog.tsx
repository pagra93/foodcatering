'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Upload, FileText } from 'lucide-react'

type DocumentUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  documentType: 'contract' | 'cif' | 'certificate' | 'annex'
  documentName: string
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  documentType,
  documentName,
}: DocumentUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño (máx 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Archivo muy grande', {
          description: 'El archivo no puede superar los 10MB',
        })
        return
      }

      // Validar tipo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
      ]
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de archivo no permitido', {
          description: 'Solo se permiten archivos PDF e imágenes (JPG, PNG)',
        })
        return
      }

      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error('Selecciona un archivo')
      return
    }

    setIsUploading(true)

    try {
      // Crear FormData
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentType', documentType)

      // Subir archivo
      const response = await fetch('/api/empresa/configuracion/documentos', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al subir documento')
      }

      toast.success('Documento subido', {
        description: 'El documento se ha guardado correctamente',
      })

      onOpenChange(false)
      setSelectedFile(null)
      onSuccess()
    } catch (error: any) {
      toast.error('Error al subir', {
        description: error.message || 'Inténtalo de nuevo',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subir {documentName}</DialogTitle>
          <DialogDescription>
            Selecciona un archivo PDF o imagen (JPG, PNG). Tamaño máximo: 10MB
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input de archivo */}
          <div className="space-y-3">
            <Label htmlFor="file">Archivo</Label>
            <div className="flex items-center gap-3">
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={isUploading}
                className="flex-1"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  {(selectedFile.size / 1024).toFixed(0)}KB
                </div>
              )}
            </div>
          </div>

          {/* Preview del archivo seleccionado */}
          {selectedFile && (
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedFile.type} •{' '}
                    {(selectedFile.size / 1024).toFixed(1)}KB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información */}
          <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Este documento será almacenado de forma segura y
              podrá descargarse cuando lo necesites.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setSelectedFile(null)
              }}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Subiendo...' : (
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

