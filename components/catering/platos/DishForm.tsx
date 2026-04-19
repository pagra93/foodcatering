'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { NutritionInput } from './NutritionInput'
import { AllergenTagSelector } from './AllergenTagSelector'
import {
  createDishSchema,
  updateDishSchema,
  DISH_COURSE_LABELS,
  type CreateDishInput,
  type UpdateDishInput,
  type DishCourse,
  type Allergen,
  type NutritionTag,
  type Nutrition,
  parseDishLabels,
} from '@/lib/validations/dish'
import { toast } from 'sonner'
import { Loader2, Save, X } from 'lucide-react'

type DishFormProps = {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    course: string
    ingredients?: string
    labels: string[]
    nutrition: object
    basePrice: number
    active: boolean
  }
  onSubmit: (data: CreateDishInput | UpdateDishInput) => Promise<void>
  onCancel: () => void
}

export function DishForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: DishFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Parsear labels iniciales si están disponibles
  const initialLabels = initialData
    ? parseDishLabels(initialData.labels)
    : { allergens: [], tags: [] }

  // Estado local para campos complejos
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>(
    initialLabels.allergens
  )
  const [selectedTags, setSelectedTags] = useState<NutritionTag[]>(
    initialLabels.tags
  )
  const [nutrition, setNutrition] = useState<Nutrition>(
    (initialData?.nutrition as Nutrition) || {}
  )

  // Form con react-hook-form + zod
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateDishInput | UpdateDishInput>({
    resolver: zodResolver(mode === 'create' ? createDishSchema : updateDishSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          course: initialData.course as DishCourse,
          ingredients: initialData.ingredients,
          basePrice: initialData.basePrice,
          active: initialData.active,
          allergens: initialLabels.allergens,
          tags: initialLabels.tags,
          nutrition: initialData.nutrition as Nutrition,
        }
      : {
          course: 'FIRST' as DishCourse,
          active: true,
          allergens: [],
          tags: [],
          nutrition: {},
        },
  })

  const courseValue = watch('course')
  const activeValue = watch('active')

  const onSubmitForm = async (data: CreateDishInput | UpdateDishInput) => {
    setLoading(true)

    try {
      // Combinar con los estados locales
      const submitData = {
        ...data,
        allergens: selectedAllergens,
        tags: selectedTags,
        nutrition,
      }

      await onSubmit(submitData)

      toast.success(
        mode === 'create' ? 'Plato creado correctamente' : 'Plato actualizado correctamente'
      )

      router.push('/catering/platos')
      router.refresh()
    } catch (error: any) {
      console.error('Form submission error:', error)
      toast.error(error.message || 'Error al guardar el plato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Información Básica */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Información Básica
        </h3>
        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <Label htmlFor="name">
              Nombre del plato <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Lentejas estofadas con verduras"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Tipo de plato */}
          <div>
            <Label htmlFor="course">
              Tipo de plato <span className="text-red-500">*</span>
            </Label>
            <Select
              value={courseValue}
              onValueChange={(value) => setValue('course', value as DishCourse)}
            >
              <SelectTrigger
                id="course"
                className={errors.course ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DISH_COURSE_LABELS) as [DishCourse, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.course && (
              <p className="text-sm text-red-600 mt-1">{errors.course.message}</p>
            )}
          </div>

          {/* Ingredientes */}
          <div>
            <Label htmlFor="ingredients">
              Ingredientes <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="ingredients"
              {...register('ingredients')}
              placeholder="Lista los ingredientes principales separados por comas"
              rows={3}
              className={errors.ingredients ? 'border-red-500' : ''}
            />
            {errors.ingredients && (
              <p className="text-sm text-red-600 mt-1">
                {errors.ingredients.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Ej: Lentejas, zanahoria, cebolla, pimiento, tomate, aceite de oliva
            </p>
          </div>

          {/* Descripción (opcional) */}
          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descripción breve del plato para los empleados"
              rows={2}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Precio */}
          <div>
            <Label htmlFor="basePrice">
              Precio base (€) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="basePrice"
              type="number"
              step="0.01"
              min="0.01"
              max="50"
              {...register('basePrice', { valueAsNumber: true })}
              placeholder="0.00"
              className={errors.basePrice ? 'border-red-500' : ''}
            />
            {errors.basePrice && (
              <p className="text-sm text-red-600 mt-1">
                {errors.basePrice.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Precio base del plato. Puede ser ajustado por menú.
            </p>
          </div>

          {/* Estado activo */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="active">Plato activo</Label>
              <p className="text-sm text-gray-500">
                Los platos inactivos no pueden añadirse a nuevos menús
              </p>
            </div>
            <Switch
              id="active"
              checked={activeValue}
              onCheckedChange={(checked) => setValue('active', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Alérgenos y Etiquetas */}
      <AllergenTagSelector
        selectedAllergens={selectedAllergens}
        selectedTags={selectedTags}
        onAllergensChange={setSelectedAllergens}
        onTagsChange={setSelectedTags}
      />

      {/* Información Nutricional */}
      <NutritionInput
        value={nutrition}
        onChange={setNutrition}
        errors={errors.nutrition as any}
      />

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? 'Crear plato' : 'Guardar cambios'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

