/**
 * Página: Gestión de Rutas (Admin)
 * Ruta: /catering/rutas
 * 
 * Vista administrativa para crear y gestionar rutas de reparto
 */

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Route,
  Plus,
  Truck,
  MapPin,
} from 'lucide-react'

export default function RoutesManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Rutas
          </h1>
          <p className="text-gray-600 mt-1">
            Organiza las entregas por zonas y repartidores
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Ruta
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Rutas Hoy
              </p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <Route className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                En Curso
              </p>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <Truck className="h-8 w-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Completadas
              </p>
              <p className="text-3xl font-bold text-green-600">0</p>
            </div>
            <MapPin className="h-8 w-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Repartidores
              </p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <Truck className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Instrucciones */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">
          📱 Vista Móvil para Repartidores
        </h3>
        <p className="text-sm text-blue-800 mb-4">
          Los repartidores acceden a su ruta desde el móvil usando:
        </p>
        <div className="bg-white rounded p-3 border border-blue-200 font-mono text-sm">
          /catering/ruta/[id]
        </div>
        <ul className="text-sm text-blue-800 mt-4 space-y-2 list-disc list-inside">
          <li>Optimizado para móviles en la calle</li>
          <li>Botones grandes táctiles</li>
          <li>Navegación integrada con Google Maps</li>
          <li>Confirmación de entregas rápida</li>
          <li>Reporte de incidencias</li>
        </ul>
      </Card>

      {/* Funcionalidades Implementadas */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          ✅ Funcionalidades Implementadas
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Backend (APIs)</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✅ GET /api/catering/rutas (listar)</li>
              <li>✅ POST /api/catering/rutas (crear)</li>
              <li>✅ GET /api/catering/rutas/[id]</li>
              <li>✅ PATCH /api/catering/rutas/[id]</li>
              <li>✅ DELETE /api/catering/rutas/[id]</li>
              <li>✅ POST /api/catering/rutas/[id]/iniciar</li>
              <li>✅ POST /api/catering/rutas/[id]/completar</li>
              <li>✅ POST /api/catering/entregas/confirmar</li>
              <li>✅ POST /api/catering/entregas/incidencia</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Frontend Móvil</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✅ Vista de ruta optimizada para móvil</li>
              <li>✅ Lista de paradas con secuencia</li>
              <li>✅ Navegación a cada parada (Maps)</li>
              <li>✅ Confirmación de entregas</li>
              <li>✅ Alertas de alergias</li>
              <li>✅ Barra de progreso en tiempo real</li>
              <li>✅ Botones táctiles grandes</li>
              <li>✅ Auto-refresh cada 30s</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Próximos Pasos */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">
          🚧 Funcionalidad Administrativa Pendiente
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          La vista administrativa de gestión de rutas (crear, asignar repartidores,
          visualizar en mapa) está pendiente de desarrollo. Por ahora puedes:
        </p>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li>Crear rutas mediante API directa</li>
          <li>Asignar repartidores</li>
          <li>Los repartidores pueden usar la vista móvil</li>
        </ul>
      </Card>
    </div>
  )
}

