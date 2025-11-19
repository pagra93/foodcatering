'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

type Nutrition = {
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  salt?: number
}

type NutritionInputProps = {
  value: Nutrition
  onChange: (nutrition: Nutrition) => void
  errors?: Record<string, string>
}

export function NutritionInput({
  value,
  onChange,
  errors = {},
}: NutritionInputProps) {
  const handleChange = (field: keyof Nutrition, inputValue: string) => {
    const numValue = inputValue === '' ? undefined : parseFloat(inputValue)
    onChange({
      ...value,
      [field]: numValue,
    })
  }

  const nutritionFields = [
    { key: 'kcal', label: 'Calorías (kcal)', max: 5000, step: 1 },
    { key: 'protein', label: 'Proteínas (g)', max: 500, step: 0.1 },
    { key: 'carbs', label: 'Carbohidratos (g)', max: 500, step: 0.1 },
    { key: 'fat', label: 'Grasas (g)', max: 500, step: 0.1 },
    { key: 'fiber', label: 'Fibra (g)', max: 100, step: 0.1 },
    { key: 'salt', label: 'Sal (g)', max: 50, step: 0.1 },
  ] as const

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Información Nutricional (por ración)
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nutritionFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`nutrition-${field.key}`}>
              {field.label}
            </Label>
            <Input
              id={`nutrition-${field.key}`}
              type="number"
              min={0}
              max={field.max}
              step={field.step}
              value={value[field.key] ?? ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder="0"
            />
            {errors[field.key] && (
              <p className="text-sm text-red-600">{errors[field.key]}</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Todos los campos son opcionales. Valores aproximados por ración estándar.
      </p>
    </Card>
  )
}

