/**
 * Selector de Alérgenos
 * Permite al empleado marcar sus alergias
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import {
  AlertTriangle,
  Shield,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'

// Lista completa de alérgenos según normativa EU
const ALLERGEN_LIST = [
  { id: 'gluten', name: 'Gluten', description: 'Trigo, centeno, cebada, avena' },
  { id: 'crustaceos', name: 'Crustáceos', description: 'Gambas, cangrejos, langostas' },
  { id: 'huevos', name: 'Huevos', description: 'Huevos y productos derivados' },
  { id: 'pescado', name: 'Pescado', description: 'Pescados y derivados' },
  { id: 'cacahuetes', name: 'Cacahuetes', description: 'Cacahuetes y productos derivados' },
  { id: 'soja', name: 'Soja', description: 'Soja y productos derivados' },
  { id: 'lacteos', name: 'Lácteos', description: 'Leche y derivados (lactosa)' },
  { id: 'frutos_secos', name: 'Frutos secos', description: 'Almendras, avellanas, nueces, etc.' },
  { id: 'apio', name: 'Apio', description: 'Apio y derivados' },
  { id: 'mostaza', name: 'Mostaza', description: 'Mostaza y derivados' },
  { id: 'sesamo', name: 'Sésamo', description: 'Semillas de sésamo y derivados' },
  { id: 'sulfitos', name: 'Sulfitos', description: 'Conservantes SO2 >10mg/kg' },
  { id: 'altramuces', name: 'Altramuces', description: 'Altramuces y derivados' },
  { id: 'moluscos', name: 'Moluscos', description: 'Mejillones, almejas, calamares' },
]

type AllergenSelectorProps = {
  employeeId: string
  initialAllergens: string[]
  initialBlockEnabled: boolean
}

export function AllergenSelector({
  employeeId,
  initialAllergens,
  initialBlockEnabled,
}: AllergenSelectorProps) {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(initialAllergens)
  const [blockEnabled, setBlockEnabled] = useState(initialBlockEnabled)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleToggleAllergen = (allergenId: string) => {
    if (selectedAllergens.includes(allergenId)) {
      setSelectedAllergens(selectedAllergens.filter((id) => id !== allergenId))
    } else {
      setSelectedAllergens([...selectedAllergens, allergenId])
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/empleado/alergenos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          allergens: selectedAllergens,
          blockEnabled,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al guardar las alergias')
      }

      toast.success('Alergias actualizadas correctamente')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar las alergias')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedAllergens(initialAllergens)
    setBlockEnabled(initialBlockEnabled)
    setIsEditing(false)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Mis Alergias
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Selecciona los alérgenos que te afectan
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            Editar
          </Button>
        )}
      </div>

      {/* Alergias actuales (vista) */}
      {!isEditing && selectedAllergens.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedAllergens.map((allergenId) => {
            const allergen = ALLERGEN_LIST.find((a) => a.id === allergenId)
            return allergen ? (
              <Badge
                key={allergenId}
                variant="destructive"
                className="text-sm py-1 px-3"
              >
                {allergen.name}
              </Badge>
            ) : null
          })}
        </div>
      )}

      {!isEditing && selectedAllergens.length === 0 && (
        <p className="text-sm text-gray-500 mb-4">
          No has marcado ninguna alergia
        </p>
      )}

      {/* Estado del bloqueo */}
      {!isEditing && selectedAllergens.length > 0 && (
        <Alert className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {blockEnabled ? (
              <span className="text-sm">
                <strong>Bloqueo activado:</strong> No podrás seleccionar platos que contengan tus alérgenos.
              </span>
            ) : (
              <span className="text-sm">
                <strong>Bloqueo desactivado:</strong> Verás advertencias, pero podrás seleccionar cualquier plato.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Modo edición */}
      {isEditing && (
        <div className="space-y-6">
          {/* Lista de alérgenos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALLERGEN_LIST.map((allergen) => {
              const isSelected = selectedAllergens.includes(allergen.id)

              return (
                <div
                  key={allergen.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleToggleAllergen(allergen.id)}
                >
                  <Checkbox
                    id={allergen.id}
                    checked={isSelected}
                    onCheckedChange={() => handleToggleAllergen(allergen.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={allergen.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {allergen.name}
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {allergen.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Toggle de bloqueo */}
          {selectedAllergens.length > 0 && (
            <Card className="p-4 bg-primary/10 border-primary/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-primary" />
                    <Label htmlFor="block-enabled" className="text-sm font-semibold text-primary">
                      Activar bloqueo de alérgenos
                    </Label>
                  </div>
                  <p className="text-xs text-primary">
                    Si está activado, <strong>no podrás seleccionar</strong> platos que contengan tus alérgenos.
                    Si está desactivado, verás advertencias pero podrás elegir cualquier plato.
                  </p>
                </div>
                <Switch
                  id="block-enabled"
                  checked={blockEnabled}
                  onCheckedChange={setBlockEnabled}
                />
              </div>
            </Card>
          )}

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Importante:</strong> Esta información es crítica para tu seguridad.
              Los platos que contengan alérgenos marcados mostrarán advertencias visibles.
              Verifica siempre los ingredientes antes de consumir.
            </AlertDescription>
          </Alert>

          {/* Botones */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

