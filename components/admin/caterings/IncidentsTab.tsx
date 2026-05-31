/**
 * Tab de Incidencias para Caterings
 * Incluye: Cola de incidencias, Filtros, Tiempos de resolución, Compensaciones, SLA
 */

'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Euro,
  TrendingUp,
  Ban,
  Building2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Incident = {
  id: string
  type: string
  severity: string
  status: string
  company: string
  employee: string
  description: string
  reportedBy: string
  assignedTo: string | null
  compensation: number | null
  resolutionTime: number | null // En minutos
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
}

type IncidentsTabProps = {
  cateringId: string
}

// Datos mock para incidencias
const getMockIncidents = (): Incident[] => [
  {
    id: 'INC-2024-001',
    type: 'DELAYED_DELIVERY',
    severity: 'MEDIUM',
    status: 'OPEN',
    company: 'Tech Solutions',
    employee: 'Juan Pérez',
    description: 'Entrega retrasada 25 minutos. Empleado reporta que la comida llegó fría.',
    reportedBy: 'Juan Pérez',
    assignedTo: 'Admin Catering',
    compensation: null,
    resolutionTime: null,
    createdAt: new Date(Date.now() - 30 * 60000), // 30 min ago
    updatedAt: new Date(Date.now() - 30 * 60000),
    resolvedAt: null,
  },
  {
    id: 'INC-2024-002',
    type: 'MISSING_ITEM',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    company: 'StartupXYZ',
    employee: 'María García',
    description: 'Falta el postre en el pedido. Empleada solicita reembolso o reenvío.',
    reportedBy: 'María García',
    assignedTo: 'Admin Catering',
    compensation: 3.5,
    resolutionTime: null,
    createdAt: new Date(Date.now() - 45 * 60000), // 45 min ago
    updatedAt: new Date(Date.now() - 10 * 60000),
    resolvedAt: null,
  },
  {
    id: 'INC-2024-003',
    type: 'QUALITY_ISSUE',
    severity: 'CRITICAL',
    status: 'OPEN',
    company: 'Consulting Corp',
    employee: 'Pedro Martínez',
    description: 'Comida en mal estado. Posible intoxicación alimentaria. Requiere atención inmediata.',
    reportedBy: 'Pedro Martínez',
    assignedTo: null,
    compensation: null,
    resolutionTime: null,
    createdAt: new Date(Date.now() - 10 * 60000), // 10 min ago
    updatedAt: new Date(Date.now() - 10 * 60000),
    resolvedAt: null,
  },
  {
    id: 'INC-2024-004',
    type: 'WRONG_ORDER',
    severity: 'LOW',
    status: 'RESOLVED',
    company: 'Tech Solutions',
    employee: 'Ana López',
    description: 'Plato incorrecto entregado. Se envió pasta en lugar de ensalada.',
    reportedBy: 'Ana López',
    assignedTo: 'Admin Catering',
    compensation: 5.5,
    resolutionTime: 35,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60000), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60000 + 35 * 60000),
    resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60000 + 35 * 60000),
  },
  {
    id: 'INC-2024-005',
    type: 'ALLERGEN_ISSUE',
    severity: 'CRITICAL',
    status: 'RESOLVED',
    company: 'StartupXYZ',
    employee: 'Carlos Ruiz',
    description: 'Plato contenía frutos secos sin declarar. Empleado alérgico tuvo reacción leve.',
    reportedBy: 'Carlos Ruiz',
    assignedTo: 'Admin Catering',
    compensation: 20.0,
    resolutionTime: 120,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60000), // 5 days ago
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60000 + 120 * 60000),
    resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60000 + 120 * 60000),
  },
]

// Tipos de incidencia
const INCIDENT_TYPES: Record<string, { label: string; color: string }> = {
  DELAYED_DELIVERY: { label: '⏰ Entrega Retrasada', color: 'bg-yellow-100 text-yellow-800' },
  MISSING_ITEM: { label: '📦 Producto Faltante', color: 'bg-orange-100 text-orange-800' },
  WRONG_ORDER: { label: '❌ Pedido Incorrecto', color: 'bg-primary/10 text-primary' },
  QUALITY_ISSUE: { label: '⚠️ Problema de Calidad', color: 'bg-red-100 text-red-800' },
  ALLERGEN_ISSUE: { label: '🚨 Alérgeno No Declarado', color: 'bg-red-100 text-red-800' },
  DAMAGED_PACKAGING: { label: '📦 Empaquetado Dañado', color: 'bg-gray-100 text-gray-800' },
  OTHER: { label: '❓ Otro', color: 'bg-gray-100 text-gray-800' },
}

