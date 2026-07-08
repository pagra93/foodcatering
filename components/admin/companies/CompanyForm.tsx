/**
 * Formulario completo de empresa
 * Organizado en secciones lógicas con validación
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

const DIAS_SEMANA = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
]

type CompanyFormProps = {
  action: (formData: FormData) => Promise<void>
  initialData?: any
  /** Catálogo de planes SaaS para asignar (por saasPlanId). */
  plans?: { id: string; name: string; scope: string }[]
}

export function CompanyForm({ action, initialData, plans = [] }: CompanyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDays, setSelectedDays] = useState<string[]>(
    initialData?.policy?.daysActive || ['monday', 'tuesday', 'wednesday', 'thursday']
  )

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    try {
      await action(formData)
    } catch (error) {
      console.error(error)
      alert('Error al guardar la empresa')
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {/* ========== SECCIÓN 1: INFORMACIÓN BÁSICA ========== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Información Básica
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="name">
              Nombre Comercial <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialData?.name}
              placeholder="ej: ACME Corporation"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Nombre que se mostrará en la plataforma
            </p>
          </div>

          <div>
            <Label htmlFor="subdomain">
              Subdominio <span className="text-red-500">*</span>
            </Label>
            <div className="flex">
              <Input
                id="subdomain"
                name="subdomain"
                defaultValue={initialData?.subdomain}
                placeholder="acme"
                required
                pattern="[a-z0-9-]+"
                className="rounded-r-none"
              />
              <span className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                .plataforma.com
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Solo minúsculas, números y guiones
            </p>
          </div>

          <div>
            <Label htmlFor="contactEmail">Email de Contacto</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={initialData?.contactEmail}
              placeholder="contacto@acme.com"
            />
          </div>

          <div>
            <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={initialData?.contactPhone}
              placeholder="+34 900 000 000"
            />
          </div>
        </div>
      </div>

      {/* ========== SECCIÓN 2: BRANDING ========== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="primaryColor">Color Primario</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={initialData?.primaryColor || '#3B82F6'}
                className="h-10 w-20"
              />
              <Input
                type="text"
                defaultValue={initialData?.primaryColor || '#3B82F6'}
                placeholder="#3B82F6"
                pattern="^#[0-9A-Fa-f]{6}$"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logoUrl">URL del Logo</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={initialData?.logoUrl}
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>
        </div>
      </div>

      {/* ========== SECCIÓN 3: INFORMACIÓN LEGAL ========== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Información Legal
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="legalName">
              Razón Social <span className="text-red-500">*</span>
            </Label>
            <Input
              id="legalName"
              name="legalName"
              defaultValue={initialData?.company?.legalName}
              placeholder="ACME Corporation S.L."
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Nombre legal de la empresa
            </p>
          </div>

          <div>
            <Label htmlFor="cif">
              CIF/NIF <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cif"
              name="cif"
              defaultValue={initialData?.company?.cif}
              placeholder="B12345678"
              required
              pattern="[A-Z][0-9]{8}"
              className="uppercase"
            />
            <p className="mt-1 text-xs text-gray-500">
              Letra mayúscula + 8 dígitos
            </p>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="billingAddress">
              Dirección Fiscal <span className="text-red-500">*</span>
            </Label>
            <Input
              id="billingAddress"
              name="billingAddress"
              defaultValue={initialData?.company?.billingAddress}
              placeholder="Calle Gran Vía 1, 28013 Madrid"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Dirección para facturación
            </p>
          </div>

          <div>
            <Label htmlFor="saasPlanId">
              Plan <span className="text-red-500">*</span>
            </Label>
            <Select
              name="saasPlanId"
              defaultValue={initialData?.company?.saasPlanId ?? plans[0]?.id ?? ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.scope === 'CUSTOM' ? ' · a medida' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              Define precio, límites y funcionalidades de la empresa.
            </p>
          </div>

          <div>
            <Label htmlFor="billingCycle">Ciclo de cobro</Label>
            <Select
              name="billingCycle"
              defaultValue={initialData?.company?.billingCycle ?? 'MONTHLY'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mensual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Mensual</SelectItem>
                <SelectItem value="YEARLY">Anual (precio anual del plan)</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              Anual factura el precio anual una vez al año, en el mes de alta.
              Requiere que el plan tenga precio anual.
            </p>
          </div>
        </div>
      </div>

      {/* ========== SECCIÓN 4: POLÍTICA DE SERVICIO ========== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Política de Servicio
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configuración que controla cómo los empleados pueden hacer pedidos y cuándo.
            Esta configuración se aplica a todos los empleados de la empresa.
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <Label htmlFor="policy.cutoffTime">
                ⏰ Hora de Corte <span className="text-red-500">*</span>
              </Label>
              <Input
                id="policy.cutoffTime"
                name="policy.cutoffTime"
                type="time"
                defaultValue={initialData?.policy?.cutoffTime || '11:00'}
                required
                className="text-lg font-semibold"
              />
              <p className="mt-1 text-xs text-gray-500">
                Hora límite para hacer/cancelar pedidos
              </p>
              <p className="mt-1 text-xs text-primary font-medium">
                Después de esta hora, los pedidos se bloquean automáticamente
              </p>
            </div>

            <div>
              <Label htmlFor="policy.limitPerDay">
                Presupuesto Diario por Empleado (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="policy.limitPerDay"
                name="policy.limitPerDay"
                type="number"
                step="0.01"
                min="0"
                max="20"
                defaultValue={initialData?.policy?.limitPerDay || 11}
                required
                className="text-lg font-semibold"
              />
              <p className="mt-1 text-xs text-gray-500">
                ⚖️ Máximo <strong>11€/día</strong> para estar exento de IRPF
              </p>
            </div>

            <div>
              <Label htmlFor="policy.noShowRule">
                Regla No-Show <span className="text-red-500">*</span>
              </Label>
              <Select
                name="policy.noShowRule"
                defaultValue={initialData?.policy?.noShowRule || 'NO_CHARGE'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO_CHARGE">No cobrar</SelectItem>
                  <SelectItem value="CHARGE">Cobrar completo</SelectItem>
                  <SelectItem value="PARTIAL">Cobrar parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="policy.copayCompany">
                Copago Empresa (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="policy.copayCompany"
                name="policy.copayCompany"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData?.policy?.copayCompany || 6}
                required
              />
            </div>

            <div>
              <Label htmlFor="policy.copayEmployee">
                Copago Empleado (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="policy.copayEmployee"
                name="policy.copayEmployee"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData?.policy?.copayEmployee || 5}
                required
              />
            </div>
          </div>

          <div>
            <Label>
              Días Operativos (Servicio Activo) <span className="text-red-500">*</span>
            </Label>
            <p className="mt-1 text-sm text-gray-600">
              📅 Selecciona los días en que los empleados <strong>pueden hacer pedidos</strong>.
              Los empleados <strong>solo podrán seleccionar menú</strong> en estos días.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {DIAS_SEMANA.map((dia) => (
                <div key={dia.value} className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-3 hover:border-primary/40 hover:bg-primary/10 transition-colors">
                  <Checkbox
                    id={`day-${dia.value}`}
                    name="policy.daysActive"
                    value={dia.value}
                    defaultChecked={selectedDays.includes(dia.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDays([...selectedDays, dia.value])
                      } else {
                        setSelectedDays(selectedDays.filter((d) => d !== dia.value))
                      }
                    }}
                  />
                  <label
                    htmlFor={`day-${dia.value}`}
                    className="flex-1 text-sm font-medium leading-none cursor-pointer"
                  >
                    {dia.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-primary/10 border border-primary/30 p-3">
              <p className="text-xs text-primary">
                <strong>💡 Ejemplo:</strong> Si seleccionas Lunes a Jueves, los empleados solo podrán 
                hacer pedidos de lunes a jueves. No verán la opción de selección los viernes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== SECCIÓN 5: SEDE INICIAL ========== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Sede Inicial
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="site.name">
              Nombre de la Sede <span className="text-red-500">*</span>
            </Label>
            <Input
              id="site.name"
              name="site.name"
              defaultValue={initialData?.sites?.[0]?.name}
              placeholder="Sede Central Madrid"
              required
            />
          </div>

          <div>
            <Label htmlFor="site.deliveryWindow">Ventana de Entrega</Label>
            <Input
              id="site.deliveryWindow"
              name="site.deliveryWindow"
              defaultValue={initialData?.sites?.[0]?.deliveryWindow}
              placeholder="13:00-14:00"
              pattern="[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]"
            />
            <p className="mt-1 text-xs text-gray-500">
              Formato: HH:mm-HH:mm
            </p>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="site.address">
              Dirección <span className="text-red-500">*</span>
            </Label>
            <Input
              id="site.address"
              name="site.address"
              defaultValue={initialData?.sites?.[0]?.address}
              placeholder="Calle Gran Vía 1, 28013 Madrid"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Dirección física donde se entregarán los pedidos
            </p>
          </div>
        </div>
      </div>

      {/* ========== BOTONES ========== */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => window.history.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Guardando...'
            : initialData
              ? 'Guardar cambios'
              : 'Crear Empresa'}
        </Button>
      </div>
    </form>
  )
}

