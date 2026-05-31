/**
 * Tab de Menús & Platos para Caterings
 * Incluye: Catálogo de platos, Programación semanal, Precios, Activación/Desactivación
 */

'use client'

import { useState } from 'react'
import {
  UtensilsCrossed,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Power,
  PowerOff,
  Calendar,
  Euro,
  AlertCircle,
  ChefHat,
  Leaf,
  Wheat,
  Fish,
  Milk,
  Egg,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Dish = {
  id: string
  name: string
  course: string
  labels: string[]
  nutrition: any
  basePrice: number
  active: boolean
  scheduledDays: number
}

type MenusDishesTabProps = {
  dishes: Dish[]
  cateringId: string
}

// Labels de alérgenos y características
const DISH_LABELS: Record<string, { icon: any; color: string; label: string }> = {
  vegetarian: { icon: Leaf, color: 'bg-green-100 text-green-800 border-green-300', label: 'Vegetariano' },
  vegan: { icon: Leaf, color: 'bg-green-100 text-green-800 border-green-300', label: 'Vegano' },
  gluten_free: { icon: Wheat, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Sin Gluten' },
  lactose_free: { icon: Milk, color: 'bg-primary/10 text-primary border-primary/40', label: 'Sin Lactosa' },
  contains_fish: { icon: Fish, color: 'bg-cyan-100 text-cyan-800 border-cyan-300', label: 'Pescado' },
  contains_eggs: { icon: Egg, color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Huevo' },
  spicy: { icon: AlertCircle, color: 'bg-red-100 text-red-800 border-red-300', label: 'Picante' },
}

// Datos mock para platos (si no hay datos reales)
const getMockDishes = (): Dish[] => [
  {
    id: '1',
    name: 'Ensalada César',
    course: 'STARTER',
    labels: ['vegetarian', 'contains_eggs'],
    nutrition: { calories: 250, protein: 12, carbs: 15, fat: 18 },
    basePrice: 5.5,
    active: true,
    scheduledDays: 5,
  },
  {
    id: '2',
    name: 'Pasta Carbonara',
    course: 'MAIN',
    labels: ['contains_eggs'],
    nutrition: { calories: 450, protein: 22, carbs: 55, fat: 18 },
    basePrice: 7.5,
    active: true,
    scheduledDays: 3,
  },
  {
    id: '3',
    name: 'Pollo al Curry',
    course: 'MAIN',
    labels: ['gluten_free', 'spicy'],
    nutrition: { calories: 380, protein: 35, carbs: 25, fat: 15 },
    basePrice: 8.0,
    active: true,
    scheduledDays: 4,
  },
  {
    id: '4',
    name: 'Salmón a la Plancha',
    course: 'MAIN',
    labels: ['contains_fish', 'gluten_free'],
    nutrition: { calories: 320, protein: 30, carbs: 5, fat: 20 },
    basePrice: 9.5,
    active: true,
    scheduledDays: 2,
  },
  {
    id: '5',
    name: 'Tarta de Manzana',
    course: 'DESSERT',
    labels: ['vegetarian', 'contains_eggs'],
    nutrition: { calories: 280, protein: 4, carbs: 42, fat: 12 },
    basePrice: 3.5,
    active: true,
    scheduledDays: 7,
  },
  {
    id: '6',
    name: 'Gazpacho Andaluz',
    course: 'STARTER',
    labels: ['vegan', 'gluten_free'],
    nutrition: { calories: 120, protein: 3, carbs: 18, fat: 5 },
    basePrice: 4.0,
    active: false,
    scheduledDays: 0,
  },
]

export function MenusDishesTab({ dishes: propDishes, cateringId: _cateringId }: MenusDishesTabProps) {
  const dishes = propDishes.length > 0 ? propDishes : getMockDishes()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Filtrar platos
  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = filterCourse === 'all' || dish.course === filterCourse
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && dish.active) ||
      (filterStatus === 'inactive' && !dish.active)
    return matchesSearch && matchesCourse && matchesStatus
  })

  // Contar platos por categoría
  const starters = dishes.filter((d) => d.course === 'STARTER').length
  const mains = dishes.filter((d) => d.course === 'MAIN').length
  const desserts = dishes.filter((d) => d.course === 'DESSERT').length
  const activeDishes = dishes.filter((d) => d.active).length

  // Helper para obtener el label del curso
  const getCourseLabel = (course: string): string => {
    const labels: Record<string, string> = {
      STARTER: 'Primero',
      MAIN: 'Segundo',
      DESSERT: 'Postre',
    }
    return labels[course] || course
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Menús & Platos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestión del catálogo de platos y programación semanal
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Plato
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Platos</p>
                <p className="text-2xl font-bold text-gray-900">{dishes.length}</p>
              </div>
              <UtensilsCrossed className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Activos</p>
                <p className="text-2xl font-bold text-green-600">{activeDishes}</p>
              </div>
              <Power className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">1º / 2º / Postre</p>
                <p className="text-lg font-bold text-gray-900">
                  {starters} / {mains} / {desserts}
                </p>
              </div>
              <ChefHat className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Precio Medio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(dishes.reduce((sum, d) => sum + d.basePrice, 0) / dishes.length).toFixed(2)}€
                </p>
              </div>
              <Euro className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Búsqueda */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar platos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  <SelectItem value="STARTER">Primeros</SelectItem>
                  <SelectItem value="MAIN">Segundos</SelectItem>
                  <SelectItem value="DESSERT">Postres</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Platos */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">
            Catálogo de Platos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plato</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Características</TableHead>
                <TableHead>Nutrición</TableHead>
                <TableHead>Precio Base</TableHead>
                <TableHead>Programado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDishes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-gray-500"
                  >
                    <UtensilsCrossed className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm">No se encontraron platos</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ajusta los filtros o crea un nuevo plato
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDishes.map((dish) => (
                  <TableRow key={dish.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium text-gray-900">{dish.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCourseLabel(dish.course)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dish.labels.slice(0, 3).map((label) => {
                          const labelConfig = DISH_LABELS[label]
                          if (!labelConfig) return null
                          const Icon = labelConfig.icon
                          return (
                            <Badge
                              key={label}
                              variant="outline"
                              className={`text-xs ${labelConfig.color}`}
                            >
                              <Icon className="mr-1 h-3 w-3" />
                              {labelConfig.label}
                            </Badge>
                          )
                        })}
                        {dish.labels.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{dish.labels.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dish.nutrition && (
                        <div className="text-xs text-gray-600">
                          <div>{dish.nutrition.calories} kcal</div>
                          <div className="text-gray-400">
                            P: {dish.nutrition.protein}g | C: {dish.nutrition.carbs}g
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900">
                          {dish.basePrice.toFixed(2)}€
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {dish.scheduledDays > 0 ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-gray-900">
                            {dish.scheduledDays} días
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Sin programar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dish.active ? (
                        <Badge variant="success" className="flex items-center gap-1 w-fit">
                          <Power className="h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <PowerOff className="h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={dish.active ? 'text-red-600' : 'text-green-600'}
                        >
                          {dish.active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Programación Semanal */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Programación Semanal
            </CardTitle>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Editar Programación
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Resumen de programación */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-primary">Platos Programados</p>
                    <p className="text-lg font-bold text-primary">
                      {dishes.filter((d) => d.scheduledDays > 0).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-green-100">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-green-700">Días Cubiertos</p>
                    <p className="text-lg font-bold text-green-900">7 / 7</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
                    <ChefHat className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-primary">Variedad Media</p>
                    <p className="text-lg font-bold text-primary">
                      {Math.round((starters + mains + desserts) / 7)} opciones/día
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>💡 Nota:</strong> La programación semanal define qué platos
                están disponibles cada día. Los empleados solo podrán seleccionar de
                los platos programados para su día de servicio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

