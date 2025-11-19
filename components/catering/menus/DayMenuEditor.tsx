'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { DishSelectionModal } from './DishSelectionModal'
import { Plus, X, Save, Loader2, AlertCircle } from 'lucide-react'

type Dish = {
  id: string
  name: string
  course: string
  basePrice: number
  active: boolean
  labels?: string[]
}

type SelectedDish = {
  scheduleId?: string
  dishId: string
  name: string
  basePrice: number
  priceOverride?: number | null
  labels?: string[]
}

type DayMenuEditorProps = {
  date: Date
  availableDishes: Dish[]
  initialMenu?: {
    firsts: SelectedDish[]
    seconds: SelectedDish[]
    desserts: SelectedDish[]
    status: string
  }
  onSave?: () => void
  disabled?: boolean
}

export function DayMenuEditor({
  date,
  availableDishes,
  initialMenu,
  onSave,
  disabled = false,
}: DayMenuEditorProps) {
  const [firsts, setFirsts] = useState<string[]>([])
  const [seconds, setSeconds] = useState<string[]>([])
  const [desserts, setDesserts] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCourse, setModalCourse] = useState<'FIRST' | 'SECOND' | 'DESSERT'>('FIRST')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Inicializar con menú existente
  useEffect(() => {
    if (initialMenu) {
      setFirsts(initialMenu.firsts.map((d) => d.dishId))
      setSeconds(initialMenu.seconds.map((d) => d.dishId))
      setDesserts(initialMenu.desserts?.map((d) => d.dishId) || [])
    }
  }, [initialMenu])

  const openModal = (course: 'FIRST' | 'SECOND' | 'DESSERT') => {
    setModalCourse(course)
    setModalOpen(true)
  }

  const handleSelectDishes = (dishIds: string[], course: 'FIRST' | 'SECOND' | 'DESSERT') => {
    switch (course) {
      case 'FIRST':
        setFirsts(dishIds)
        break
      case 'SECOND':
        setSeconds(dishIds)
        break
      case 'DESSERT':
        setDesserts(dishIds)
        break
    }
  }

  const handleRemoveDish = (dishId: string, course: 'FIRST' | 'SECOND' | 'DESSERT') => {
    switch (course) {
      case 'FIRST':
        setFirsts((prev) => prev.filter((id) => id !== dishId))
        break
      case 'SECOND':
        setSeconds((prev) => prev.filter((id) => id !== dishId))
        break
      case 'DESSERT':
        setDesserts((prev) => prev.filter((id) => id !== dishId))
        break
    }
  }

  const handleSave = async () => {
    // Validar que tenga al menos primeros y segundos
    if (firsts.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un primer plato',
        variant: 'destructive',
      })
      return
    }

    if (seconds.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un segundo plato',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const dateStr = date.toISOString().split('T')[0]

      const response = await fetch(`/api/catering/menus/dia/${dateStr}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firsts,
          seconds,
          desserts,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }

      toast({
        title: 'Menú guardado',
        description: 'El menú se guardó correctamente',
      })

      onSave?.()
    } catch (error) {
      console.error('Error saving menu:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al guardar menú',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getDishById = (dishId: string): Dish | undefined => {
    return availableDishes.find((d) => d.id === dishId)
  }

  const hasChanges =
    JSON.stringify({
      firsts: firsts.sort(),
      seconds: seconds.sort(),
      desserts: desserts.sort(),
    }) !==
    JSON.stringify({
      firsts: initialMenu?.firsts.map((d) => d.dishId).sort() || [],
      seconds: initialMenu?.seconds.map((d) => d.dishId).sort() || [],
      desserts: initialMenu?.desserts?.map((d) => d.dishId).sort() || [],
    })

  const isValid = firsts.length > 0 && seconds.length > 0

  return (
    <div className="space-y-6">
      {/* Validación */}
      {!isValid && (
        <Card className="border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Menú incompleto</p>
              <p className="text-sm text-yellow-700 mt-1">
                Para publicar el menú debe tener al menos un primer plato y un segundo plato.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Primeros */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Primeros Platos</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openModal('FIRST')}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>

        {firsts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay primeros platos seleccionados
          </p>
        ) : (
          <div className="space-y-2">
            {firsts.map((dishId) => {
              const dish = getDishById(dishId)
              if (!dish) return null

              return (
                <div
                  key={dishId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{dish.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-600">
                        {dish.basePrice.toFixed(2)}€
                      </p>
                      {dish.labels && dish.labels.length > 0 && (
                        <div className="flex gap-1">
                          {dish.labels.slice(0, 2).map((label) => (
                            <Badge key={label} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveDish(dishId, 'FIRST')}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Segundos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Segundos Platos</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openModal('SECOND')}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>

        {seconds.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay segundos platos seleccionados
          </p>
        ) : (
          <div className="space-y-2">
            {seconds.map((dishId) => {
              const dish = getDishById(dishId)
              if (!dish) return null

              return (
                <div
                  key={dishId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{dish.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-600">
                        {dish.basePrice.toFixed(2)}€
                      </p>
                      {dish.labels && dish.labels.length > 0 && (
                        <div className="flex gap-1">
                          {dish.labels.slice(0, 2).map((label) => (
                            <Badge key={label} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveDish(dishId, 'SECOND')}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Postres */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Postres (Opcional)</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openModal('DESSERT')}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>

        {desserts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay postres seleccionados
          </p>
        ) : (
          <div className="space-y-2">
            {desserts.map((dishId) => {
              const dish = getDishById(dishId)
              if (!dish) return null

              return (
                <div
                  key={dishId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{dish.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-600">
                        {dish.basePrice.toFixed(2)}€
                      </p>
                      {dish.labels && dish.labels.length > 0 && (
                        <div className="flex gap-1">
                          {dish.labels.slice(0, 2).map((label) => (
                            <Badge key={label} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveDish(dishId, 'DESSERT')}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Acciones */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={disabled || saving || !hasChanges}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>

      {/* Modal de selección */}
      <DishSelectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dishes={availableDishes}
        selectedDishIds={
          modalCourse === 'FIRST'
            ? firsts
            : modalCourse === 'SECOND'
            ? seconds
            : desserts
        }
        onSelect={(ids) => handleSelectDishes(ids, modalCourse)}
        course={modalCourse}
        title={
          modalCourse === 'FIRST'
            ? 'Seleccionar Primeros'
            : modalCourse === 'SECOND'
            ? 'Seleccionar Segundos'
            : 'Seleccionar Postres'
        }
      />
    </div>
  )
}

