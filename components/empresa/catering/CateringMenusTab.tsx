'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Utensils,
  ChevronLeft,
  ChevronRight,
  Leaf,
  AlertCircle,
  Info,
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

type CateringMenusTabProps = {
  cateringId: string
}

type DishData = {
  scheduleId: string
  dishId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  allergens: string[] | null
  nutritionData: any
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
  maxQuantity: number
  currentQuantity: number
  available: boolean
}

type DayMenu = {
  date: Date
  starters: DishData[]
  mains: DishData[]
  desserts: DishData[]
}

export function CateringMenusTab({ cateringId }: CateringMenusTabProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [menus, setMenus] = useState<DayMenu[]>([])
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  useEffect(() => {
    loadMenus()
  }, [currentWeek, cateringId])

  const loadMenus = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/empresa/catering/menus?cateringId=${cateringId}&startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      )
      if (response.ok) {
        const data = await response.json()
        setMenus(data)
      }
    } catch (error) {
      console.error('Error loading menus:', error)
    } finally {
      setLoading(false)
    }
  }

  const previousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  const thisWeek = () => {
    setCurrentWeek(new Date())
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selector de Semana */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={previousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {format(weekStart, "d 'de' MMMM", { locale: es })} -{' '}
              {format(weekEnd, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
            <Button variant="ghost" size="sm" onClick={thisWeek} className="mt-1">
              Esta semana
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Menús por Día */}
      {menus.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>No hay menús disponibles para esta semana</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {menus.map((menu) => (
            <DayMenuCard key={menu.date.toISOString()} menu={menu} />
          ))}
        </div>
      )}
    </div>
  )
}

function DayMenuCard({ menu }: { menu: DayMenu }) {
  return (
    <Card className="p-6">
      {/* Header del Día */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {format(new Date(menu.date), "EEEE d 'de' MMMM", { locale: es })}
        </h3>
      </div>

      {/* Primeros */}
      {menu.starters.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Primeros</h4>
          <div className="space-y-2">
            {menu.starters.map((dish) => (
              <DishCard key={dish.scheduleId} dish={dish} />
            ))}
          </div>
        </div>
      )}

      {/* Segundos */}
      {menu.mains.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Segundos</h4>
          <div className="space-y-2">
            {menu.mains.map((dish) => (
              <DishCard key={dish.scheduleId} dish={dish} />
            ))}
          </div>
        </div>
      )}

      {/* Postres */}
      {menu.desserts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Postres</h4>
          <div className="space-y-2">
            {menu.desserts.map((dish) => (
              <DishCard key={dish.scheduleId} dish={dish} />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function DishCard({ dish }: { dish: DishData }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="rounded-lg border p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 text-sm">{dish.name}</p>
            <div className="flex items-center gap-1">
              {dish.isVegan && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  <Leaf className="h-3 w-3 text-green-600" />
                </Badge>
              )}
              {dish.isVegetarian && !dish.isVegan && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  <Leaf className="h-3 w-3 text-green-500" />
                </Badge>
              )}
              {dish.isGlutenFree && (
                <Badge variant="outline" className="text-xs">
                  Sin gluten
                </Badge>
              )}
            </div>
          </div>

          {dish.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {dish.description}
            </p>
          )}

          {/* Alérgenos */}
          {dish.allergens && dish.allergens.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <AlertCircle className="h-3 w-3 text-orange-500" />
              <p className="text-xs text-gray-500">
                Alérgenos: {dish.allergens.join(', ')}
              </p>
            </div>
          )}

          {/* Disponibilidad */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {dish.currentQuantity}/{dish.maxQuantity} pedidos
            </p>
            {!dish.available && (
              <Badge variant="destructive" className="text-xs">
                Agotado
              </Badge>
            )}
          </div>
        </div>

        {dish.imageUrl && (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="h-16 w-16 rounded-md object-cover ml-3"
          />
        )}
      </div>

      {/* Botón ver más */}
      {dish.nutritionData && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info className="h-3 w-3 mr-1" />
          {showDetails ? 'Ocultar' : 'Ver'} información nutricional
        </Button>
      )}

      {/* Información Nutricional */}
      {showDetails && dish.nutritionData && (
        <div className="mt-3 pt-3 border-t">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {dish.nutritionData.calories && (
              <div>
                <p className="text-gray-600">Calorías</p>
                <p className="font-medium">{dish.nutritionData.calories} kcal</p>
              </div>
            )}
            {dish.nutritionData.protein && (
              <div>
                <p className="text-gray-600">Proteínas</p>
                <p className="font-medium">{dish.nutritionData.protein}g</p>
              </div>
            )}
            {dish.nutritionData.carbs && (
              <div>
                <p className="text-gray-600">Carbohidratos</p>
                <p className="font-medium">{dish.nutritionData.carbs}g</p>
              </div>
            )}
            {dish.nutritionData.fat && (
              <div>
                <p className="text-gray-600">Grasas</p>
                <p className="font-medium">{dish.nutritionData.fat}g</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

