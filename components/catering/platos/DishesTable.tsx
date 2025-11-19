'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Edit, Copy, Trash2, Eye, Power, PowerOff } from 'lucide-react'
import { DISH_COURSE_LABELS, parseDishLabels, ALLERGEN_LABELS } from '@/lib/validations/dish'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

type Dish = {
  id: string
  name: string
  course: string
  ingredients: string
  labels: string[]
  basePrice: number
  active: boolean
  createdAt: Date
  scheduledDates?: Date[]
  schedulesCount: number
}

type DishesTableProps = {
  dishes: Dish[]
  onDelete: (dishId: string) => Promise<void>
  onClone: (dishId: string) => Promise<void>
  onToggleActive: (dishId: string, active: boolean) => Promise<void>
}

export function DishesTable({
  dishes,
  onDelete,
  onClone,
  onToggleActive,
}: DishesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const handleDeleteClick = (dishId: string) => {
    setSelectedDishId(dishId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedDishId) return

    setLoading(selectedDishId)
    try {
      await onDelete(selectedDishId)
      toast.success('Plato eliminado correctamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el plato')
    } finally {
      setLoading(null)
      setDeleteDialogOpen(false)
      setSelectedDishId(null)
    }
  }

  const handleClone = async (dishId: string) => {
    setLoading(dishId)
    try {
      await onClone(dishId)
      toast.success('Plato clonado correctamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al clonar el plato')
    } finally {
      setLoading(null)
    }
  }

  const handleToggleActive = async (dishId: string, currentActive: boolean) => {
    setLoading(dishId)
    try {
      await onToggleActive(dishId, !currentActive)
      toast.success(
        currentActive ? 'Plato desactivado correctamente' : 'Plato activado correctamente'
      )
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar el estado del plato')
    } finally {
      setLoading(null)
    }
  }

  if (dishes.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-gray-500 mb-4">No se encontraron platos</p>
        <Link href="/catering/platos/nuevo">
          <Button>Crear primer plato</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Alérgenos</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Menús</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dishes.map((dish) => {
              const { allergens } = parseDishLabels(dish.labels)
              const isLoading = loading === dish.id

              return (
                <TableRow key={dish.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{dish.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {dish.ingredients}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {DISH_COURSE_LABELS[dish.course as keyof typeof DISH_COURSE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {allergens.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {allergens.slice(0, 3).map((allergen) => (
                          <Badge
                            key={allergen}
                            variant="secondary"
                            className="text-xs"
                          >
                            {ALLERGEN_LABELS[allergen]}
                          </Badge>
                        ))}
                        {allergens.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{allergens.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Sin alérgenos</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {dish.basePrice.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    {dish.active ? (
                      <Badge variant="default" className="bg-green-600">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{dish.schedulesCount}</span>
                      <span className="text-gray-500 ml-1">publicados</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLoading}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Abrir menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/catering/platos/${dish.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/catering/platos/${dish.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleClone(dish.id)}
                          disabled={isLoading}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Clonar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(dish.id, dish.active)}
                          disabled={isLoading}
                        >
                          {dish.active ? (
                            <>
                              <PowerOff className="mr-2 h-4 w-4" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <Power className="mr-2 h-4 w-4" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(dish.id)}
                          disabled={isLoading}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el plato permanentemente. Si el plato está
              en menús futuros publicados, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

