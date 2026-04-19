/**
 * Tab de Operación Diaria para Caterings
 * Incluye: Calendario de menús, Cutoff, Hojas de cocina, Logística, Incidencias
 */

'use client'

import { useState } from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar,
  Clock,
  ChefHat,
  Package,
  Truck,
  AlertCircle,
  Download,
  Eye,
  MapPin,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type DailyOperationsTabProps = {
  restaurant: {
    cutoffTime: string
    preparationWindow: string | null
    deliveryWindow: string | null
    dailyCapacity: number
  }
  cateringId: string
}

// Datos de ejemplo para menús (TODO: obtener de la API)
const getMockMenusForWeek = () => {
  const startDate = startOfWeek(new Date(), { locale: es })
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i)
    return {
      date,
      starters: Math.floor(Math.random() * 3) + 2, // 2-4
      mains: Math.floor(Math.random() * 3) + 3, // 3-5
      desserts: Math.floor(Math.random() * 2) + 2, // 2-3
      totalOrders: Math.floor(Math.random() * 100) + 50, // 50-150
    }
  })
}

// Datos de ejemplo para logística
const getMockLogistics = () => [
  {
    id: '1',
    route: 'Zona Centro - Madrid',
    operator: 'Stuart',
    estimatedCost: 45.0,
    realCost: 48.5,
    status: 'completed',
    deliveries: 12,
    successRate: 100,
  },
  {
    id: '2',
    route: 'Zona Norte - Madrid',
    operator: 'Paack',
    estimatedCost: 38.0,
    realCost: 38.0,
    status: 'completed',
    deliveries: 8,
    successRate: 100,
  },
  {
    id: '3',
    route: 'Zona Sur - Madrid',
    operator: 'Stuart',
    estimatedCost: 52.0,
    realCost: 55.0,
    status: 'in_progress',
    deliveries: 15,
    successRate: 93,
  },
]

// Datos de ejemplo para incidencias
const getMockIncidents = () => [
  {
    id: '1',
    type: 'DELAYED_DELIVERY',
    severity: 'MEDIUM',
    company: 'Tech Solutions',
    description: 'Entrega retrasada 15 minutos',
    status: 'OPEN',
    createdAt: new Date(),
  },
  {
    id: '2',
    type: 'MISSING_ITEM',
    severity: 'HIGH',
    company: 'StartupXYZ',
    description: 'Falta postre en 2 pedidos',
    status: 'IN_PROGRESS',
    createdAt: new Date(),
  },
]

