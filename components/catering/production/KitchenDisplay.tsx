'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type KitchenDisplayProps = {
  date: Date
  course: 'FIRST' | 'SECOND' | 'DESSERT'
  autoRefreshSeconds?: number
}

type DishItem = {
  dishId: string
  dishName: string
  count: number
}

const COURSE_LABELS = {
  FIRST: '🥘 PRIMEROS PLATOS',
  SECOND: '🍗 SEGUNDOS PLATOS',
  DESSERT: '🍰 POSTRES',
}

const COURSE_COLORS = {
  FIRST: 'bg-yellow-500',
  SECOND: 'bg-primary',
  DESSERT: 'bg-pink-500',
}

export function KitchenDisplay({
  date,
  course,
  autoRefreshSeconds = 30,
}: KitchenDisplayProps) {
  const [data, setData] = useState<{ items: DishItem[]; totalItems: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchData = async () => {
    try {
      const response = await fetch(
        `/api/catering/produccion/cocina?date=${date.toISOString()}&course=${course}`
      )

      if (response.ok) {
        const result = await response.json()
        setData(result.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching kitchen data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, autoRefreshSeconds * 1000)
    return () => clearInterval(interval)
  }, [date, course, autoRefreshSeconds])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <p className="text-4xl text-white">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header fijo */}
      <header className={`${COURSE_COLORS[course]} px-8 py-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white">
              {COURSE_LABELS[course]}
            </h1>
            <p className="mt-2 text-2xl text-white/90">
              {format(date, "EEEE, dd 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-7xl font-bold text-white">
              {data?.totalItems || 0}
            </div>
            <p className="text-2xl text-white/90">Total</p>
          </div>
        </div>
      </header>

      {/* Contenido - Grid de platos */}
      <main className="flex-1 overflow-hidden p-8">
        {!data || data.items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-4xl text-gray-400">No hay platos pendientes</p>
              <p className="mt-4 text-2xl text-gray-500">
                Todo listo para hoy 🎉
              </p>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-2 gap-8">
            {data.items.map((item) => (
              <Card
                key={item.dishId}
                className="flex flex-col items-center justify-center border-4 border-gray-700 bg-white p-8 shadow-2xl"
              >
                {/* Nombre del plato */}
                <h2 className="mb-6 text-center text-4xl font-bold uppercase leading-tight text-gray-900">
                  {item.dishName}
                </h2>

                {/* Cantidad - EXTRA GRANDE */}
                <div className="mb-4">
                  <span className="text-[120px] font-bold leading-none text-gray-900">
                    {item.count}
                  </span>
                </div>

                {/* Label */}
                <p className="text-3xl font-medium text-gray-600">unidades</p>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer con hora de actualización */}
      <footer className="bg-gray-800 px-8 py-4">
        <p className="text-center text-xl text-gray-400">
          Última actualización: {format(lastUpdate, 'HH:mm:ss')}
          {' · '}
          Auto-refresh cada {autoRefreshSeconds}s
        </p>
      </footer>
    </div>
  )
}