export function IncidentsTab({ cateringId: _cateringId }: IncidentsTabProps) {
  const incidents = getMockIncidents()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Filtrar incidencias
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (incident.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (incident.employee?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || incident.type === filterType
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus
    return matchesSearch && matchesType && matchesSeverity && matchesStatus
  })

  // Calcular KPIs
  const openIncidents = incidents.filter((i) => i.status === 'OPEN').length
  const inProgressIncidents = incidents.filter((i) => i.status === 'IN_PROGRESS').length
  const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED').length
  const avgResolutionTime = incidents
    .filter((i) => i.resolutionTime !== null)
    .reduce((sum, i) => sum + (i.resolutionTime || 0), 0) / 
    incidents.filter((i) => i.resolutionTime !== null).length || 0
  const totalCompensation = incidents
    .filter((i) => i.compensation !== null)
    .reduce((sum, i) => sum + (i.compensation || 0), 0)

  // Helper para obtener el color del badge según severidad
  const getSeverityColor = (severity: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    switch (severity) {
      case 'LOW':
        return 'secondary'
      case 'MEDIUM':
        return 'warning'
      case 'HIGH':
        return 'destructive'
      case 'CRITICAL':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getSeverityLabel = (severity: string): string => {
    const labels: Record<string, string> = {
      LOW: '🟢 Baja',
      MEDIUM: '🟡 Media',
      HIGH: '🔴 Alta',
      CRITICAL: '🚨 Crítica',
    }
    return labels[severity] || severity
  }

  // Helper para obtener el color del badge según estado
  const getStatusColor = (status: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'OPEN':
        return 'destructive'
      case 'IN_PROGRESS':
        return 'warning'
      case 'RESOLVED':
        return 'success'
      case 'REJECTED':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      OPEN: 'Abierta',
      IN_PROGRESS: 'En Progreso',
      RESOLVED: 'Resuelta',
      REJECTED: 'Rechazada',
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Gestión de Incidencias
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Cola de incidencias, tiempos de resolución y compensaciones
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Abiertas</p>
                <p className="text-2xl font-bold text-red-600">{openIncidents}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">En Progreso</p>
                <p className="text-2xl font-bold text-yellow-600">{inProgressIncidents}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Resueltas</p>
                <p className="text-2xl font-bold text-green-600">{resolvedIncidents}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Tiempo Medio</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(avgResolutionTime)}m</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Compensaciones</p>
                <p className="text-2xl font-bold text-gray-900">{totalCompensation.toFixed(2)}€</p>
              </div>
              <Euro className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por descripción, empresa o empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(INCIDENT_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las severidades</SelectItem>
                  <SelectItem value="LOW">🟢 Baja</SelectItem>
                  <SelectItem value="MEDIUM">🟡 Media</SelectItem>
                  <SelectItem value="HIGH">🔴 Alta</SelectItem>
                  <SelectItem value="CRITICAL">🚨 Crítica</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="OPEN">Abiertas</SelectItem>
                  <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                  <SelectItem value="RESOLVED">Resueltas</SelectItem>
                  <SelectItem value="REJECTED">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Incidencias */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-gray-500">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-3" />
              <p className="text-sm font-medium">No hay incidencias</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm || filterType !== 'all' || filterSeverity !== 'all' || filterStatus !== 'all'
                  ? 'Ajusta los filtros para ver más resultados'
                  : '¡Todo funcionando perfectamente! 🎉'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredIncidents.map((incident) => (
            <Card key={incident.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Contenido principal */}
                  <div className="flex-1">
                    {/* Header con badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {incident.id}
                      </span>
                      <Badge variant={getSeverityColor(incident.severity)}>
                        {getSeverityLabel(incident.severity)}
                      </Badge>
                      <Badge variant={getStatusColor(incident.status)}>
                        {getStatusLabel(incident.status)}
                      </Badge>
                      <Badge variant="outline" className={INCIDENT_TYPES[incident.type]?.color || ''}>
                        {INCIDENT_TYPES[incident.type]?.label || incident.type}
                      </Badge>
                    </div>

                    {/* Tipo de incidencia */}
                    <p className="text-sm text-gray-900 mb-3">
                      <span className="font-medium">Tipo:</span> {incident.type}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{incident.company}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>Reportado por {incident.employee}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          Hace {formatDistanceToNow(incident.createdAt, { locale: es })}
                        </span>
                      </div>
                      {incident.compensation && (
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <Euro className="h-3 w-3" />
                          <span>Compensación: {incident.compensation.toFixed(2)}€</span>
                        </div>
                      )}
                      {incident.resolvedAt && incident.resolutionTime && (
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Resuelto en {incident.resolutionTime}m</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </Button>
                    {incident.status !== 'RESOLVED' && incident.status !== 'REJECTED' && (
                      <Button variant="default" size="sm">
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* SLA y Escalado */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            SLA y Reglas de Escalado
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <Ban className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900">
                    🚨 Crítica: Resolución inmediata (&lt; 30 min)
                  </h4>
                  <p className="text-xs text-red-700 mt-1">
                    Escalado automático a supervisor si no se resuelve en 30 minutos.
                    Bloqueo de facturación hasta resolución.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-orange-900">
                    🔴 Alta: Resolución en 2 horas
                  </h4>
                  <p className="text-xs text-orange-700 mt-1">
                    Notificación a responsable si no hay progreso en 1 hora.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-900">
                    🟡 Media: Resolución en 24 horas
                  </h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    Seguimiento diario hasta resolución.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    🟢 Baja: Resolución en 48 horas
                  </h4>
                  <p className="text-xs text-gray-700 mt-1">
                    Gestión estándar, sin escalado automático.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

