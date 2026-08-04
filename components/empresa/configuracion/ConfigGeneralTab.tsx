'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { readApiError } from '@/lib/utils/api-error'
import { Loader2, Building2, Users, MapPin, Plus } from 'lucide-react'
import { SiteDialog } from './SiteDialog'

const generalSchema = z.object({
  // Campos OBLIGATORIOS (según schema de Company)
  legalName: z.string().min(2, 'Requerido'),
  cif: z.string().min(9, 'CIF inválido'),
  billingAddress: z.string().min(5, 'Requerido'),
  
  // Campos OPCIONALES (según schema de Company)
  sector: z.string().optional().or(z.literal('')),
  employeeCount: z.coerce.number().int().optional(),
  contactRrhhName: z.string().optional().or(z.literal('')),
  contactRrhhEmail: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Email inválido' }
  ),
  contactRrhhPhone: z.string().optional().or(z.literal('')),
  contactFinanceName: z.string().optional().or(z.literal('')),
  contactFinanceEmail: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Email inválido' }
  ),
  contactFinancePhone: z.string().optional().or(z.literal('')),
})

type GeneralFormData = z.infer<typeof generalSchema>

type ConfigGeneralTabProps = {
  company: {
    legalName: string
    cif: string
    billingAddress: string
    sector: string | null
    employeeCount: number | null
    contactRrhhName: string | null
    contactRrhhEmail: string | null
    contactRrhhPhone: string | null
    contactFinanceName: string | null
    contactFinanceEmail: string | null
    contactFinancePhone: string | null
  }
  sites: Array<{
    id: string
    name: string
    address: string | null
    city: string | null
    postalCode?: string | null
    contactName?: string | null
    contactPhone?: string | null
    deliveryNotes?: string | null
  }>
}

export function ConfigGeneralTab({ company, sites }: ConfigGeneralTabProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState<typeof sites[0] | undefined>(undefined)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      legalName: company.legalName,
      cif: company.cif,
      billingAddress: company.billingAddress,
      sector: company.sector || '',
      employeeCount: company.employeeCount ?? undefined,
      contactRrhhName: company.contactRrhhName || '',
      contactRrhhEmail: company.contactRrhhEmail || '',
      contactRrhhPhone: company.contactRrhhPhone || '',
      contactFinanceName: company.contactFinanceName || '',
      contactFinanceEmail: company.contactFinanceEmail || '',
      contactFinancePhone: company.contactFinancePhone || '',
    },
  })

  const onSubmit = async (data: GeneralFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/empresa/configuracion/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Error al actualizar'))
      }

      toast.success('Configuración actualizada', {
        description: 'Los cambios se han guardado correctamente',
      })

      router.refresh()
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.message || 'Inténtalo de nuevo',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información Legal */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-600" />
          Información Legal
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legalName">
              Razón Social <span className="text-red-500">*</span>
            </Label>
            <Input id="legalName" {...register('legalName')} />
            {errors.legalName && (
              <p className="text-sm text-red-600">{errors.legalName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cif">
              CIF <span className="text-red-500">*</span>
            </Label>
            <Input id="cif" {...register('cif')} />
            {errors.cif && (
              <p className="text-sm text-red-600">{errors.cif.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billingAddress">
              Dirección de Facturación <span className="text-red-500">*</span>
            </Label>
            <Input id="billingAddress" {...register('billingAddress')} />
            {errors.billingAddress && (
              <p className="text-sm text-red-600">{errors.billingAddress.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector">Sector</Label>
            <Input id="sector" {...register('sector')} placeholder="Tecnología" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeCount">Número de Empleados</Label>
            <Input
              id="employeeCount"
              type="number"
              {...register('employeeCount')}
              placeholder="100"
            />
          </div>
        </div>
      </Card>

      {/* Contactos */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          Contactos Principales
        </h3>

        <div className="space-y-6">
          {/* Contacto RRHH */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Recursos Humanos
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contactRrhhName">Nombre</Label>
                <Input id="contactRrhhName" {...register('contactRrhhName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactRrhhEmail">Email</Label>
                <Input
                  id="contactRrhhEmail"
                  type="email"
                  {...register('contactRrhhEmail')}
                />
                {errors.contactRrhhEmail && (
                  <p className="text-sm text-red-600">
                    {errors.contactRrhhEmail.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactRrhhPhone">Teléfono</Label>
                <Input
                  id="contactRrhhPhone"
                  type="tel"
                  {...register('contactRrhhPhone')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contacto Finanzas */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Finanzas</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contactFinanceName">Nombre</Label>
                <Input
                  id="contactFinanceName"
                  {...register('contactFinanceName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactFinanceEmail">Email</Label>
                <Input
                  id="contactFinanceEmail"
                  type="email"
                  {...register('contactFinanceEmail')}
                />
                {errors.contactFinanceEmail && (
                  <p className="text-sm text-red-600">
                    {errors.contactFinanceEmail.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactFinancePhone">Teléfono</Label>
                <Input
                  id="contactFinancePhone"
                  type="tel"
                  {...register('contactFinancePhone')}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sedes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-600" />
            Sedes ({sites.length})
          </h3>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedSite(undefined)
              setSiteDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir Sede
          </Button>
        </div>

        {sites.length > 0 ? (
          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium text-gray-900">{site.name}</p>
                  <p className="text-sm text-gray-600">
                    {site.address}
                    {site.city && `, ${site.city}`}
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedSite(site)
                    setSiteDialogOpen(true)
                  }}
                >
                  Editar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No hay sedes configuradas. Añade al menos una sede para gestionar las
            entregas.
          </p>
        )}
      </Card>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          asChild
        >
          <Link href="/empresa/configuracion">
            Cancelar
          </Link>
        </Button>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Diálogo de Sede */}
      <SiteDialog
        open={siteDialogOpen}
        onOpenChange={setSiteDialogOpen}
        onSuccess={() => router.refresh()}
        site={selectedSite}
      />
    </form>
  )
}

