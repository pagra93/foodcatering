/**
 * Lista de Incidencias con filtros
 * ♻️ Estructura reutilizada del portal de Admin (IncidentsTab)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Filter, Eye } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { INCIDENT_TYPES, SEVERITY_MAP, INCIDENT_STATUS_MAP } from '@/lib/db/queries/empresa-incidencias'

type IncidentsListProps = {
  incidents: Array<{
    id: string
    type: string
    severity: string
    status: string
    openedBy: string
    resolution: any
    compensation: number | null
    resolutionTime: number | null
    createdAt: Date
    order: {
      id: string
      serviceDate: Date
      employeeId: string
    } | null
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function IncidentsList({ incidents, pagination }: IncidentsListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Aplicar filtros (client-side para demo, idealmente server-side)
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      searchTerm === '' ||
      incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || incident.type === filterType
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus
    return matchesSearch && matchesType && matchesSeverity && matchesStatus
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listado de Incidencias</CardTitle>

        {/* Filtros */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro tipo */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.keys(INCIDENT_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {INCIDENT_TYPES[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro severidad */}
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="LOW">Baja</SelectItem>
              <SelectItem value="MEDIUM">Media</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro estado */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="OPEN">Abierta</SelectItem>
              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
              <SelectItem value="RESOLVED">Resuelta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIncidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell>
                  <Badge className={INCIDENT_TYPES[incident.type]?.color}>
                    {INCIDENT_TYPES[incident.type]?.label || incident.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">
                    {incident.resolution && typeof incident.resolution === 'object'
                      ? (incident.resolution as any).details || 'Sin detalles'
                      : 'Pendiente'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {incident.order ? `Pedido #${incident.order.id.slice(-8)}` : 'Sin pedido'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {incident.order?.employeeId || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {incident.order?.employeeId?.slice(-8) || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={SEVERITY_MAP[incident.severity as keyof typeof SEVERITY_MAP]?.badgeVariant}>
                    {SEVERITY_MAP[incident.severity as keyof typeof SEVERITY_MAP]?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={INCIDENT_STATUS_MAP[incident.status as keyof typeof INCIDENT_STATUS_MAP]?.badgeVariant}>
                    {INCIDENT_STATUS_MAP[incident.status as keyof typeof INCIDENT_STATUS_MAP]?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(incident.createdAt), 'dd/MM/yyyy', { locale: es })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <Link href={`/empresa/incidencias/${incident.id}`}>
                      <Eye className="mr-1 h-3 w-3" />
                      Ver
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredIncidents.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron incidencias
          </div>
        )}

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => router.push(`/empresa/incidencias?page=${pagination.page - 1}`)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => router.push(`/empresa/incidencias?page=${pagination.page + 1}`)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

