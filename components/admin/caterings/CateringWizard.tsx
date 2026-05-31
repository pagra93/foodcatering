/**
 * Wizard de Creación de Catering - 7 Pasos
 * Incluye: Validación, Guardado como borrador, Preview
 */

'use client'

import { useState } from 'react'
import {
  Building2,
  FileText,
  Shield,
  Settings,
  MapPin,
  DollarSign,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

// Tipos
type CateringFormData = {
  // Paso 1: Datos Generales
  name: string
  displayName: string
  contactEmail: string
  contactPhone: string
  primaryColor: string
  logoUrl: string

  // Paso 2: Datos Legales y Bancarios
  legalName: string
  cif: string
  billingAddress: string
  city: string
  postalCode: string
  country: string
  iban: string
  contactPerson: string

  // Paso 3: Documentación (se subirá posteriormente)
  documentsNotes: string

  // Paso 4: Configuración Operativa
  cutoffTime: string
  preparationWindow: string
  deliveryWindow: string
  dailyCapacity: number
  leadTimeMinutes: number
  operationalDays: string[]

  // Paso 5: Zonas de Servicio
  zones: Array<{
    name: string
    postalCodes: string
    maxDistance: number
    operator: string
  }>

  // Paso 6: Condiciones Económicas
  commission: number
  minimumBilling: number
  paymentCycle: string

  // Paso 7: Usuarios Iniciales
  initialUsers: Array<{
    name: string
    email: string
    role: string
  }>
}

const STEPS = [
  { id: 1, title: 'Datos Generales', icon: Building2 },
  { id: 2, title: 'Legal y Bancario', icon: FileText },
  { id: 3, title: 'Documentación', icon: Shield },
  { id: 4, title: 'Configuración Operativa', icon: Settings },
  { id: 5, title: 'Zonas de Servicio', icon: MapPin },
  { id: 6, title: 'Económico', icon: DollarSign },
  { id: 7, title: 'Usuarios y Revisión', icon: Users },
]

const DIAS_SEMANA = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
]