export function DailyOperationsTab({
  restaurant,
  cateringId: _cateringId,
}: DailyOperationsTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const menusWeek = getMockMenusForWeek()
  const logistics = getMockLogistics()
  const incidents = getMockIncidents()

  const selectedDayMenu = menusWeek.find((menu) =>
    isSameDay(menu.date, selectedDate)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Operación Diaria</h2>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de menús, preparación, entrega y logística del día
        </p>
      </div>

      {/* Cutoff & Ventanas Operativas */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Horarios Operativos - Hoy {format(new Date(), 'EEEE d MMMM', { locale: es })}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Cutoff */}
            <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-red-100">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900">
                  Hora de Corte (Cutoff)
                </h4>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {restaurant.cutoffTime}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  ⚠️ Los pedidos se bloquean automáticamente
                </p>
              </div>
            </div>

            {/* Ventana de Preparación */}
            {restaurant.preparationWindow && (
              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-purple-100">
                  <ChefHat className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-purple-900">
                    Ventana de Preparación
                  </h4>
                  <p className="text-lg font-bold text-purple-600 mt-1">
                    {restaurant.preparationWindow}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    👨‍🍳 Tiempo para cocinar y empaquetar
                  </p>
                </div>
              </div>
            )}

            {/* Ventana de Entrega */}
            {restaurant.deliveryWindow && (
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-green-100">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900">
                    Ventana de Entrega
                  </h4>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    {restaurant.deliveryWindow}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    🚚 Horario de entrega a empresas
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendario de Menús Semanal */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Menús Publicados - Semana Actual
            </CardTitle>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Ver Calendario Completo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-7">
            {menusWeek.map((menu) => {
              const isToday = isSameDay(menu.date, new Date())
              const isSelected = isSameDay(menu.date, selectedDate)
              return (
                <button
                  key={menu.date.toString()}
                  onClick={() => setSelectedDate(menu.date)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isToday
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500 uppercase">
                    {format(menu.date, 'EEE', { locale: es })}
                  </div>
                  <div className="text-lg font-bold text-gray-900 mt-1">
                    {format(menu.date, 'd', { locale: es })}
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">1º</span>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {menu.starters}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">2º</span>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {menu.mains}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Postre</span>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {menu.desserts}
                      </Badge>
                    </div>
                  </div>
                  {isToday && (
                    <Badge variant="default" className="mt-2 w-full text-center text-xs">
                      Hoy
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>

          {/* Resumen del día seleccionado */}
          {selectedDayMenu && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900">
                📅 {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </h4>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-xs text-blue-700">Primeros</p>
                  <p className="text-lg font-bold text-blue-900">
                    {selectedDayMenu.starters} platos
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Segundos</p>
                  <p className="text-lg font-bold text-blue-900">
                    {selectedDayMenu.mains} platos
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Postres</p>
                  <p className="text-lg font-bold text-blue-900">
                    {selectedDayMenu.desserts} opciones
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Pedidos Estimados</p>
                  <p className="text-lg font-bold text-blue-900">
                    {selectedDayMenu.totalOrders}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hojas de Cocina y Empaquetado */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hoja de Cocina */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-purple-600" />
                Hoja de Cocina - Hoy
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Total a Preparar
                  </h4>
                  <Badge variant="default">{selectedDayMenu?.totalOrders || 0} platos</Badge>
                </div>
                <p className="text-xs text-gray-600">
                  Desglose por tipo de plato para la cocina
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <span className="text-sm text-gray-700">🥗 Ensalada César</span>
                  <Badge variant="outline">25 uds</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <span className="text-sm text-gray-700">🍝 Pasta Carbonara</span>
                  <Badge variant="outline">40 uds</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <span className="text-sm text-gray-700">🍗 Pollo al Curry</span>
                  <Badge variant="outline">35 uds</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <span className="text-sm text-gray-700">🍰 Tarta de Manzana</span>
                  <Badge variant="outline">50 uds</Badge>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center pt-2">
                💡 Hoja completa disponible después del cutoff
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hoja de Empaquetado */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                Hoja de Empaquetado
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Pedidos por Empresa
                  </h4>
                  <Badge variant="default">8 empresas</Badge>
                </div>
                <p className="text-xs text-gray-600">
                  Agrupado para facilitar el empaquetado y entrega
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      Tech Solutions
                    </span>
                    <Badge variant="outline">25 pedidos</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    📍 Zona Centro - Entrega: 13:00-13:30
                  </p>
                </div>

                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      StartupXYZ
                    </span>
                    <Badge variant="outline">18 pedidos</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    📍 Zona Norte - Entrega: 12:30-13:00
                  </p>
                </div>

                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      Consulting Corp
                    </span>
                    <Badge variant="outline">32 pedidos</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    📍 Zona Sur - Entrega: 13:15-13:45
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center pt-2">
                💡 Hojas por empresa generadas tras el cutoff
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logística y Rutas */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" />
            Logística y Rutas - Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ruta</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Entregas</TableHead>
                <TableHead>Coste Est.</TableHead>
                <TableHead>Coste Real</TableHead>
                <TableHead>Éxito</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logistics.map((route) => (
                <TableRow key={route.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {route.route}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{route.operator}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {route.deliveries} entregas
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {route.estimatedCost.toFixed(2)}€
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm font-semibold ${
                        route.realCost > route.estimatedCost
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {route.realCost.toFixed(2)}€
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {route.successRate === 100 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">
                        {route.successRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {route.status === 'completed' ? (
                      <Badge variant="success">Completada</Badge>
                    ) : (
                      <Badge variant="warning">En Curso</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Resumen de logística */}
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Total Entregas</p>
                <p className="text-lg font-bold text-gray-900">
                  {logistics.reduce((sum, r) => sum + r.deliveries, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Coste Total Real</p>
                <p className="text-lg font-bold text-gray-900">
                  {logistics.reduce((sum, r) => sum + r.realCost, 0).toFixed(2)}€
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">% Éxito Promedio</p>
                <p className="text-lg font-bold text-green-600">
                  {(
                    logistics.reduce((sum, r) => sum + r.successRate, 0) /
                    logistics.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Rutas Activas</p>
                <p className="text-lg font-bold text-gray-900">
                  {logistics.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidencias del Día */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Incidencias del Día
            </CardTitle>
            <Badge variant={incidents.length > 0 ? 'destructive' : 'success'}>
              {incidents.length} abiertas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {incidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-3" />
              <p className="text-sm font-medium">No hay incidencias hoy</p>
              <p className="text-xs text-gray-400 mt-1">
                ¡Todo funcionando perfectamente! 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            incident.severity === 'HIGH'
                              ? 'destructive'
                              : incident.severity === 'MEDIUM'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {incident.severity === 'HIGH' && '🔴 Alta'}
                          {incident.severity === 'MEDIUM' && '🟡 Media'}
                          {incident.severity === 'LOW' && '🟢 Baja'}
                        </Badge>
                        <Badge variant="outline">{incident.company}</Badge>
                        <Badge
                          variant={
                            incident.status === 'OPEN'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {incident.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-900 font-medium">
                        Tipo: {incident.type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reportada hace{' '}
                        {Math.floor(
                          (new Date().getTime() - incident.createdAt.getTime()) /
                            60000
                        )}{' '}
                        minutos
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

