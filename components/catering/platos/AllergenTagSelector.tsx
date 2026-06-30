'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  NUTRITION_TAG_LABELS,
  type AllergenOption,
  type NutritionTag,
} from '@/lib/validations/dish'

type AllergenTagSelectorProps = {
  /** Catálogo de alérgenos activos (tabla Allergen, gestionada por el admin). */
  availableAllergens: AllergenOption[]
  /** IDs de alérgenos seleccionados. */
  selectedAllergens: string[]
  selectedTags: NutritionTag[]
  onAllergensChange: (allergens: string[]) => void
  onTagsChange: (tags: NutritionTag[]) => void
}

export function AllergenTagSelector({
  availableAllergens,
  selectedAllergens,
  selectedTags,
  onAllergensChange,
  onTagsChange,
}: AllergenTagSelectorProps) {
  const handleAllergenToggle = (allergenId: string) => {
    if (selectedAllergens.includes(allergenId)) {
      onAllergensChange(selectedAllergens.filter((a) => a !== allergenId))
    } else {
      onAllergensChange([...selectedAllergens, allergenId])
    }
  }

  const handleTagToggle = (tag: NutritionTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  return (
    <div className="space-y-6">
      {/* Alérgenos */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Alérgenos
          </h3>
          {selectedAllergens.length > 0 && (
            <Badge variant="secondary">
              {selectedAllergens.length} seleccionado(s)
            </Badge>
          )}
        </div>
        {availableAllergens.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay alérgenos en el catálogo. Pide al administrador que los dé de
            alta en Catálogos → Alérgenos.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {availableAllergens.map((allergen) => (
              <div key={allergen.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`allergen-${allergen.id}`}
                  checked={selectedAllergens.includes(allergen.id)}
                  onCheckedChange={() => handleAllergenToggle(allergen.id)}
                />
                <Label
                  htmlFor={`allergen-${allergen.id}`}
                  className="cursor-pointer"
                >
                  {allergen.name}
                </Label>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-4">
          Selecciona todos los alérgenos presentes en el plato. El catálogo lo
          gestiona el administrador.
        </p>
      </Card>

      {/* Etiquetas Nutricionales */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Etiquetas Nutricionales
          </h3>
          {selectedTags.length > 0 && (
            <Badge variant="secondary">
              {selectedTags.length} seleccionada(s)
            </Badge>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(NUTRITION_TAG_LABELS) as [NutritionTag, string][]).map(
            ([tag, label]) => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={`tag-${tag}`}
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={() => handleTagToggle(tag)}
                />
                <Label htmlFor={`tag-${tag}`} className="cursor-pointer">
                  {label}
                </Label>
              </div>
            )
          )}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Etiquetas para ayudar a los empleados a filtrar menús según sus preferencias
        </p>
      </Card>
    </div>
  )
}