export function CateringWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CateringFormData>({
    name: '',
    displayName: '',
    contactEmail: '',
    contactPhone: '',
    primaryColor: '#3B82F6',
    logoUrl: '',
    legalName: '',
    cif: '',
    billingAddress: '',
    city: '',
    postalCode: '',
    country: 'España',
    iban: '',
    contactPerson: '',
    documentsNotes: '',
    cutoffTime: '11:00',
    preparationWindow: '11:00-13:00',
    deliveryWindow: '13:00-14:30',
    dailyCapacity: 200,
    leadTimeMinutes: 120,
    operationalDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    zones: [
      {
        name: 'Centro',
        postalCodes: '',
        maxDistance: 5,
        operator: 'Stuart',
      },
    ],
    commission: 5,
    minimumBilling: 1000,
    paymentCycle: 'MONTHLY',
    initialUsers: [
      {
        name: '',
        email: '',
        role: 'ADMIN',
      },
    ],
  })

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    console.log('Creando catering:', formData)
    // TODO: Llamar a la API para crear el catering
    alert('Catering creado con éxito (mock)')
  }

  const saveDraft = () => {
    console.log('Guardando borrador:', formData)
    alert('Borrador guardado (mock)')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Stepper */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        h-12 w-12 rounded-full flex items-center justify-center font-semibold transition-colors
                        ${
                          isActive
                            ? 'bg-primary text-white'
                            : isCompleted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive
                          ? 'text-primary'
                          : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 rounded transition-colors ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const step = STEPS[currentStep - 1]
              if (!step) return null
              const Icon = step.icon
              return <Icon className="h-5 w-5 text-primary" />
            })()}
            Paso {currentStep}: {STEPS[currentStep - 1]?.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Paso 1: Datos Generales */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nombre del Tenant <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="nombre-catering"
                  />
                  <p className="text-xs text-gray-500">
                    Identificador único (solo minúsculas y guiones)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">
                    Nombre Comercial <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => updateFormData('displayName', e.target.value)}
                    placeholder="Catering Delicious"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">
                    Email de Contacto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => updateFormData('contactEmail', e.target.value)}
                    placeholder="contacto@catering.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">
                    Teléfono de Contacto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => updateFormData('contactPhone', e.target.value)}
                    placeholder="+34 912 345 678"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Color Principal (Branding)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL del Logo (opcional)</Label>
                  <Input
                    id="logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => updateFormData('logoUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Legal y Bancario */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legalName">
                    Razón Social <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="legalName"
                    value={formData.legalName}
                    onChange={(e) => updateFormData('legalName', e.target.value)}
                    placeholder="Catering Delicious S.L."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cif">
                    CIF/NIF <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cif"
                    value={formData.cif}
                    onChange={(e) => updateFormData('cif', e.target.value)}
                    placeholder="B12345678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingAddress">
                  Domicilio Fiscal <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billingAddress"
                  value={formData.billingAddress}
                  onChange={(e) => updateFormData('billingAddress', e.target.value)}
                  placeholder="Calle Principal 123, 4º A"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad <span className="text-red-500">*</span></Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                    placeholder="Madrid"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">
                    Código Postal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => updateFormData('postalCode', e.target.value)}
                    placeholder="28001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateFormData('country', e.target.value)}
                    disabled
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="iban">
                    IBAN <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => updateFormData('iban', e.target.value)}
                    placeholder="ES91 2100 0418 4502 0005 1332"
                  />
                  <p className="text-xs text-gray-500">
                    Para domiciliación de pagos y liquidaciones
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">
                    Persona de Contacto Legal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => updateFormData('contactPerson', e.target.value)}
                    placeholder="Juan Pérez (Director General)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Documentación */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-primary">
                      Documentación Sanitaria Requerida
                    </h4>
                    <p className="text-xs text-primary mt-1">
                      Una vez creado el catering, podrás subir los siguientes documentos
                      desde la pestaña "Calidad & Cumplimiento":
                    </p>
                    <ul className="mt-2 text-xs text-primary space-y-1">
                      <li>• Registro Sanitario (obligatorio)</li>
                      <li>• Seguro de Responsabilidad Civil (obligatorio)</li>
                      <li>• Certificado APPCC (obligatorio)</li>
                      <li>• Certificados de manipuladores de alimentos</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentsNotes">
                  Notas sobre Documentación (opcional)
                </Label>
                <Textarea
                  id="documentsNotes"
                  value={formData.documentsNotes}
                  onChange={(e) => updateFormData('documentsNotes', e.target.value)}
                  placeholder="Ej: Los certificados están en proceso de renovación, fecha estimada 15/12/2024"
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Cualquier información adicional sobre el estado de la documentación
                </p>
              </div>
            </div>
          )}

          {/* Paso 4: Configuración Operativa */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cutoffTime">
                    Hora de Corte (Cutoff) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cutoffTime"
                    type="time"
                    value={formData.cutoffTime}
                    onChange={(e) => updateFormData('cutoffTime', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Hora límite para realizar pedidos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preparationWindow">Ventana de Preparación</Label>
                  <Input
                    id="preparationWindow"
                    value={formData.preparationWindow}
                    onChange={(e) => updateFormData('preparationWindow', e.target.value)}
                    placeholder="11:00-13:00"
                  />
                  <p className="text-xs text-gray-500">Tiempo de cocina</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryWindow">Ventana de Entrega</Label>
                  <Input
                    id="deliveryWindow"
                    value={formData.deliveryWindow}
                    onChange={(e) => updateFormData('deliveryWindow', e.target.value)}
                    placeholder="13:00-14:30"
                  />
                  <p className="text-xs text-gray-500">Horario de reparto</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dailyCapacity">
                    Capacidad Diaria (pedidos) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dailyCapacity"
                    type="number"
                    value={formData.dailyCapacity}
                    onChange={(e) =>
                      updateFormData('dailyCapacity', parseInt(e.target.value))
                    }
                    min={0}
                  />
                  <p className="text-xs text-gray-500">
                    Máximo de pedidos que puede preparar por día
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadTimeMinutes">Lead Time (minutos)</Label>
                  <Input
                    id="leadTimeMinutes"
                    type="number"
                    value={formData.leadTimeMinutes}
                    onChange={(e) =>
                      updateFormData('leadTimeMinutes', parseInt(e.target.value))
                    }
                    min={0}
                  />
                  <p className="text-xs text-gray-500">
                    Tiempo mínimo de anticipación para pedidos
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Días Operativos <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={dia.value}
                        checked={formData.operationalDays.includes(dia.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFormData('operationalDays', [
                              ...formData.operationalDays,
                              dia.value,
                            ])
                          } else {
                            updateFormData(
                              'operationalDays',
                              formData.operationalDays.filter((d) => d !== dia.value)
                            )
                          }
                        }}
                      />
                      <Label htmlFor={dia.value} className="cursor-pointer">
                        {dia.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paso 5: Zonas de Servicio */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  Define las zonas geográficas donde el catering puede realizar entregas.
                  Puedes agregar múltiples zonas con diferentes operadores logísticos.
                </p>
              </div>

              {formData.zones.map((zone, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Zona {index + 1}</span>
                      {formData.zones.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newZones = formData.zones.filter((_, i) => i !== index)
                            updateFormData('zones', newZones)
                          }}
                        >
                          Eliminar
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nombre de la Zona</Label>
                        <Input
                          value={zone.name}
                          onChange={(e) => {
                            const newZones = [...formData.zones]
                            const current = newZones[index]
                            if (!current) return
                            current.name = e.target.value
                            updateFormData('zones', newZones)
                          }}
                          placeholder="Centro, Norte, Sur..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Operador Logístico</Label>
                        <Select
                          value={zone.operator}
                          onValueChange={(value) => {
                            const newZones = [...formData.zones]
                            const current = newZones[index]
                            if (!current) return
                            current.operator = value
                            updateFormData('zones', newZones)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Stuart">Stuart</SelectItem>
                            <SelectItem value="Paack">Paack</SelectItem>
                            <SelectItem value="Glovo">Glovo</SelectItem>
                            <SelectItem value="Propio">Flota Propia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Códigos Postales (separados por coma)</Label>
                        <Textarea
                          value={zone.postalCodes}
                          onChange={(e) => {
                            const newZones = [...formData.zones]
                            const current = newZones[index]
                            if (!current) return
                            current.postalCodes = e.target.value
                            updateFormData('zones', newZones)
                          }}
                          placeholder="28001, 28002, 28003..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Distancia Máxima (km)</Label>
                        <Input
                          type="number"
                          value={zone.maxDistance}
                          onChange={(e) => {
                            const newZones = [...formData.zones]
                            const current = newZones[index]
                            if (!current) return
                            current.maxDistance = parseInt(e.target.value)
                            updateFormData('zones', newZones)
                          }}
                          min={0}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={() => {
                  updateFormData('zones', [
                    ...formData.zones,
                    {
                      name: '',
                      postalCodes: '',
                      maxDistance: 5,
                      operator: 'Stuart',
                    },
                  ])
                }}
                className="w-full"
              >
                + Agregar Zona
              </Button>
            </div>
          )}

          {/* Paso 6: Económico */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commission">
                    Comisión (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="commission"
                    type="number"
                    value={formData.commission}
                    onChange={(e) =>
                      updateFormData('commission', parseFloat(e.target.value))
                    }
                    min={0}
                    max={100}
                    step={0.1}
                  />
                  <p className="text-xs text-gray-500">
                    Porcentaje que se cobra por cada pedido gestionado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumBilling">Facturación Mínima Mensual (€)</Label>
                  <Input
                    id="minimumBilling"
                    type="number"
                    value={formData.minimumBilling}
                    onChange={(e) =>
                      updateFormData('minimumBilling', parseFloat(e.target.value))
                    }
                    min={0}
                  />
                  <p className="text-xs text-gray-500">
                    Importe mínimo de facturación mensual (opcional)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentCycle">
                  Ciclo de Pago <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.paymentCycle}
                  onValueChange={(value) => updateFormData('paymentCycle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Semanal (cada 7 días)</SelectItem>
                    <SelectItem value="BIWEEKLY">Quincenal (cada 15 días)</SelectItem>
                    <SelectItem value="MONTHLY">Mensual (cada 30 días)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Frecuencia de liquidación de pagos al catering
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">
                      Condiciones Económicas Estimadas
                    </h4>
                    <div className="mt-2 space-y-1 text-xs text-green-700">
                      <p>
                        • Comisión por pedido: <strong>{formData.commission}%</strong>
                      </p>
                      <p>
                        • Facturación mínima: <strong>{formData.minimumBilling} €/mes</strong>
                      </p>
                      <p>
                        • Frecuencia de pago:{' '}
                        <strong>
                          {formData.paymentCycle === 'WEEKLY'
                            ? 'Semanal'
                            : formData.paymentCycle === 'BIWEEKLY'
                            ? 'Quincenal'
                            : 'Mensual'}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 7: Usuarios y Revisión */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-primary">
                      Usuarios Iniciales del Catering
                    </h4>
                    <p className="text-xs text-primary mt-1">
                      Define los usuarios que tendrán acceso al panel del catering.
                      Podrás agregar más usuarios posteriormente.
                    </p>
                  </div>
                </div>
              </div>

              {formData.initialUsers.map((user, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Usuario {index + 1}</span>
                      {formData.initialUsers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newUsers = formData.initialUsers.filter(
                              (_, i) => i !== index
                            )
                            updateFormData('initialUsers', newUsers)
                          }}
                        >
                          Eliminar
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nombre Completo</Label>
                        <Input
                          value={user.name}
                          onChange={(e) => {
                            const newUsers = [...formData.initialUsers]
                            const current = newUsers[index]
                            if (!current) return
                            current.name = e.target.value
                            updateFormData('initialUsers', newUsers)
                          }}
                          placeholder="Juan Pérez"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={user.email}
                          onChange={(e) => {
                            const newUsers = [...formData.initialUsers]
                            const current = newUsers[index]
                            if (!current) return
                            current.email = e.target.value
                            updateFormData('initialUsers', newUsers)
                          }}
                          placeholder="juan@catering.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <Select
                        value={user.role}
                        onValueChange={(value) => {
                          const newUsers = [...formData.initialUsers]
                          const current = newUsers[index]
                          if (!current) return
                          current.role = value
                          updateFormData('initialUsers', newUsers)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="CHEF">Chef</SelectItem>
                          <SelectItem value="KITCHEN">Cocina</SelectItem>
                          <SelectItem value="DELIVERY">Reparto</SelectItem>
                          <SelectItem value="FINANCE">Finanzas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={() => {
                  updateFormData('initialUsers', [
                    ...formData.initialUsers,
                    {
                      name: '',
                      email: '',
                      role: 'ADMIN',
                    },
                  ])
                }}
                className="w-full"
              >
                + Agregar Usuario
              </Button>

              {/* Resumen Final */}
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Resumen del Catering
                </h4>

                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-gray-500">Nombre Comercial</p>
                    <p className="font-medium text-gray-900">
                      {formData.displayName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Razón Social</p>
                    <p className="font-medium text-gray-900">
                      {formData.legalName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">CIF</p>
                    <p className="font-medium text-gray-900">{formData.cif || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">
                      {formData.contactEmail || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Capacidad Diaria</p>
                    <p className="font-medium text-gray-900">
                      {formData.dailyCapacity} pedidos
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Hora de Corte</p>
                    <p className="font-medium text-gray-900">{formData.cutoffTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Comisión</p>
                    <p className="font-medium text-gray-900">{formData.commission}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Zonas de Servicio</p>
                    <p className="font-medium text-gray-900">
                      {formData.zones.length} zona(s)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.operationalDays.map((day) => {
                    const dia = DIAS_SEMANA.find((d) => d.value === day)
                    return (
                      <Badge key={day} variant="secondary">
                        {dia?.label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={saveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Borrador
          </Button>

          {currentStep < 7 ? (
            <Button onClick={nextStep}>
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Crear Catering
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

