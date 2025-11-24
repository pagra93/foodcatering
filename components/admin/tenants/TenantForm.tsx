/**
 * Formulario de creación/edición de Tenant
 * Con validación React Hook Form + Zod
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, ChefHat, Loader2 } from 'lucide-react'
import { createTenantSchema, type CreateTenantInput } from '@/lib/validations/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type TenantFormProps = {
  mode: 'create' | 'edit'
  initialData?: Partial<CreateTenantInput>
  tenantId?: string
}

export function TenantForm({ mode, initialData, tenantId }: TenantFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedType, setSelectedType] = useState<'EMPRESA' | 'CATERING' | null>(
    initialData?.type || null
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      status: 'ACTIVE',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'es',
      country: 'España',
      ...initialData,
    },
  })

  const watchSubdomain = watch('subdomain')

  const onSubmit = async (data: CreateTenantInput) => {
    setIsSubmitting(true)

    try {
      const url = mode === 'create' 
        ? '/api/admin/tenants' 
        : `/api/admin/tenants/${tenantId}`
      
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el tenant')
      }

      // Redirigir al listado
      router.push('/admin/tenants')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Si no se ha seleccionado tipo en modo crear, mostrar selector
  if (mode === 'create' && !selectedType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selecciona el tipo de Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Empresa */}
            <button
              type="button"
              onClick={() => {
                setSelectedType('EMPRESA')
                setValue('type', 'EMPRESA')
              }}
              className="flex flex-col items-center gap-4 rounded-lg border-2 border-gray-200 p-8 transition-all hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Empresa</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Compañía que solicita servicios de menús para sus empleados
                </p>
              </div>
            </button>

            {/* Catering */}
            <button
              type="button"
              onClick={() => {
                setSelectedType('CATERING')
                setValue('type', 'CATERING')
              }}
              className="flex flex-col items-center gap-4 rounded-lg border-2 border-gray-200 p-8 transition-all hover:border-green-500 hover:bg-green-50"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <ChefHat className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Catering</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Proveedor de servicios de restauración y menús
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información Básica */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Información Básica</CardTitle>
            {selectedType && (
              <Badge variant={selectedType === 'EMPRESA' ? 'default' : 'secondary'}>
                {selectedType}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Tech Corp S.L."
              className={cn(errors.name && 'border-red-500')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Subdominio */}
          <div className="space-y-2">
            <Label htmlFor="subdomain">
              Subdominio <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                {...register('subdomain')}
                placeholder="techcorp"
                className={cn(errors.subdomain && 'border-red-500', 'flex-1')}
              />
              <span className="text-sm text-gray-500">.comida.com</span>
            </div>
            {watchSubdomain && (
              <p className="text-sm text-gray-500">
                URL: https://{watchSubdomain}.comida.com
              </p>
            )}
            {errors.subdomain && (
              <p className="text-sm text-red-600">{errors.subdomain.message}</p>
            )}
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              defaultValue="ACTIVE"
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Activo</SelectItem>
                <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                <SelectItem value="INACTIVE">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Color Primario */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Primario</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  {...register('primaryColor')}
                  className="h-10 w-20"
                />
                <Input
                  {...register('primaryColor')}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
              {errors.primaryColor && (
                <p className="text-sm text-red-600">{errors.primaryColor.message}</p>
              )}
            </div>

            {/* Logo URL */}
            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL del Logo</Label>
              <Input
                id="logoUrl"
                type="url"
                {...register('logoUrl')}
                placeholder="https://ejemplo.com/logo.png"
              />
              {errors.logoUrl && (
                <p className="text-sm text-red-600">{errors.logoUrl.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email de Contacto</Label>
              <Input
                id="contactEmail"
                type="email"
                {...register('contactEmail')}
                placeholder="contacto@empresa.com"
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-600">{errors.contactEmail.message}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Teléfono</Label>
              <Input
                id="contactPhone"
                type="tel"
                {...register('contactPhone')}
                placeholder="+34 912 345 678"
              />
              {errors.contactPhone && (
                <p className="text-sm text-red-600">{errors.contactPhone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dirección (solo para caterings) */}
      {selectedType === 'CATERING' && (
        <Card>
          <CardHeader>
            <CardTitle>Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Dirección Completa</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Calle Principal 123"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" {...register('city')} placeholder="Madrid" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Código Postal</Label>
                <Input
                  id="postalCode"
                  {...register('postalCode')}
                  placeholder="28001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" {...register('country')} placeholder="España" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notas Internas */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Internas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('notes')}
            placeholder="Notas adicionales sobre este tenant (solo visibles para admins)..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          asChild
        >
          <Link href="/admin/tenants">
            Cancelar
          </Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Crear Tenant' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  )
}

