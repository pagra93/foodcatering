/**
 * Vista cliente del calendario semanal de menús.
 *
 * Recibe los menús de la semana ya cargados desde el Server Component
 * padre (`/catering/menus`) y se encarga únicamente de la interactividad:
 * navegación entre semanas (vía query string) y publicación (delegada al
 * componente `MenuPublishButton`, que sigue usando su endpoint POST).
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WeeklyMenuCalendar } from '@/components/catering/menus/WeeklyMenuCalendar'
import { MenuPublishButton } from '@/components/catering/menus/MenuPublishButton'
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import {
  addWeeks,
  format,
  subWeeks,
} from 'date-fns'
import { es } from 'date-fns/locale'

type DayMenu = {
  date: Date
  status: string
  firsts: unknown[]
  seconds: unknown[]
  desserts: unknown[]
}

type WeeklyMenuViewProps = {
  weekStart: Date
  weekEnd: Date
  menus: Record<string, DayMenu>
}

function toWeekParam(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function WeeklyMenuView({
  weekStart,
  weekEnd,
  menus,
}: WeeklyMenuViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigateToWeek = (targetDate: Date) => {
    startTransition(() => {
      router.push(`/catering/menus?week=${toWeekParam(targetDate)}`)
    })
  }

  const handlePreviousWeek = () => navigateToWeek(subWeeks(weekStart, 1))
  const handleNextWeek = () => navigateToWeek(addWeeks(weekStart, 1))
  const handleToday = () => navigateToWeek(new Date())

  const handlePublishSuccess = () => {
    router.refresh()
  }

  // Validar si todos los días tienen menús completos
  const validationErrors: string[] = []
  Object.entries(menus).forEach(([dateKey, menu]) => {
    if (!menu.firsts || menu.firsts.length === 0) {
      validationErrors.push(`${dateKey}: falta primeros`)
    }
    if (!menu.seconds || menu.seconds.length === 0) {
      validationErrors.push(`${dateKey}: falta segundos`)
    }
  })
  if (Object.keys(menus).length === 0) {
    validationErrors.push('No hay menús configurados en esta semana')
  }

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousWeek}
              disabled={isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center min-w-[250px]">
              <p className="text-lg font-semibold text-gray-900">
                {format(weekStart, "dd 'de' MMMM", { locale: es })} -{' '}
                {format(weekEnd, "dd 'de' MMMM yyyy", { locale: es })}
              </p>
              <p className="text-sm text-gray-500">Semana seleccionada</p>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextWeek}
              disabled={isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToday}
              disabled={isPending}
            >
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
      {isPending ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
            <p className="text-gray-500">Cargando menús...</p>
          </div>
        </Card>
      ) : (
        <WeeklyMenuCalendar
          weekStart={weekStart}
          menus={menus as React.ComponentProps<typeof WeeklyMenuCalendar>['menus']}
        />
      )}

      {/* Ayuda */}
      <Card className="p-6 bg-primary/10 border-primary/30">
        <h3 className="font-semibold text-primary mb-2">
          Cómo funciona
        </h3>
        <ul className="text-sm text-primary space-y-1 list-disc list-inside">
          <li>
            Haz clic en &quot;Crear&quot; o &quot;Editar&quot; para configurar
            el menú de cada día
          </li>
          <li>Cada día debe tener al menos un primer plato y un segundo plato</li>
          <li>Los postres son opcionales</li>
          <li>
            Una vez configurados todos los días, haz clic en &quot;Publicar
            Semana&quot;
          </li>
          <li>Los empleados solo verán los menús publicados</li>
        </ul>
      </Card>
    </div>
  )
}
