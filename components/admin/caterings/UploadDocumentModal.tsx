/**
 * Modal para añadir un documento del catering POR URL.
 * No sube binarios (no hay storage configurado en el proyecto): el admin pega
 * la URL de un documento alojado fuera y se persiste un RestaurantDocument real.
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LinkIcon } from 'lucide-react'
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
import { addCateringDocument } from '@/components/admin/caterings/actions'

const schema = z.object({
  type: z.enum(['REGISTRO_SANITARIO', 'RC', 'MANIPULADORES', 'OTROS']),
  fileUrl: z.string().url('Introduce una URL válida'),
  issuedAt: z.string().min(1, 'La fecha de emisión es obligatoria'),
  expiresAt: z.string().min(1, 'La fecha de caducidad es obligatoria'),
})

type FormData = z.infer<typeof schema>

const TYPE_LABELS: Record<string, string> = {
  REGISTRO_SANITARIO: 'Registro Sanitario',
  RC: 'Seguro de Responsabilidad Civil',
  MANIPULADORES: 'Certificado de Manipuladores',
  OTROS: 'Otro documento',
}

type Props = {
  isOpen: boolean
  onClose: () => void
  cateringId: string
  onSuccess?: () => void
}

export function UploadDocumentModal({ isOpen, onClose, cateringId, onSuccess }: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setIsSaving(true)
    setServerError(null)
    const fd = new window.FormData()
    fd.set('type', data.type)
    fd.set('fileUrl', data.fileUrl)
    fd.set('issuedAt', data.issuedAt)
    fd.set('expiresAt', data.expiresAt)

    const result = await addCateringDocument(cateringId, fd)
    setIsSaving(false)

    if (result.error) {
      setServerError(result.error)
      return
    }
    reset()
    onSuccess?.()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Añadir documento (por URL)</DialogTitle>
          <DialogDescription>
            Pega la URL de un documento ya alojado (PDF/imagen) y sus fechas. El
            estado de validez se calcula automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="type">
              Tipo de documento <span className="text-red-500">*</span>
            </Label>
            <Select onValueChange={(v) => setValue('type', v as FormData['type'])}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
          </div>

          <div>
            <Label htmlFor="fileUrl">
              URL del documento <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="fileUrl"
                placeholder="https://…/documento.pdf"
                className="pl-8"
                {...register('fileUrl')}
              />
            </div>
            {errors.fileUrl && (
              <p className="mt-1 text-xs text-red-600">{errors.fileUrl.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="issuedAt">
                Fecha de emisión <span className="text-red-500">*</span>
              </Label>
              <Input type="date" id="issuedAt" {...register('issuedAt')} />
              {errors.issuedAt && (
                <p className="mt-1 text-xs text-red-600">{errors.issuedAt.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="expiresAt">
                Fecha de caducidad <span className="text-red-500">*</span>
              </Label>
              <Input type="date" id="expiresAt" {...register('expiresAt')} />
              {errors.expiresAt && (
                <p className="mt-1 text-xs text-red-600">{errors.expiresAt.message}</p>
              )}
            </div>
          </div>

          {serverError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Añadir documento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
