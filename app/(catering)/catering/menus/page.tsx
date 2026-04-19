/**
 * Página: Menús Semanales
 * Ruta: /catering/menus
 *
 * Server Component: calcula la semana activa a partir de `?week=YYYY-MM-DD`
 * (o usa la semana actual por defecto), carga los menús con `getWeeklyMenu()`
 * y delega la navegación al componente cliente `WeeklyMenuView`.
 */

import { redirect } from 'next/navigation'
import { endOfWeek, parseISO, startOfWeek } from 'date-fns'
import { getRequiredSession } from '@/lib/auth/session'
import { getWeeklyMenu } from '@/lib/db/queries/catering-menus'
import { WeeklyMenuView } from '@/components/catering/menus/WeeklyMenuView'

type SearchParams = {
  week?: string
}

type PageProps = {
  searchParams: Promise<SearchParams>
}

function parseWeekParam(raw: string | undefined): Date {
  if (!raw) return new Date()
  const parsed = parseISO(raw)
  if (Number.isNaN(parsed.getTime())) return new Date()
  return parsed
}

export default async function MenusWeeklyPage({ searchParams }: PageProps) {
  const session = await getRequiredSession()

  if (session.user.tenantType !== 'CATERING') {
    redirect('/unauthorized')
  }

  const params = await searchParams
  const reference = parseWeekParam(params.week)
  const weekStart = startOfWeek(reference, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(reference, { weekStartsOn: 1 })

  const menus = await getWeeklyMenu(session.user.tenantId, {
    startDate: weekStart,
    endDate: weekEnd,
  })

  return (
    <WeeklyMenuView
      weekStart={weekStart}
      weekEnd={weekEnd}
      menus={menus}
    />
  )
}
