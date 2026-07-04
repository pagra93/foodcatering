/**
 * Página: Dashboard de Producción (Vista Admin)
 * Ruta: /catering/produccion
 * 
 * Vista administrativa normal (con layout) para gestionar producción
 */

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getRequiredSession } from '@/lib/auth/session'
import { requireCateringFeature } from '@/lib/plans/guard'
import {
  Monitor,
  Package,
  Printer,
  Calendar,
  TrendingUp,
  Users,
  ChefHat,
} from 'lucide-react'

export default async function ProductionDashboardPage() {
  const session = await getRequiredSession()
  const locked = await requireCateringFeature(session.user.tenantId, 'cat-production')
  if (locked) return locked

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Panel de Producción
        </h1>
        <p className="text-gray-600 mt-1">
          Gestiona la producción diaria y visualiza estadísticas
        </p>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pedidos Hoy
              </p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <ChefHat className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Primeros
              </p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="text-4xl">🥘</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Segundos
              </p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="text-4xl">🍗</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Empresas
              </p>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Accesos Rápidos a Displays */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          <Monitor className="inline h-5 w-5 mr-2" />
          Pantallas de Producción
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Abre estas URLs en tablets para mostrar en cocina y empaquetado
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Cocina - Primeros */}
          <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">🥘</div>
              <div>
                <h3 className="font-semibold text-gray-900">Cocina - Primeros</h3>
                <Badge variant="secondary" className="text-xs">
                  Tablet 1
                </Badge>
              </div>
            </div>
            <Link
              href={`/catering/produccion/cocina/primeros?date=${today}`}
              target="_blank"
            >
              <Button className="w-full" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                Abrir Pantalla
              </Button>
            </Link>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              .../cocina/primeros
            </p>
          </Card>

          {/* Cocina - Segundos */}
          <Card className="p-4 border-2 border-primary/30 bg-primary/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">🍗</div>
              <div>
                <h3 className="font-semibold text-gray-900">Cocina - Segundos</h3>
                <Badge variant="secondary" className="text-xs">
                  Tablet 2
                </Badge>
              </div>
            </div>
            <Link
              href={`/catering/produccion/cocina/segundos?date=${today}`}
              target="_blank"
            >
              <Button className="w-full" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                Abrir Pantalla
              </Button>
            </Link>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              .../cocina/segundos
            </p>
          </Card>

          {/* Cocina - Postres */}
          <Card className="p-4 border-2 border-pink-200 bg-pink-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">🍰</div>
              <div>
                <h3 className="font-semibold text-gray-900">Cocina - Postres</h3>
                <Badge variant="secondary" className="text-xs">
                  Tablet 3
                </Badge>
              </div>
            </div>
            <Link
              href={`/catering/produccion/cocina/postres?date=${today}`}
              target="_blank"
            >
              <Button className="w-full" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                Abrir Pantalla
              </Button>
            </Link>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              .../cocina/postres
            </p>
          </Card>

          {/* Empaquetado */}
          <Card className="p-4 border-2 border-orange-200 bg-orange-50">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Empaquetado</h3>
                <Badge variant="secondary" className="text-xs">
                  Tablet 4
                </Badge>
              </div>
            </div>
            <Link
              href={`/catering/produccion/empaquetado?date=${today}`}
              target="_blank"
            >
              <Button className="w-full" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                Abrir Pantalla
              </Button>
            </Link>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              .../empaquetado
            </p>
          </Card>
        </div>
      </Card>

      {/* Otras Acciones */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Imprimir Etiquetas */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">
            <Printer className="inline h-5 w-5 mr-2" />
            Imprimir Etiquetas
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Genera etiquetas térmicas para todos los pedidos del día
          </p>
          <Button variant="outline" className="w-full" disabled>
            <Printer className="h-4 w-4 mr-2" />
            Generar Etiquetas
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            (Disponible próximamente)
          </p>
        </Card>

        {/* Ver Historial */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">
            <Calendar className="inline h-5 w-5 mr-2" />
            Historial de Producción
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Consulta producciones de días anteriores
          </p>
          <Button variant="outline" className="w-full" disabled>
            <TrendingUp className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            (Disponible próximamente)
          </p>
        </Card>
      </div>

      {/* Ayuda */}
      <Card className="p-6 bg-primary/10 border-primary/30">
        <h3 className="font-semibold text-primary mb-2">
          📱 Cómo usar las pantallas
        </h3>
        <ul className="text-sm text-primary space-y-1 list-disc list-inside">
          <li>Haz clic en "Abrir Pantalla" para cada tablet</li>
          <li>Pon la tablet en modo fullscreen (F11 en navegador)</li>
          <li>Las pantallas se actualizan automáticamente cada 30 segundos</li>
          <li>No necesitas interactuar con ellas, son solo lectura</li>
          <li>Si quieres filtrar por empresa, añade ?companyId=xxx a la URL</li>
        </ul>
      </Card>
    </div>
  )
}

