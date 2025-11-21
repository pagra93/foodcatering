'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Loader2 } from 'lucide-react'

const siteSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  address: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postalCode: z.string().optional().or(z.literal('')),
  contactName: z.string().optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  deliveryInstructions: z.string().optional().or(z.literal('')),
})

type SiteFormData = z.infer<typeof siteSchema>

type SiteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  site?: {
    id: string
    name: string
    address: string | null
    city: string | null
    postalCode: string | null
    contactName: string | null
    contactPhone: string | null
    deliveryInstructions: string | null
  }
}

export function SiteDialog({ open, onOpenChange, onSuccess, site }: SiteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!site

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: site ? {
      name: site.name,
      address: site.address || '',
      city: site.city || '',
      postalCode: site.postalCode || '',
      contactName: site.contactName || '',
      contactPhone: site.contactPhone || '',
      deliveryInstructions: site.deliveryInstructions || '',
    } : undefined,
  })

  // Reset form when dialog opens/closes or site changes
  useEffect(() => {
    if (open && site) {
      reset({
        name: site.name,
        address: site.address || '',
        city: site.city || '',
        postalCode: site.postalCode || '',
        contactName: site.contactName || '',
        contactPhone: site.contactPhone || '',
        deliveryInstructions: site.deliveryInstructions || '',
      })
    } else if (open && !site) {
      reset({
        name: '',
        address: '',
        city: '',
        postalCode: '',
        contactName: '',
        contactPhone: '',
        deliveryInstructions: '',
      })
    }
  }, [open, site, reset])

  const onSubmit = async (data: SiteFormData) => {
    setIsSubmitting(true)

    try {
      const url = isEdit
        ? `/api/empresa/configuracion/sedes/${site.id}`
        : '/api/empresa/configuracion/sedes'
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al guardar sede')
      }

      toast.success(isEdit ? 'Sede actualizada' : 'Sede creada', {
        description: 'Los cambios se han guardado correctamente',
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.message || 'Inténtalo de nuevo',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Sede' : 'Nueva Sede'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica la información de la sede'
              : 'Añade una nueva sede para tu empresa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre de la Sede <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Oficina Central"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Calle Mayor, 123"
              disabled={isSubmitting}
            />
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          {/* Ciudad y CP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                Ciudad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Madrid"
                disabled={isSubmitting}
              />
              {errors.city && (
                <p className="text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Código Postal</Label>
              <Input
                id="postalCode"
                {...register('postalCode')}
                placeholder="28001"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contacto</Label>
              <Input
                id="contactName"
                {...register('contactName')}
                placeholder="Juan Pérez"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Teléfono</Label>
              <Input
                id="contactPhone"
                type="tel"
                {...register('contactPhone')}
                placeholder="+34 600 000 000"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Instrucciones de entrega */}
          <div className="space-y-2">
            <Label htmlFor="deliveryInstructions">Instrucciones de Entrega</Label>
            <Input
              id="deliveryInstructions"
              {...register('deliveryInstructions')}
              placeholder="Portería - Planta 2"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Sede'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

