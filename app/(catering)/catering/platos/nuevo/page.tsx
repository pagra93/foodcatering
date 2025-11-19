/**
 * Página: Crear Nuevo Plato
 * Ruta: /catering/platos/nuevo
 */

'use client'

import { useRouter } from 'next/navigation'
import { DishForm } from '@/components/catering/platos/DishForm'
import { Card } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { CreateDishInput } from '@/lib/validations/dish'

export default function NuevoPlatoPage() {
  const router = useRouter()

  const handleSubmit = async (data: CreateDishInput) => {
    const response = await fetch('/api/catering/platos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Error al crear el plato')
    }
  }

  const handleCancel = () => {
    router.push('/catering/platos')
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link
          href="/catering/platos"
          className="hover:text-gray-900 flex items-center"
        >
          <ChevronLeft className="h-4 w-4" />
          Platos
        </Link>
        <span>/</span>
        <span className="text-gray-900">Nuevo plato</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Plato</h1>
        <p className="text-gray-600 mt-1">
          Añade un nuevo plato al catálogo del catering
        </p>
      </div>

      {/* Formulario */}
      <DishForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}

