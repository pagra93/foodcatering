/**
 * Información Personal del Empleado
 * Vista de solo lectura (RRHH gestiona los datos)
 */

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  Hash,
  CheckCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AllergenSelector } from './AllergenSelector'

type ProfileInfoProps = {
  data: {
    employee: {
      id: string
      name: string
      email: string
      phone: string | null
      employeeNumber: string | null
      department: string | null
      position: string | null
      startDate: Date | null
      active: boolean
      memberSince: Date
      allergens: string[]
      blockAllergensEnabled: boolean
    }
    company: {
      name: string
      logoUrl: string | null
      dailyLimit: number
      monthlyLimit: number | null
    }
    site: {
      name: string
      address: string
      city: string
    } | null
  }
}

export function ProfileInfo({ data }: ProfileInfoProps) {
  const { employee, company, site } = data

  return (
    <div className="space-y-6">
      {/* Card Principal */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24">
            <AvatarFallback className="bg-blue-600 text-white text-2xl">
              {employee.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Info básica */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {employee.name}
                </h2>
                <p className="text-gray-600 mt-1">{employee.email}</p>
              </div>
              <Badge variant={employee.active ? 'default' : 'secondary'}>
                {employee.active ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Activo
                  </>
                ) : (
                  'Inactivo'
                )}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Teléfono */}
              {employee.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.phone}
                    </p>
                  </div>
                </div>
              )}

              {/* Nº Empleado */}
              {employee.employeeNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Nº Empleado</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.employeeNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* Departamento */}
              {employee.department && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Departamento</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.department}
                    </p>
                  </div>
                </div>
              )}

              {/* Puesto */}
              {employee.position && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Puesto</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.position}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employee.startDate && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Fecha de alta</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(employee.startDate), "d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Miembro desde</p>
              <p className="text-sm font-medium text-gray-900">
                {format(new Date(employee.memberSince), "d 'de' MMMM, yyyy", {
                  locale: es,
                })}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Card de Empresa */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Mi Empresa
        </h3>

        <div className="flex items-start gap-4">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          )}

          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{company.name}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <p className="text-xs text-gray-500">Límite diario</p>
                <p className="text-sm font-medium text-gray-900">
                  {company.dailyLimit.toFixed(2)}€
                </p>
              </div>

              {company.monthlyLimit && (
                <div>
                  <p className="text-xs text-gray-500">Límite mensual</p>
                  <p className="text-sm font-medium text-gray-900">
                    {company.monthlyLimit.toFixed(2)}€
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Card de Sede (si existe) */}
      {site && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Mi Sede
          </h3>

          <div className="space-y-2">
            <p className="font-medium text-gray-900">{site.name}</p>
            <p className="text-sm text-gray-600">{site.address}</p>
            <p className="text-sm text-gray-600">{site.city}</p>
          </div>
        </Card>
      )}

      {/* Selector de Alergias */}
      <AllergenSelector
        employeeId={employee.id}
        initialAllergens={employee.allergens}
        initialBlockEnabled={employee.blockAllergensEnabled}
      />

      {/* Nota informativa */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Si necesitas actualizar algún dato de tu perfil
          (nombre, departamento, puesto, etc.), contacta con el departamento de RRHH
          de tu empresa.
        </p>
      </Card>
    </div>
  )
}

