/**
 * Selector de Platos para un Día
 * Permite elegir primero, segundo y postre
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  Clock,
  Lock,
  AlertTriangle,
  Utensils,
  Leaf,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { DietPrefs } from '@/lib/types/diet-prefs'
import type { Prisma } from '@prisma/client'

type DishLike = {
  id: string
  name: string
  course: 'FIRST' | 'SECOND' | 'DESSERT'
  description: string | null
  imageUrl?: string | null
  price: number
  allergens?: { code: string; name: string }[]
  isVegetarian?: boolean
  isVegan?: boolean
  calories?: number | null
}

type DaySelectorProps = {
  data: {
    date: Date
    isPastCutoff: boolean
    cutoffTime: string
    canEdit: boolean
    existingOrder: {
      id: string
      selection: Prisma.JsonValue
      status: string
    } | null
    dishes: {
      starters: DishLike[]
      mains: DishLike[]
      desserts: DishLike[]
    }
    employee: {
      allergens: { code: string; name: string }[]
      dietPrefs: DietPrefs
      blockAllergensEnabled: boolean
    }
    limits: {
      dailyLimit: number
    }
  }
  employeeId: string
}

export function DaySelector({ data, employeeId }: DaySelectorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado de selección
  const existingSelection = (data.existingOrder?.selection ?? null) as {
    starterId?: string | null
    mainId?: string | null
    dessertId?: string | null
  } | null
  const [selectedStarter, setSelectedStarter] = useState<string | null>(
    existingSelection?.starterId || null
  )
  const [selectedMain, setSelectedMain] = useState<string | null>(
    existingSelection?.mainId || null
  )
  const [selectedDessert, setSelectedDessert] = useState<string | null>(
    existingSelection?.dessertId || null
  )

  // Calcular precio total
  const calculateTotal = () => {
    let total = 0
    if (selectedStarter) {
      const dish = data.dishes.starters.find((d) => d.id === selectedStarter)
      if (dish) total += dish.price
    }
    if (selectedMain) {
      const dish = data.dishes.mains.find((d) => d.id === selectedMain)
      if (dish) total += dish.price
    }
    if (selectedDessert) {
      const dish = data.dishes.desserts.find((d) => d.id === selectedDessert)
      if (dish) total += dish.price
    }
    return total
  }

  const totalPrice = calculateTotal()
  const isOverLimit = totalPrice > data.limits.dailyLimit
  const isValid = selectedMain !== null && !isOverLimit

  // Enviar selección
  const handleSubmit = async () => {
    if (!isValid || !data.canEdit) return

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/empleado/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: format(data.date, 'yyyy-MM-dd'),
          selection: {
            starterId: selectedStarter || undefined,
            mainId: selectedMain!,
            dessertId: selectedDessert || undefined,
          },
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al guardar el pedido')
      }

      toast.success('¡Menú guardado correctamente!')
      router.push('/empleado/menus')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el pedido')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizar plato
  const renderDish = (
    dish: DishLike,
    isSelected: boolean,
    onSelect: () => void,
    _isRequired: boolean = false
  ) => {
    // Detectar alérgenos del empleado en el plato (match por código, muestra nombre)
    const empCodes = new Set(data.employee.allergens.map((a) => a.code))
    const matchingAllergens = (dish.allergens || [])
      .filter((a) => empCodes.has(a.code))
      .map((a) => a.name)
    const hasAllergen = matchingAllergens.length > 0

    // Determinar si está bloqueado
    const isBlocked = hasAllergen && data.employee.blockAllergensEnabled

    return (
      <Card
        key={dish.id}
        onClick={data.canEdit && !isBlocked ? onSelect : undefined}
        className={cn(
          'p-4 transition-all',
          isSelected
            ? 'border-primary border-2 bg-primary/10'
            : hasAllergen && !isBlocked
            ? 'border-red-300 border-2 bg-red-50'
            : isBlocked
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
            : 'border-gray-200 hover:border-gray-300',
          data.canEdit && !isBlocked ? 'cursor-pointer' : 'cursor-not-allowed',
          !data.canEdit && 'opacity-60'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox visual */}
          <div
            className={cn(
              'mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center',
              isSelected
                ? 'border-primary bg-primary'
                : 'border-gray-300 bg-white'
            )}
          >
            {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
          </div>

          {/* Contenido */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{dish.name}</h4>
                {dish.description && (
                  <p className="text-sm text-gray-600 mt-1">{dish.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="ml-2">
                {dish.price.toFixed(2)}€
              </Badge>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {dish.isVegetarian && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-700">
                  <Leaf className="mr-1 h-3 w-3" />
                  Vegetariano
                </Badge>
              )}
              {dish.isVegan && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-700">
                  <Leaf className="mr-1 h-3 w-3" />
                  Vegano
                </Badge>
              )}
              {hasAllergen && !isBlocked && (
                <Badge variant="destructive" className="text-xs font-semibold">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  ⚠️ Contiene: {matchingAllergens.join(', ')}
                </Badge>
              )}
              {isBlocked && (
                <Badge variant="secondary" className="text-xs font-semibold bg-gray-200 text-gray-700">
                  🔒 Bloqueado por alérgenos
                </Badge>
              )}
            </div>

            {/* Calories */}
            {dish.calories && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {dish.calories} kcal
              </p>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {format(data.date, "EEEE, d 'de' MMMM", { locale: es })}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          {data.isPastCutoff ? (
            <Badge variant="secondary" className="text-xs">
              <Lock className="mr-1 h-3 w-3" />
              Cutoff pasado - Solo lectura
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Puedes editar hasta las {data.cutoffTime}
            </Badge>
          )}
        </div>
      </div>

      {/* Alerts */}
      {data.employee.allergens.length > 0 && (
        <Alert className={data.employee.blockAllergensEnabled ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}>
          <AlertTriangle className={cn('h-4 w-4', data.employee.blockAllergensEnabled ? 'text-red-600' : 'text-yellow-600')} />
          <AlertDescription className={data.employee.blockAllergensEnabled ? 'text-red-800' : 'text-yellow-800'}>
            {data.employee.blockAllergensEnabled ? (
              <>
                <strong>Protección activa:</strong> Los platos que contengan tus alérgenos ({data.employee.allergens.map((a) => a.name).join(', ')}) están <strong>bloqueados</strong> y no podrás seleccionarlos.
              </>
            ) : (
              <>
                <strong>Advertencia:</strong> Tienes alérgenos configurados ({data.employee.allergens.map((a) => a.name).join(', ')}). Los platos que los contengan mostrarán una advertencia pero podrás seleccionarlos. Activa el bloqueo en tu perfil para mayor seguridad.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isOverLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            El precio total ({totalPrice.toFixed(2)}€) supera el límite diario de{' '}
            {data.limits.dailyLimit.toFixed(2)}€.
          </AlertDescription>
        </Alert>
      )}

      {!data.canEdit && !data.isPastCutoff && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Este pedido ya está bloqueado y no se puede modificar.
          </AlertDescription>
        </Alert>
      )}

      {/* Primeros */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          Primer Plato (Opcional)
        </h2>
        {data.dishes.starters.length > 0 ? (
          <div className="space-y-3">
            {data.dishes.starters.map((dish) =>
              renderDish(dish, selectedStarter === dish.id, () =>
                setSelectedStarter(selectedStarter === dish.id ? null : dish.id)
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No hay primeros disponibles hoy</p>
        )}
      </div>

      {/* Segundos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          Segundo Plato (Obligatorio)
        </h2>
        {data.dishes.mains.length > 0 ? (
          <div className="space-y-3">
            {data.dishes.mains.map((dish) =>
              renderDish(dish, selectedMain === dish.id, () =>
                setSelectedMain(dish.id), true
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No hay segundos disponibles hoy</p>
        )}
      </div>

      {/* Postres */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          Postre (Opcional)
        </h2>
        {data.dishes.desserts.length > 0 ? (
          <div className="space-y-3">
            {data.dishes.desserts.map((dish) =>
              renderDish(dish, selectedDessert === dish.id, () =>
                setSelectedDessert(selectedDessert === dish.id ? null : dish.id)
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No hay postres disponibles hoy</p>
        )}
      </div>

      {/* Footer */}
      <Card className="p-4 bg-gray-50 border-gray-200 sticky bottom-20 md:bottom-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p
              className={cn(
                'text-2xl font-bold',
                isOverLimit ? 'text-red-600' : 'text-gray-900'
              )}
            >
              {totalPrice.toFixed(2)}€
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Límite: {data.limits.dailyLimit.toFixed(2)}€
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!isValid || !data.canEdit || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : data.existingOrder ? 'Actualizar' : 'Confirmar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

