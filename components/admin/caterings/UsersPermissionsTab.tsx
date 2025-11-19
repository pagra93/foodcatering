/**
 * Tab de Usuarios & Permisos para Caterings
 * Incluye: Lista de usuarios, Roles, MFA, Últimos accesos, Impersonación
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Users,
  Plus,
  Search,
  Edit,
  Shield,
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  UserCog,
  Mail,
  Phone,
  AlertCircle,
  Lock,
  Unlock,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type User = {
  id: string
  name: string
  email: string
  role: string
  mfaEnabled: boolean
  status: string
  lastLoginAt: Date | null
  createdAt: Date
}

type UsersPermissionsTabProps = {
  users: User[]
  cateringId: string
}

// Roles disponibles para caterings
const CATERING_ROLES: Record<string, { label: string; description: string; color: string }> = {
  ADMIN: {
    label: 'Administrador',
    description: 'Acceso completo a toda la gestión del catering',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  CHEF: {
    label: 'Chef',
    description: 'Gestión de menús, platos y programación semanal',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  KITCHEN: {
    label: 'Cocina',
    description: 'Visualización de hojas de cocina y preparación',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  DELIVERY: {
    label: 'Reparto',
    description: 'Gestión de logística y entregas',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  FINANCE: {
    label: 'Finanzas',
    description: 'Acceso a facturación, liquidaciones y reportes',
    color: 'bg-green-100 text-green-800 border-green-300',
  },
}

// Datos mock para usuarios
const getMockUsers = (): User[] => [
  {
    id: '1',
    name: 'Carlos Martínez',
    email: 'carlos@catering.com',
    role: 'ADMIN',
    mfaEnabled: true,
    status: 'ACTIVE',
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Ana García',
    email: 'ana@catering.com',
    role: 'CHEF',
    mfaEnabled: true,
    status: 'ACTIVE',
    lastLoginAt: new Date(Date.now() - 5 * 60 * 60000), // 5 hours ago
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '3',
    name: 'Pedro López',
    email: 'pedro@catering.com',
    role: 'KITCHEN',
    mfaEnabled: false,
    status: 'ACTIVE',
    lastLoginAt: new Date(Date.now() - 24 * 60 * 60000), // 1 day ago
    createdAt: new Date('2024-03-10'),
  },
  {
    id: '4',
    name: 'María Ruiz',
    email: 'maria@catering.com',
    role: 'DELIVERY',
    mfaEnabled: false,
    status: 'ACTIVE',
    lastLoginAt: new Date(Date.now() - 3 * 60 * 60000), // 3 hours ago
    createdAt: new Date('2024-04-05'),
  },
  {
    id: '5',
    name: 'Juan Fernández',
    email: 'juan@catering.com',
    role: 'FINANCE',
    mfaEnabled: true,
    status: 'ACTIVE',
    lastLoginAt: new Date(Date.now() - 10 * 60 * 60000), // 10 hours ago
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '6',
    name: 'Laura Sánchez',
    email: 'laura@catering.com',
    role: 'KITCHEN',
    mfaEnabled: false,
    status: 'INACTIVE',
    lastLoginAt: new Date(Date.now() - 30 * 24 * 60 * 60000), // 30 days ago
    createdAt: new Date('2023-11-15'),
  },
]

export function UsersPermissionsTab({ users: propUsers, cateringId }: UsersPermissionsTabProps) {
  const users = propUsers.length > 0 ? propUsers : getMockUsers()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  // Calcular KPIs
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length
  const mfaEnabledUsers = users.filter((u) => u.mfaEnabled).length
  const mfaPercentage = totalUsers > 0 ? ((mfaEnabledUsers / totalUsers) * 100).toFixed(0) : 0

  // Helper para obtener info del rol
  const getRoleInfo = (role: string) => {
    return CATERING_ROLES[role] || {
      label: role,
      description: '',
      color: 'bg-gray-100 text-gray-800',
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Usuarios & Permisos
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de usuarios del catering, roles y seguridad
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Activos</p>
                <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">MFA Activado</p>
                <p className="text-2xl font-bold text-purple-600">
                  {mfaEnabledUsers}/{totalUsers}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">% Seguridad</p>
                <p className="text-2xl font-bold text-gray-900">{mfaPercentage}%</p>
              </div>
              <Key className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Disponibles */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Roles y Permisos Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(CATERING_ROLES).map(([key, role]) => (
              <div
                key={key}
                className={`p-4 rounded-lg border ${role.color.replace('text-', 'border-').replace('-800', '-300')}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {role.label}
                  </h4>
                  <Badge variant="outline" className={role.color}>
                    {users.filter((u) => u.role === key).length}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{role.description}</p>
              </div>
            ))}
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
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {Object.entries(CATERING_ROLES).map(([key, role]) => (
                    <SelectItem key={key} value={key}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Activos</SelectItem>
                  <SelectItem value="INACTIVE">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">
            Lista de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-gray-500"
                  >
                    <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm">No se encontraron usuarios</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{user.name || user.email}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getRoleInfo(user.role).color}
                      >
                        {getRoleInfo(user.role).label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.mfaEnabled ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm font-medium">Activo</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Inactivo</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {format(user.lastLoginAt, 'dd/MM/yyyy HH:mm', {
                              locale: es,
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.status === 'ACTIVE' ? (
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" title="Editar usuario">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Impersonar usuario"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={
                            user.status === 'ACTIVE'
                              ? 'Desactivar'
                              : 'Activar'
                          }
                        >
                          {user.status === 'ACTIVE' ? (
                            <Lock className="h-4 w-4 text-red-600" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Seguridad y MFA */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-600" />
            Seguridad y Autenticación
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900">
                    Autenticación Multi-Factor (MFA)
                  </h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Se recomienda activar MFA para todos los usuarios, especialmente
                    Administradores y roles con acceso a datos sensibles. Actualmente{' '}
                    <strong>{mfaEnabledUsers} de {totalUsers}</strong> usuarios tienen
                    MFA activado ({mfaPercentage}%).
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start gap-3">
                <UserCog className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-purple-900">
                    Impersonación de Usuario
                  </h4>
                  <p className="text-xs text-purple-700 mt-1">
                    Los Super Admins pueden impersonar usuarios del catering para
                    resolver problemas o realizar pruebas. Todas las sesiones de
                    impersonación se registran en el audit log y expiran tras 15
                    minutos.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Monitoreo de Accesos
                  </h4>
                  <p className="text-xs text-gray-700 mt-1">
                    El sistema registra todos los inicios de sesión, cambios de
                    permisos y acciones críticas. Se recomienda revisar regularmente
                    los últimos accesos para detectar actividad inusual.
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

