import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getDailyMenu } from '@/lib/db/queries/catering-menus'
import { DayMenuEditor } from '@/components/catering/menus/DayMenuEditor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type PageProps = {
  params: {
    date: string
  }
}

async function DayMenuEditorWrapper({ date }: { date: Date }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Obtener menú del día
  const menu = await getDailyMenu(session.user.tenantId, date)

  // Obtener todos los platos activos del catering
  const dishes = await prisma.dish.findMany({
    where: {
      tenantId: session.user.tenantId,
      active: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      course: true,
      basePrice: true,
      active: true,
      labels: true,
    },
    orderBy: [
      { course: 'asc' },
      { name: 'asc' },
    ],
  })

  const availableDishes = dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    course: dish.course,
    basePrice: Number(dish.basePrice),
    active: dish.active,
    labels: dish.labels as string[],
  }))

  const initialMenu = {
    firsts: menu.firsts.map((d: any) => ({
      scheduleId: d.scheduleId,
      dishId: d.dishId,
      name: d.name,
      basePrice: d.basePrice,
      priceOverride: d.priceOverride,
      labels: d.labels,
    })),
    seconds: menu.seconds.map((d: any) => ({
      scheduleId: d.scheduleId,
      dishId: d.dishId,
      name: d.name,
      basePrice: d.basePrice,
      priceOverride: d.priceOverride,
      labels: d.labels,
    })),
    desserts: menu.desserts.map((d: any) => ({
      scheduleId: d.scheduleId,
      dishId: d.dishId,
      name: d.name,
      basePrice: d.basePrice,
      priceOverride: d.priceOverride,
      labels: d.labels,
    })),
    status: menu.status,
  }

  return (
    <DayMenuEditor
      date={date}
      availableDishes={availableDishes}
      initialMenu={initialMenu}
    />
  )
}

export default function DayMenuPage({ params }: PageProps) {
  // Parsear y validar fecha
  const date = new Date(params.date)

  if (isNaN(date.getTime())) {
    notFound()
  }

  const dateStr = format(date, "EEEE, dd 'de' MMMM yyyy", { locale: es })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/catering/menus">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a vista semanal
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">
              {dateStr}
            </h1>
            <p className="text-gray-600 mt-1">
              Configura el menú de este día
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {format(date, 'dd/MM/yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <Suspense
        fallback={
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
              <p className="text-gray-500">Cargando editor...</p>
            </div>
          </Card>
        }
      >
        <DayMenuEditorWrapper date={date} />
      </Suspense>

      {/* Ayuda contextual */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">
          💡 Consejos
        </h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Selecciona al menos un primer plato y un segundo plato</li>
          <li>Los postres son opcionales pero recomendados</li>
          <li>Puedes añadir hasta 5 opciones de cada tipo</li>
          <li>Guarda los cambios antes de salir</li>
          <li>Recuerda publicar la semana desde la vista principal</li>
        </ul>
      </Card>
    </div>
  )
}

