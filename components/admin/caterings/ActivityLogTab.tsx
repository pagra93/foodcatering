/**
 * Tab de Registro de Actividad (Audit Log) para Caterings
 * Incluye: Timeline de acciones, Filtros, Búsqueda, Exportación, Trazabilidad legal
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FileText,
  Search,
  Download,
  Filter,
  Calendar,
  User,
  Activity,
  Edit,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Upload,
  Settings,
  Shield,
  DollarSign,
  Package,
  Users,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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

type AuditLogEntry = {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: string
  category: 'MENU' | 'DOCUMENTO' | 'USUARIO' | 'CONFIGURACION' | 'PEDIDO' | 'FACTURA' | 'INCIDENCIA'
  description: string
  changes?: {
    field: string
    before: string
    after: string
  }[]
  metadata?: {
    ipAddress?: string
    userAgent?: string
    affectedEntity?: string
  }
}

type ActivityLogTabProps = {
  cateringId: string
}

// Datos mock para demostración
const getMockAuditLog = (): AuditLogEntry[] => [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1 * 60 * 60000), // 1 hour ago
    userId: 'admin-1',
    userName: 'Carlos Martínez',
    action: 'UPDATED_MENU',
    category: 'MENU',
    description: 'Actualizó el menú del día 20/11/2024',
    changes: [
      { field: 'Primer plato', before: 'Ensalada César', after: 'Ensalada Mixta' },
      { field: 'Precio', before: '9.50 €', after: '10.00 €' },
    ],
    metadata: {
      ipAddress: '192.168.1.100',
      affectedEntity: 'Menú #1234',
    },
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 3 * 60 * 60000), // 3 hours ago
    userId: 'admin-1',
    userName: 'Carlos Martínez',
    action: 'UPLOADED_DOCUMENT',
    category: 'DOCUMENTO',
    description: 'Subió nuevo certificado de manipuladores de alimentos',
    changes: [
      { field: 'Documento', before: 'Sin documento', after: 'certificado_manipuladores_2024.pdf' },
      { field: 'Fecha caducidad', before: '-', after: '15/12/2025' },
    ],
    metadata: {
      ipAddress: '192.168.1.100',
      affectedEntity: 'Documento FOOD_HANDLER',
    },
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 5 * 60 * 60000), // 5 hours ago
    userId: 'chef-2',
    userName: 'Ana García',
    action: 'CREATED_DISH',
    category: 'MENU',
    description: 'Creó nuevo plato: Pollo al curry con arroz basmati',
    changes: [
      { field: 'Nombre', before: '-', after: 'Pollo al curry con arroz basmati' },
      { field: 'Curso', before: '-', after: 'Segundo plato' },
      { field: 'Precio base', before: '-', after: '8.50 €' },
      { field: 'Alérgenos', before: '-', after: 'Gluten, Lácteos' },
    ],
    metadata: {
      affectedEntity: 'Plato #567',
    },
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 8 * 60 * 60000), // 8 hours ago
    userId: 'admin-1',
    userName: 'Carlos Martínez',
    action: 'CREATED_USER',
    category: 'USUARIO',
    description: 'Creó nuevo usuario: María Ruiz (Reparto)',
    changes: [
      { field: 'Nombre', before: '-', after: 'María Ruiz' },
      { field: 'Email', before: '-', after: 'maria@catering.com' },
      { field: 'Rol', before: '-', after: 'DELIVERY' },
      { field: 'MFA', before: '-', after: 'Desactivado' },
    ],
    metadata: {
      affectedEntity: 'Usuario #789',
    },
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 12 * 60 * 60000), // 12 hours ago
    userId: 'admin-1',
    userName: 'Carlos Martínez',
    action: 'UPDATED_CONFIG',
    category: 'CONFIGURACION',
    description: 'Actualizó configuración operativa del catering',
    changes: [
      { field: 'Hora de corte (cutoff)', before: '10:30', after: '11:00' },
      { field: 'Capacidad diaria', before: '150 pedidos', after: '200 pedidos' },
      { field: 'Ventana de entrega', before: '13:00-14:00', after: '13:00-14:30' },
    ],
    metadata: {
      ipAddress: '192.168.1.100',
    },
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 24 * 60 * 60000), // 1 day ago
    userId: 'finance-3',
    userName: 'Juan Fernández',
    action: 'GENERATED_INVOICE',
    category: 'FACTURA',
    description: 'Generó factura mensual para Empresa TechCorp',
    changes: [
      { field: 'Periodo', before: '-', after: 'Octubre 2024' },
      { field: 'Total pedidos', before: '-', after: '450 pedidos' },
      { field: 'Importe', before: '-', after: '4,275.00 €' },
      { field: 'Comisión', before: '-', after: '213.75 € (5%)' },
    ],
    metadata: {
      affectedEntity: 'Factura #2024-10-001',
    },
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 36 * 60 * 60000), // 1.5 days ago
    userId: 'admin-1',
    userName: 'Carlos Martínez',
    action: 'RESOLVED_INCIDENT',
    category: 'INCIDENCIA',
    description: 'Resolvió incidencia: Entrega retrasada 30 minutos',
    changes: [
      { field: 'Estado', before: 'OPEN', after: 'RESOLVED' },
      { field: 'Compensación', before: '-', after: 'Descuento 20% próximo pedido' },
      { field: 'Resuelto por', before: '-', after: 'Carlos Martínez' },
    ],
    metadata: {
      affectedEntity: 'Incidencia #INC-2024-234',
    },
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 48 * 60 * 60000), // 2 days ago
    userId: 'chef-2',
    userName: 'Ana García',
    action: 'DEACTIVATED_DISH',
    category: 'MENU',
    description: 'Desactivó plato: Lentejas estofadas (sin stock)',
    changes: [
      { field: 'Estado', before: 'Activo', after: 'Inactivo' },
      { field: 'Motivo', before: '-', after: 'Sin stock disponible' },
    ],
    metadata: {
      affectedEntity: 'Plato #234',
    },
  },
]

// Configuración de categorías
const CATEGORIES = {
  MENU: { label: 'Menús & Platos', icon: Package, color: 'bg-orange-100 text-orange-800 border-orange-300' },
  DOCUMENTO: { label: 'Documentos', icon: FileText, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  USUARIO: { label: 'Usuarios', icon: Users, color: 'bg-purple-100 text-purple-800 border-purple-300' },
  CONFIGURACION: { label: 'Configuración', icon: Settings, color: 'bg-gray-100 text-gray-800 border-gray-300' },
  PEDIDO: { label: 'Pedidos', icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-300' },
  FACTURA: { label: 'Facturas', icon: DollarSign, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  INCIDENCIA: { label: 'Incidencias', icon: AlertCircle, color: 'bg-red-100 text-red-800 border-red-300' },
}

// Iconos por tipo de acción
const getActionIcon = (action: string) => {
  if (action.includes('CREATED')) return Plus
  if (action.includes('UPDATED')) return Edit
  if (action.includes('DELETED') || action.includes('DEACTIVATED')) return Trash2
  if (action.includes('UPLOADED')) return Upload
  if (action.includes('RESOLVED')) return CheckCircle2
  if (action.includes('GENERATED')) return FileText
  return Activity
}

export function ActivityLogTab({ cateringId }: ActivityLogTabProps) {
  const logs = getMockAuditLog()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // Obtener usuarios únicos para filtro
  const uniqueUsers = Array.from(new Set(logs.map((log) => log.userName)))

  // Filtrar logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || log.category === filterCategory
    const matchesUser = filterUser === 'all' || log.userName === filterUser
    return matchesSearch && matchesCategory && matchesUser
  })

  // KPIs
  const totalActions = logs.length
  const actionsLast24h = logs.filter(
    (log) => log.timestamp > new Date(Date.now() - 24 * 60 * 60000)
  ).length
  const uniqueUsersCount = uniqueUsers.length

  // Exportar logs
  const handleExport = (format: 'CSV' | 'JSON') => {
    const data = filteredLogs.map((log) => ({
      fecha: format(log.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: es }),
      usuario: log.userName,
      accion: log.action,
      categoria: log.category,
      descripcion: log.description,
      cambios: log.changes?.map((c) => `${c.field}: ${c.before} → ${c.after}`).join('; '),
      ip: log.metadata?.ipAddress || '-',
    }))

    if (format === 'JSON') {
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
    } else {
      // CSV
      const csv = [
        'Fecha,Usuario,Acción,Categoría,Descripción,Cambios,IP',
        ...data.map((row) =>
          [
            row.fecha,
            row.usuario,
            row.accion,
            row.categoria,
            row.descripcion,
            row.cambios || '',
            row.ip,
          ]
            .map((cell) => `"${cell}"`)
            .join(',')
        ),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Registro de Actividad
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Trazabilidad completa de todas las acciones realizadas en el catering
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('CSV')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('JSON')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Acciones</p>
                <p className="text-2xl font-bold text-gray-900">{totalActions}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Últimas 24h</p>
                <p className="text-2xl font-bold text-green-600">{actionsLast24h}</p>
              </div>
              <Clock className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
                <p className="text-2xl font-bold text-purple-600">{uniqueUsersCount}</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Resultados</p>
                <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
              </div>
              <Filter className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info de Compliance */}
      <Card className="border-0 shadow-sm bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900">
                Trazabilidad Legal y Compliance
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                Todos los registros se almacenan de forma inmutable y cifrada cumpliendo con GDPR,
                LOPD y normativa fiscal española (4 años de retención). Los logs incluyen timestamps,
                IP de origen, y diff completo de cambios para auditorías.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros y Búsqueda */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por acción, usuario o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Logs */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">
            Timeline de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">
                No se encontraron registros con los filtros aplicados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => {
                const CategoryIcon = CATEGORIES[log.category].icon
                const ActionIcon = getActionIcon(log.action)
                const isExpanded = expandedLog === log.id

                return (
                  <div
                    key={log.id}
                    className={`relative ${
                      index !== filteredLogs.length - 1 ? 'pb-4' : ''
                    }`}
                  >
                    {/* Línea vertical */}
                    {index !== filteredLogs.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-0.5 bg-gray-200" />
                    )}

                    {/* Contenido del log */}
                    <div className="flex gap-4">
                      {/* Icono de categoría */}
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${CATEGORIES[log.category].color}`}
                      >
                        <CategoryIcon className="h-4 w-4" />
                      </div>

                      {/* Info del log */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={CATEGORIES[log.category].color}
                              >
                                {CATEGORIES[log.category].label}
                              </Badge>
                              <span className="text-sm font-medium text-gray-900">
                                {log.userName}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">
                              {log.description}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(log.timestamp, "dd/MM/yyyy 'a las' HH:mm", {
                                  locale: es,
                                })}
                              </span>
                              {log.metadata?.ipAddress && (
                                <span>IP: {log.metadata.ipAddress}</span>
                              )}
                              {log.metadata?.affectedEntity && (
                                <span>{log.metadata.affectedEntity}</span>
                              )}
                            </div>
                          </div>

                          {/* Botón expandir/contraer */}
                          {log.changes && log.changes.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedLog(isExpanded ? null : log.id)
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Cambios (diff) */}
                        {isExpanded && log.changes && log.changes.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <ActionIcon className="h-3 w-3" />
                              Cambios realizados
                            </h5>
                            <div className="space-y-2">
                              {log.changes.map((change, i) => (
                                <div
                                  key={i}
                                  className="text-xs font-mono bg-white p-2 rounded border border-gray-200"
                                >
                                  <div className="font-semibold text-gray-700 mb-1">
                                    {change.field}:
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-600 line-through">
                                      {change.before}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 font-semibold">
                                      {change.after}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

