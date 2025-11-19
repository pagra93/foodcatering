'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle } from 'lucide-react'

type PackingDisplayProps = {
  date: Date
  companyId?: string
  autoRefreshSeconds?: number
  itemsPerPage?: number
}

type OrderItem = {
  id: string
  employeeName: string
  employeeAllergies: string[] | null
  company: string
  site: string
  dishes: {
    first: { id: string; name: string; course: string } | null
    second: { id: string; name: string; course: string } | null
    dessert: { id: string; name: string; course: string } | null
  }
  notes: string | null
}

export function PackingDisplay({
  date,
  companyId,
  autoRefreshSeconds = 30,
  itemsPerPage = 6,
}: PackingDisplayProps) {
  const [data, setData] = useState<{ orders: OrderItem[]; totalOrders: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        date: date.toISOString(),
      })
      if (companyId) params.append('companyId', companyId)

      const response = await fetch(`/api/catering/produccion/empaquetado?${params}`)

      if (response.ok) {
        const result = await response.json()
        setData(result.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching packing data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, autoRefreshSeconds * 1000)
    return () => clearInterval(interval)
  }, [date, companyId, autoRefreshSeconds])

  // Auto-paginación
  useEffect(() => {
    if (!data || data.orders.length <= itemsPerPage) return

    const totalPages = Math.ceil(data.orders.length / itemsPerPage)
    const pageInterval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages)
    }, 15000) // Cambiar página cada 15 segundos

    return () => clearInterval(pageInterval)
  }, [data, itemsPerPage])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <p className="text-4xl text-white">Cargando...</p>
      </div>
    )
  }

  const orders = data?.orders || []
  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const startIndex = currentPage * itemsPerPage
  const visibleOrders = orders.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header fijo */}
      <header className="bg-orange-500 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white">
              📦 EMPAQUETADO
            </h1>
            <p className="mt-2 text-2xl text-white/90">
              {format(date, "EEEE, dd 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-7xl font-bold text-white">
              {data?.totalOrders || 0}
            </div>
            <p className="text-2xl text-white/90">Pedidos</p>
          </div>
        </div>
      </header>

      {/* Contenido - Lista de pedidos */}
      <main className="flex-1 overflow-hidden p-8">
        {orders.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-4xl text-gray-400">No hay pedidos pendientes</p>
              <p className="mt-4 text-2xl text-gray-500">
                Todo empaquetado 🎉
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleOrders.map((order, index) => (
              <Card
                key={order.id}
                className="border-4 border-gray-700 bg-white p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between">
                  {/* Info empleado y empresa */}
                  <div className="flex-1">
                    <div className="mb-3 flex items-baseline gap-4">
                      <span className="text-6xl font-bold text-gray-900">
                        #{startIndex + index + 1}
                      </span>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">
                          {order.employeeName}
                        </h2>
                        <p className="text-2xl text-gray-600">
                          {order.company} - {order.site}
                        </p>
                      </div>
                    </div>

                    {/* Alergias */}
                    {order.employeeAllergies && order.employeeAllergies.length > 0 && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-100 p-3">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-xl font-semibold text-red-900">
                            ALERGIAS:
                          </p>
                          <p className="text-xl text-red-800">
                            {order.employeeAllergies.join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notas */}
                    {order.notes && (
                      <div className="mb-4 rounded-lg bg-yellow-100 p-3">
                        <p className="text-xl text-yellow-900">
                          <span className="font-semibold">Nota:</span> {order.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Platos - Cards horizontales */}
                  <div className="flex gap-4">
                    {order.dishes.first && (
                      <div className="w-48 rounded-lg bg-yellow-100 p-4 text-center">
                        <div className="mb-2 text-5xl">🥘</div>
                        <p className="text-xl font-bold text-yellow-900">
                          {order.dishes.first.name}
                        </p>
                        <Badge className="mt-2 bg-yellow-600 text-base">
                          Primero
                        </Badge>
                      </div>
                    )}

                    {order.dishes.second && (
                      <div className="w-48 rounded-lg bg-blue-100 p-4 text-center">
                        <div className="mb-2 text-5xl">🍗</div>
                        <p className="text-xl font-bold text-blue-900">
                          {order.dishes.second.name}
                        </p>
                        <Badge className="mt-2 bg-blue-600 text-base">
                          Segundo
                        </Badge>
                      </div>
                    )}

                    {order.dishes.dessert && (
                      <div className="w-48 rounded-lg bg-pink-100 p-4 text-center">
                        <div className="mb-2 text-5xl">🍰</div>
                        <p className="text-xl font-bold text-pink-900">
                          {order.dishes.dessert.name}
                        </p>
                        <Badge className="mt-2 bg-pink-600 text-base">
                          Postre
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer con paginación y hora */}
      <footer className="bg-gray-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xl text-gray-400">
            Última actualización: {format(lastUpdate, 'HH:mm:ss')}
          </p>
          {totalPages > 1 && (
            <p className="text-2xl font-semibold text-white">
              Página {currentPage + 1} / {totalPages}
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}

