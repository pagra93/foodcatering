'use client'

/**
 * Componente: Tabla de Empresas
 * Lista completa de empresas con filtros, búsqueda y acciones
 * Usa: shadcn/ui Table, Input, Select, Badge, Button, DropdownMenu
 */

import { useState } from 'react'
import Link from 'next/link'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Edit, 
  UserPlus, 
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

type Company = {
  id: string
  name: string
  subdomain: string
  status: string
  company: {
    id: string
    legalName: string
    cif: string
    plan: string
    sector: string | null
  }
  policy: {
    cutoffTime: string
    limitPerDay: number
    daysActive: any
  } | null
  sites: number
  employees: {
    total: number
    active: number
    adoptionRate: number
  }
  orders: {
    last30Days: number
  }
  incidents: {
    open: number
  }
  catering: {
    tenantId: string
  } | null
  alerts: {
    deductibilityIssue: boolean
    lowAdoption: boolean
    highIncidents: boolean
  }
  createdAt: Date
}

type Props = {
  companies: Company[]
}

export function CompaniesTable({ companies }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterAlerts, setFilterAlerts] = useState<string>('all')

  // Filtrar empresas
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.company.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.company.sector?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || company.status === filterStatus
    const matchesPlan = filterPlan === 'all' || company.company.plan === filterPlan
    
    const matchesAlerts = 
      filterAlerts === 'all' ||
      (filterAlerts === 'with_alerts' && (
        company.alerts.deductibilityIssue ||
        company.alerts.lowAdoption ||
        company.alerts.highIncidents
      ))

    return matchesSearch && matchesStatus && matchesPlan && matchesAlerts
  })

  // Helper: Badge de estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Activa</Badge>
      case 'SUSPENDED':
        return <Badge variant="destructive">Suspendida</Badge>
      case 'UNDER_REVIEW':
        return <Badge variant="secondary">En revisión</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  // Helper: Badge de plan
  const getPlanBadge = (plan: string) => {
    const colors = {
      STARTER: 'bg-gray-100 text-gray-700',
      GROWTH: 'bg-blue-100 text-blue-700',
      ENTERPRISE: 'bg-purple-100 text-purple-700',
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-700'}`}>
        {plan}
      </span>
    )
  }

  // Helper: Badge de adopción
  const getAdoptionBadge = (rate: number) => {
    if (rate >= 70) return <Badge variant="success">{rate}%</Badge>
    if (rate >= 50) return <Badge variant="default">{rate}%</Badge>
    if (rate >= 30) return <Badge variant="secondary">{rate}%</Badge>
    return <Badge variant="destructive">{rate}%</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, CIF o sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ACTIVE">Activas</SelectItem>
              <SelectItem value="SUSPENDED">Suspendidas</SelectItem>
              <SelectItem value="UNDER_REVIEW">En revisión</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos planes</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="GROWTH">Growth</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAlerts} onValueChange={setFilterAlerts}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Alertas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="with_alerts">Con alertas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Empresa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Sedes</TableHead>
              <TableHead className="text-right">Empleados</TableHead>
              <TableHead className="text-right">Adopción</TableHead>
              <TableHead className="text-right">Pedidos 30d</TableHead>
              <TableHead className="text-right">Incidencias</TableHead>
              <TableHead>Alertas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-gray-500">
                  No se encontraron empresas
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  {/* Empresa */}
                  <TableCell>
                    <div>
                      <Link
                        href={`/admin/empresas/${company.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {company.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {company.company.cif}
                        {company.company.sector && ` • ${company.company.sector}`}
                      </p>
                    </div>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>{getStatusBadge(company.status)}</TableCell>

                  {/* Plan */}
                  <TableCell>{getPlanBadge(company.company.plan)}</TableCell>

                  {/* Sedes */}
                  <TableCell className="text-right text-gray-900">
                    {company.sites}
                  </TableCell>

                  {/* Empleados */}
                  <TableCell className="text-right">
                    <div className="text-sm text-gray-900">{company.employees.total}</div>
                    <div className="text-xs text-gray-500">
                      {company.employees.active} activos
                    </div>
                  </TableCell>

                  {/* Adopción */}
                  <TableCell className="text-right">
                    {getAdoptionBadge(company.employees.adoptionRate)}
                  </TableCell>

                  {/* Pedidos 30d */}
                  <TableCell className="text-right text-gray-900">
                    {company.orders.last30Days}
                  </TableCell>

                  {/* Incidencias */}
                  <TableCell className="text-right">
                    {company.incidents.open > 0 ? (
                      <Badge variant="destructive">{company.incidents.open}</Badge>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </TableCell>

                  {/* Alertas */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {company.alerts.deductibilityIssue && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>&gt; 11€</span>
                        </div>
                      )}
                      {company.alerts.lowAdoption && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Baja adopción</span>
                        </div>
                      )}
                      {company.alerts.highIncidents && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Incidencias</span>
                        </div>
                      )}
                      {!company.alerts.deductibilityIssue &&
                        !company.alerts.lowAdoption &&
                        !company.alerts.highIncidents && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>OK</span>
                          </div>
                        )}
                    </div>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/empresas/${company.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/empresas/${company.id}/edit`} className="flex items-center">
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Invitar empleados
                        </DropdownMenuItem>
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
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Mostrando <span className="font-medium text-gray-900">{filteredCompanies.length}</span>{' '}
          de <span className="font-medium text-gray-900">{companies.length}</span> empresas
        </div>
      </div>
    </div>
  )
}

