/**
 * Página de detalle del Tenant
 * Con pestañas: Resumen, Configuración, Usuarios, Logs
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Edit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getTenantById } from '@/lib/db/queries/tenants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type PageProps = {
  params: {
    id: string
  }
}

async function TenantDetails({ tenantId }: { tenantId: string }) {
  try {
    const tenant = await getTenantById(tenantId)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/tenants">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-4">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold text-white"
                  style={{ backgroundColor: tenant.primaryColor || '#3B82F6' }}
                >
                  {tenant.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
                <p className="mt-1 text-gray-600">{tenant.subdomain}.comida.com</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Badge variant={tenant.type === 'EMPRESA' ? 'default' : 'secondary'}>
              {tenant.type}
            </Badge>
            <Button asChild>
              <Link href={`/admin/tenants/${tenant.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="usuarios">
              Usuarios ({tenant._count.users})
            </TabsTrigger>
            <TabsTrigger value="actividad">Actividad</TabsTrigger>
          </TabsList>

          {/* Tab: Resumen */}
          <TabsContent value="resumen" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{tenant._count.users}</p>
                  <p className="mt-1 text-sm text-gray-600">Usuarios registrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {tenant.type === 'EMPRESA' ? 'Empresas' : 'Restaurantes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {tenant.type === 'EMPRESA'
                      ? tenant._count.companies
                      : tenant._count.restaurants}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">Entidades ligadas</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email de Contacto</p>
                    <p className="mt-1">{tenant.contactEmail || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Teléfono</p>
                    <p className="mt-1">{tenant.contactPhone || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Creado</p>
                    <p className="mt-1">
                      {formatDistanceToNow(tenant.createdAt, {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Última Actualización
                    </p>
                    <p className="mt-1">
                      {formatDistanceToNow(tenant.updatedAt, {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>

                {tenant.type === 'CATERING' && tenant.address && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Dirección</p>
                      <p className="mt-1">
                        {tenant.address}
                        <br />
                        {tenant.postalCode} {tenant.city}
                        <br />
                        {tenant.country}
                      </p>
                    </div>
                  </>
                )}

                {tenant.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Notas Internas</p>
                      <p className="mt-1 text-gray-700">{tenant.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Configuración */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Regional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Zona Horaria</p>
                    <p className="mt-1">{tenant.timezone || 'Europe/Madrid'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Moneda</p>
                    <p className="mt-1">{tenant.currency || 'EUR'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Idioma</p>
                    <p className="mt-1">{tenant.language || 'es'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Color Primario</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded border"
                        style={{ backgroundColor: tenant.primaryColor || '#3B82F6' }}
                      />
                      <span className="font-mono text-sm">
                        {tenant.primaryColor || '#3B82F6'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Logo</p>
                    {tenant.logoUrl ? (
                      <img
                        src={tenant.logoUrl}
                        alt="Logo"
                        className="mt-2 h-12 object-contain"
                      />
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">Sin logo</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Usuarios */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle>Usuarios del Tenant</CardTitle>
              </CardHeader>
              <CardContent>
                {tenant.users.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">
                    No hay usuarios registrados
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Creado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenant.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.nameEnc || 'Sin nombre'}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDistanceToNow(user.createdAt, {
                              addSuffix: true,
                              locale: es,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Actividad */}
          <TabsContent value="actividad">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="py-8 text-center text-gray-500">
                  Próximamente: Logs de auditoría y actividad del tenant
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  } catch (error) {
    notFound()
  }
}

export default function TenantDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <TenantDetails tenantId={params.id} />
    </Suspense>
  )
}

