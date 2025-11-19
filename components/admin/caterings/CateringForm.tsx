/**
 * Formulario de creación de Catering
 * Similar a CompanyForm pero adaptado para caterings (Restaurant)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// Esquema de validación para Catering
const cateringSchema = z.object({
  // Tenant fields
  name: z.string().min(2, 'El nombre comercial es requerido'),
  subdomain: z
    .string()
    .min(3, 'El subdominio es requerido')
    .regex(/^[a-z0-9-]+$/, 'El subdominio solo puede contener letras minúsculas, números y guiones')
    .transform((s) => s.toLowerCase()),
  contactEmail: z.string().email('Formato de email inválido').optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  primaryColor: z.string().optional().or(z.literal('')),
  logoUrl: z.string().url('URL de logo inválida').optional().or(z.literal('')),

  // Restaurant fields
  legalName: z.string().min(2, 'La razón social es requerida'),
  cif: z.string().min(9, 'El CIF es requerido y debe tener 9 caracteres'),
  billingAddress: z.string().min(5, 'La dirección fiscal es requerida'),
  capacity: z.coerce.number().min(1, 'La capacidad debe ser mayor a 0'),
  kitchenAddress: z.string().min(5, 'La dirección de cocina es requerida'),
})

type CreateCateringInput = z.infer<typeof cateringSchema>

export function CateringForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateCateringInput>({
    resolver: zodResolver(cateringSchema),
    defaultValues: {
      name: '',
      subdomain: '',
      contactEmail: '',
      contactPhone: '',
      primaryColor: '#8B5CF6', // Purple for caterings
      logoUrl: '',
      legalName: '',
      cif: '',
      billingAddress: '',
      capacity: 100,
      kitchenAddress: '',
    },
  })

  const onSubmit = async (data: CreateCateringInput) => {
    setIsSubmitting(true)
    try {
      // TODO: Implementar createCatering en queries
      // const newCatering = await createCatering(data)
      toast.success('Catering creado exitosamente!')
      // router.push(`/admin/caterings/${newCatering.id}`)
      
      // Por ahora, redirigir a la lista
      router.push('/admin/caterings')
    } catch (error) {
      console.error('Error creating catering:', error)
      toast.error('Error al crear el catering. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = async () => {
    let isValid = false
    if (step === 0) {
      isValid = await form.trigger(['name', 'subdomain', 'contactEmail', 'contactPhone', 'primaryColor', 'logoUrl'])
    } else if (step === 1) {
      isValid = await form.trigger(['legalName', 'cif', 'billingAddress', 'capacity', 'kitchenAddress'])
    }

    if (isValid) {
      setStep((prev) => prev + 1)
    } else {
      toast.error('Por favor, corrige los errores antes de continuar.')
    }
  }

  const prevStep = () => {
    setStep((prev) => prev - 1)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Step 1: Información Básica del Tenant */}
        {step === 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">1. Información Básica</CardTitle>
              <FormDescription>Detalles generales del catering proveedor.</FormDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Comercial</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: La Buena Mesa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subdominio</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: labuenamesaX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Será la URL de acceso para el catering (ej: labuenamesaX.comidas.com)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de Contacto</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Ej: contacto@labuenamesaX.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de Contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: +34 600 123 456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Primario (Branding)</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Logo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: https://cdn.labuenamesaX.com/logo.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Información Legal y Operativa */}
        {step === 1 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">2. Datos Legales y Operativos</CardTitle>
              <FormDescription>Información fiscal y capacidad de producción.</FormDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón Social Legal</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: La Buena Mesa S.L." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CIF</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: B12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección Fiscal</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ej: Calle Falsa 123, 08001 Barcelona" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kitchenAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección de Cocina Central</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ej: Polígono Industrial X, Nave 5" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ubicación física donde se preparan los menús.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidad Diaria de Producción</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Número máximo de pedidos que puede procesar por día.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Navegación del formulario */}
        <div className="flex justify-between">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
          )}
          {step < 1 && (
            <Button type="button" onClick={nextStep} className="ml-auto">
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 1 && (
            <Button type="submit" className="ml-auto" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Catering
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

