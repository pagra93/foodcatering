/**
 * Página: Gestión de Facturas
 * Ruta: /catering/facturas
 * 
 * Vista para gestionar facturación mensual
 */

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
} from 'lucide-react'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Facturación
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona facturas mensuales y reportes financieros
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generar Factura
        </Button>
      </div>

      {/* KPIs Financieros */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Facturado
              </p>
              <p className="text-3xl font-bold text-gray-900">0€</p>
              <p className="text-xs text-gray-500 mt-1">Este año</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Facturas Pagadas
              </p>
              <p className="text-3xl font-bold text-green-600">0</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pendientes
              </p>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Este Mes
              </p>
              <p className="text-3xl font-bold text-gray-900">0€</p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Funcionalidades Implementadas */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          ✅ Sistema de Facturación Implementado
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Backend Completo</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✅ Generación automática de facturas</li>
              <li>✅ Cálculos precisos con Decimal</li>
              <li>✅ Solo pedidos DELIVERED</li>
              <li>✅ priceOverride considerado</li>
              <li>✅ Snapshot inmutable con hash</li>
              <li>✅ IVA 21% calculado correctamente</li>
              <li>✅ Audit logs completos</li>
              <li>✅ Estados: DRAFT → SENT → PAID</li>
              <li>✅ Validación fiscal (11€/día IRPF)</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">APIs Funcionales</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✅ POST /api/catering/facturas/generar</li>
              <li>✅ GET /api/catering/facturas (con filtros)</li>
              <li>✅ GET /api/catering/facturas/[id]</li>
              <li>✅ PATCH /api/catering/facturas/[id]</li>
              <li>✅ DELETE /api/catering/facturas/[id]</li>
              <li>✅ POST /api/catering/facturas/[id]/pagar</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Características Clave */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">
          🎯 Características Clave del Sistema
        </h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <p className="font-medium">1. Precisión Decimal</p>
            <p className="text-blue-700">
              Todos los cálculos usan Prisma.Decimal y redondeo a 2 decimales.
              Previene errores de precisión flotante.
            </p>
          </div>
          <div>
            <p className="font-medium">2. Solo Pedidos Entregados</p>
            <p className="text-blue-700">
              La facturación solo incluye pedidos con status DELIVERED.
              Los confirmados pero no entregados no se facturan.
            </p>
          </div>
          <div>
            <p className="font-medium">3. Price Override</p>
            <p className="text-blue-700">
              Si un plato tiene priceOverride en DishSchedule para ese día,
              se usa ese precio. Sino, se usa basePrice.
            </p>
          </div>
          <div>
            <p className="font-medium">4. Snapshot Inmutable</p>
            <p className="text-blue-700">
              Cada factura guarda un snapshot JSON completo con todos los datos.
              Incluye hash SHA-256 para verificar integridad.
            </p>
          </div>
          <div>
            <p className="font-medium">5. Compliance Fiscal</p>
            <p className="text-blue-700">
              Cumple con requisitos españoles: IVA 21%, validación límite IRPF 11€/día,
              numeración secuencial (CATERING-YYYY-MM-XXXX).
            </p>
          </div>
        </div>
      </Card>

      {/* Ejemplo de Uso */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-3">
          📋 Cómo Generar una Factura
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p>1. Click "Generar Factura" → Seleccionar empresa y mes</p>
          <p>2. Sistema busca todos los pedidos DELIVERED del mes</p>
          <p>3. Calcula precio de cada pedido (con priceOverride si existe)</p>
          <p>4. Suma subtotal, calcula IVA 21%, genera total</p>
          <p>5. Crea snapshot inmutable con hash SHA-256</p>
          <p>6. Asigna número secuencial: CATERING-2025-11-0001</p>
          <p>7. Asocia todos los pedidos a la factura</p>
          <p>8. Estado inicial: DRAFT</p>
          <p>9. Puede cambiar a: SENT → PAID</p>
          <p>10. Genera audit log de la operación</p>
        </div>
      </Card>

      {/* Integración */}
      <Card className="p-6 bg-green-50 border-green-200">
        <h3 className="font-semibold text-green-900 mb-3">
          🔗 Integración con Otras Fases
        </h3>
        <ul className="text-sm text-green-800 space-y-2">
          <li>
            <span className="font-medium">FASE 2 (Platos)</span> - Usa Dish.basePrice
          </li>
          <li>
            <span className="font-medium">FASE 3 (Menús)</span> - Usa DishSchedule.priceOverride
          </li>
          <li>
            <span className="font-medium">Portal Empleado</span> - Facturable Order.status === DELIVERED
          </li>
          <li>
            <span className="font-medium">FASE 5 (Entregas)</span> - Solo DELIVERED se facturan
          </li>
        </ul>
      </Card>

      {/* Admin UI Pendiente */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-3">
          🚧 UI Administrativa Pendiente
        </h3>
        <p className="text-sm text-yellow-800 mb-4">
          El formulario visual de generación de facturas, tabla de facturas,
          filtros avanzados y exportación a ERP están pendientes de desarrollo.
        </p>
        <p className="text-sm text-yellow-800">
          Por ahora puedes generar facturas mediante la API directa:
        </p>
        <div className="mt-3 bg-yellow-100 rounded p-3 border border-yellow-300 font-mono text-xs">
          POST /api/catering/facturas/generar
          <br />
          Body: {'{'} companyId, period: {'{'} year, month {'}'} {'}'}
        </div>
      </Card>
    </div>
  )
}

