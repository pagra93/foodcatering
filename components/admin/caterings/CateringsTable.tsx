/**
 * Tabla Específica de Caterings con Filtros Avanzados
 * Columnas: Estado, Zonas, Capacidad, SLAs, Documentos, Facturación, Comisión, Acciones
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  MapPin,
  TrendingUp,
  FileText,
  DollarSign,
  Eye,
  Edit,
  Power,
  UserCog,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type CateringListItem = {
  id: string
  name: string
  displayName: string
  status: 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW'
  zones: Array<{ name: string }>
  dailyCapacity: number
  punctuality: number | null
  incidentRate: number | null
  avgRating: number | null
  documentsStatus: 'OK' | 'EXPIRING' | 'EXPIRED'
  lastInvoiceDate: Date | null
  commission: number
}

type CateringsTableProps = {
  caterings: CateringListItem[]
}

// Ya no usamos datos mock - todo viene de la BD real

export function CateringsTable({ caterings }: CateringsTableProps) {
  // Siempre usar datos reales - no mock
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDocs, setFilterDocs] = useState<string>('all')
  const [filterSLA, setFilterSLA] = useState<string>('all')

  // Filtrar caterings
  const filteredCaterings = caterings.filter((catering) => {
    const matchesSearch =
      catering.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      catering.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || catering.status === filterStatus
    
    const matchesDocs = filterDocs === 'all' || catering.documentsStatus === filterDocs
    
    const matchesSLA =
      filterSLA === 'all' ||
      (filterSLA === 'good' && catering.punctuality && catering.punctuality >= 95) ||
      (filterSLA === 'warning' &&
        catering.punctuality &&
        catering.punctuality >= 90 &&
        catering.punctuality < 95) ||
      (filterSLA === 'bad' && catering.punctuality && catering.punctuality < 90)

    return matchesSearch && matchesStatus && matchesDocs && matchesSLA
  })

  // Helper para obtener badge de estado
  const getStatusBadge = (status: CateringListItem['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Activo
          </Badge>
        )
      case 'SUSPENDED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Suspendido
          </Badge>
        )
      case 'UNDER_REVIEW':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En Revisión
          </Badge>
        )
    }
  }

  // Helper para badge de documentos
  const getDocsBadge = (status: CateringListItem['documentsStatus']) => {
    switch (status) {
      case 'OK':
        return (
          <Badge variant="success" className="text-xs">
            ✓ Al día
          </Badge>
        )
      case 'EXPIRING':
        return (
          <Badge variant="warning" className="text-xs">
            ⚠ Caduca pronto
          </Badge>
        )
      case 'EXPIRED':
        return (
          <Badge variant="destructive" className="text-xs">
            ✕ Caducado
          </Badge>
        )
    }
  }

  // Helper para color de puntualidad
  const getPunctualityColor = (punctuality: number | null) => {
    if (!punctuality) return 'text-gray-400'
    if (punctuality >= 95) return 'text-green-600'
    if (punctuality >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar catering por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ACTIVE">Activos</SelectItem>
              <SelectItem value="SUSPENDED">Suspendidos</SelectItem>
              <SelectItem value="UNDER_REVIEW">En Revisión</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDocs} onValueChange={setFilterDocs}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Docs</SelectItem>
              <SelectItem value="OK">Al día</SelectItem>
              <SelectItem value="EXPIRING">Por caducar</SelectItem>
              <SelectItem value="EXPIRED">Caducados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSLA} onValueChange={setFilterSLA}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos SLA</SelectItem>
              <SelectItem value="good">≥ 95% ✓</SelectItem>
              <SelectItem value="warning">90-95% ⚠</SelectItem>
              <SelectItem value="bad">&lt; 90% ✕</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Catering</TableHead>
              <TableHead>Zonas</TableHead>
              <TableHead className="text-center">Capacidad</TableHead>
              <TableHead className="text-center">SLA (30d)</TableHead>
              <TableHead className="text-center">Documentos</TableHead>
              <TableHead className="text-right">Comisión</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCaterings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    No se encontraron caterings
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCaterings.map((catering) => (
                <TableRow key={catering.id} className="hover:bg-gray-50">
                  {/* Catering */}
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {catering.displayName}
                        </p>
                        {getStatusBadge(catering.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {catering.name}
                      </p>
                    </div>
                  </TableCell>

                  {/* Zonas */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {catering.zones.slice(0, 2).map((zone, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          {zone.name}
                        </Badge>
                      ))}
                      {catering.zones.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{catering.zones.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Capacidad */}
                  <TableCell className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {catering.dailyCapacity}
                    </p>
                    <p className="text-xs text-gray-500">pedidos/día</p>
                  </TableCell>

                  {/* SLA */}
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <p
                          className={`text-sm font-semibold ${getPunctualityColor(
                            catering.punctuality
                          )}`}
                        >
                          {catering.punctuality ? `${catering.punctuality}%` : '-'}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <AlertCircle className="h-3 w-3 text-gray-400" />
                        <p
                          className={`text-xs ${
                            catering.incidentRate && catering.incidentRate > 5
                              ? 'text-red-600'
                              : catering.incidentRate && catering.incidentRate > 2
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {catering.incidentRate ? `${catering.incidentRate}%` : '-'}
                        </p>
                      </div>
                      {catering.avgRating && (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <p className="text-xs text-gray-700 font-medium">
                            {catering.avgRating}
                          </p>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Documentos */}
                  <TableCell className="text-center">
                    {getDocsBadge(catering.documentsStatus)}
                  </TableCell>

                  {/* Comisión */}
                  <TableCell className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {catering.commission}%
                    </p>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Acciones
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/caterings/${catering.id}`}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/caterings/${catering.id}/edit`}
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserCog className="mr-2 h-4 w-4" />
                          Impersonar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {catering.status === 'ACTIVE' ? (
                          <DropdownMenuItem className="text-red-600">
                            <Power className="mr-2 h-4 w-4" />
                            Suspender
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-green-600">
                            <Power className="mr-2 h-4 w-4" />
                            Activar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resultados */}
      {filteredCaterings.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            Mostrando <strong>{filteredCaterings.length}</strong> de{' '}
            <strong>{caterings.length}</strong> caterings
          </p>
        </div>
      )}
    </div>
  )
}

