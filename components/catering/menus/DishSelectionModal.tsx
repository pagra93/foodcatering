'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, X } from 'lucide-react'

type Dish = {
  id: string
  name: string
  course: string
  basePrice: number
  active: boolean
  labels?: string[]
}

type DishSelectionModalProps = {
  open: boolean
  onClose: () => void
  dishes: Dish[]
  selectedDishIds: string[]
  onSelect: (dishIds: string[]) => void
  course: 'FIRST' | 'SECOND' | 'DESSERT'
  title: string
}

export function DishSelectionModal({
  open,
  onClose,
  dishes,
  selectedDishIds,
  onSelect,
  course,
  title,
}: DishSelectionModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>(selectedDishIds)

  // Actualizar estado interno cuando cambian las props
  useEffect(() => {
    setSelected(selectedDishIds)
  }, [selectedDishIds])

  // Filtrar platos por curso y búsqueda
  const filteredDishes = dishes.filter((dish) => {
    if (dish.course !== course) return false
    if (!dish.active) return false

    if (search) {
      const searchLower = search.toLowerCase()
      return (
        dish.name.toLowerCase().includes(searchLower) ||
        dish.labels?.some((label) => label.toLowerCase().includes(searchLower))
      )
    }

    return true
  })

  const toggleDish = (dishId: string) => {
    setSelected((prev) =>
      prev.includes(dishId)
        ? prev.filter((id) => id !== dishId)
        : [...prev, dishId]
    )
  }

  const handleConfirm = () => {
    onSelect(selected)
    onClose()
  }

  const handleClear = () => {
    setSelected([])
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar platos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contador de seleccionados */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selected.length} plato(s) seleccionado(s)
          </p>
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Lista de platos */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {filteredDishes.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No se encontraron platos</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredDishes.map((dish) => {
                const isSelected = selected.includes(dish.id)

                return (
                  <div
                    key={dish.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => toggleDish(dish.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDish(dish.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {dish.name}
                            </p>
                            {dish.labels && dish.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {dish.labels.slice(0, 3).map((label) => (
                                  <Badge
                                    key={label}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {label}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            {dish.basePrice.toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar ({selected.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

