/**
 * Tabla de actividad reciente del sistema
 */

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type RecentActivityProps = {
  activity: {
    tenants: Array<{
      id: string
      name: string
      type: string
      status: string
      createdAt: Date
    }>
    incidents: Array<{
      id: string
      severity: string
      status: string
      type: string
      tenantEmpresa: string
      createdAt: Date
    }>
    users: Array<{
      id: string
      nameEnc: string | null
      email: string
      role: string
      createdAt: Date
      tenant: {
        name: string
      }
    }>
  }
}

export function RecentActivityTable({ activity }: RecentActivityProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="tenants" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="incidents">Incidencias</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
          </TabsList>

          {/* Tenants */}
          <TabsContent value="tenants">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="text-gray-700">Nombre</TableHead>
                  <TableHead className="text-gray-700">Tipo</TableHead>
                  <TableHead className="text-gray-700">Estado</TableHead>
                  <TableHead className="text-gray-700">Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No hay actividad reciente
                    </TableCell>
                  </TableRow>
                ) : (
                  activity.tenants.map((tenant) => (
                    <TableRow key={tenant.id} className="border-gray-100 hover:bg-gray-50">
                      <TableCell>
                        <Link
                          href={`/admin/${
                            tenant.type === 'EMPRESA' ? 'empresas' : 'caterings'
                          }/${tenant.id}`}
                          className="font-medium text-gray-900 hover:text-primary hover:underline"
                        >
                          {tenant.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.type === 'EMPRESA' ? 'default' : 'secondary'}>
                          {tenant.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tenant.status === 'ACTIVE'
                              ? 'success'
                              : tenant.status === 'SUSPENDED'
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDistanceToNow(tenant.createdAt, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Incidencias */}
          <TabsContent value="incidents">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="text-gray-700">Descripción</TableHead>
                  <TableHead className="text-gray-700">Empresa</TableHead>
                  <TableHead className="text-gray-700">Severidad</TableHead>
                  <TableHead className="text-gray-700">Estado</TableHead>
                  <TableHead className="text-gray-700">Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No hay incidencias recientes
                    </TableCell>
                  </TableRow>
                ) : (
                  activity.incidents.map((incident) => (
                    <TableRow key={incident.id} className="border-gray-100 hover:bg-gray-50">
                      <TableCell className="max-w-xs truncate">
                        <Link
                          href={`/admin/incidents/${incident.id}`}
                          className="text-gray-900 hover:text-primary hover:underline"
                        >
                          {incident.type}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {incident.tenantEmpresa || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            incident.severity === 'HIGH'
                              ? 'destructive'
                              : incident.severity === 'MEDIUM'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            incident.status === 'RESOLVED'
                              ? 'success'
                              : incident.status === 'IN_PROGRESS'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDistanceToNow(incident.createdAt, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Usuarios */}
          <TabsContent value="users">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="text-gray-700">Nombre</TableHead>
                  <TableHead className="text-gray-700">Email</TableHead>
                  <TableHead className="text-gray-700">Rol</TableHead>
                  <TableHead className="text-gray-700">Tenant</TableHead>
                  <TableHead className="text-gray-700">Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No hay usuarios recientes
                    </TableCell>
                  </TableRow>
                ) : (
                  activity.users.map((user) => (
                    <TableRow key={user.id} className="border-gray-100 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {user.nameEnc || 'Sin nombre'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {user.tenant.name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDistanceToNow(user.createdAt, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

