'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WeeklyMenuCalendar } from '@/components/catering/menus/WeeklyMenuCalendar'
import { MenuPublishButton } from '@/components/catering/menus/MenuPublishButton'
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

type MenusData = Record<string, any>

export default function MenusWeeklyPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [menus, setMenus] = useState<MenusData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calcular inicio y fin de semana (lunes a domingo)
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  const fetchWeeklyMenus = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/catering/menus/semanal?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar menús')
      }

      setMenus(data.data || {})
    } catch (err) {
      console.error('Error fetching menus:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar menús')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeeklyMenus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek])

  const handlePreviousWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1))
  }

  const handleToday = () => {
    setCurrentWeek(new Date())
  }

  const handlePublishSuccess = () => {
    // Recargar menús después de publicar
    fetchWeeklyMenus()
  }

  // Validar si todos los días tienen menús completos
  const validateWeek = () => {
    const errors: string[] = []

    Object.entries(menus).forEach(([dateKey, menu]) => {
      if (!menu.firsts || menu.firsts.length === 0) {
        errors.push(`${dateKey}: falta primeros`)
      }
      if (!menu.seconds || menu.seconds.length === 0) {
        errors.push(`${dateKey}: falta segundos`)
      }
    })

    // Verificar que haya al menos un día configurado
    if (Object.keys(menus).length === 0) {
      errors.push('No hay menús configurados en esta semana')
    }

    return errors
  }

  const validationErrors = validateWeek()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Menús Semanales</h1>
        <p className="text-gray-600 mt-1">
          Configura y publica los menús de la semana
        </p>
      </div>

      {/* Controles de navegación */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Navegación de semanas */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center min-w-[250px]">
              <p className="text-lg font-semibold text-gray-900">
                {format(weekStart, "dd 'de' MMMM", { locale: es })} -{' '}
                {format(weekEnd, "dd 'de' MMMM yyyy", { locale: es })}
              </p>
              <p className="text-sm text-gray-500">Semana seleccionada</p>
            </div>

            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleToday}>
              <Calendar className="h-4 w-4 mr-2" />
              Hoy
            </Button>

            <MenuPublishButton
              startDate={weekStart}
              endDate={weekEnd}
              onSuccess={handlePublishSuccess}
              validationErrors={validationErrors}
            />
          </div>
        </div>
      </Card>

      {/* Calendario semanal */}
      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
            <p className="text-gray-500">Cargando menús...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-12 border-red-200 bg-red-50">
          <div className="text-center">
            <p className="text-red-900 font-medium mb-2">Error al cargar menús</p>
            <p className="text-red-700 text-sm mb-4">{error}</p>
            <Button variant="outline" onClick={fetchWeeklyMenus}>
              Reintentar
            </Button>
          </div>
        </Card>
      ) : (
        <WeeklyMenuCalendar
          weekStart={weekStart}
          menus={menus}
        />
      )}

      {/* Ayuda */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          📝 Cómo funciona
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Haz clic en "Crear" o "Editar" para configurar el menú de cada día</li>
          <li>Cada día debe tener al menos un primer plato y un segundo plato</li>
          <li>Los postres son opcionales</li>
          <li>Una vez configurados todos los días, haz clic en "Publicar Semana"</li>
          <li>Los empleados solo verán los menús publicados</li>
        </ul>
      </Card>
    </div>
  )
}

