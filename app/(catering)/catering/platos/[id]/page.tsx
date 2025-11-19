/**
 * Página: Editar Plato
 * Ruta: /catering/platos/[id]
 */

'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DishForm } from '@/components/catering/platos/DishForm'
import { Card } from '@/components/ui/card'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { UpdateDishInput } from '@/lib/validations/dish'

type PageProps = {
  params: Promise<{ id: string }>
}

export default function EditarPlatoPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [dish, setDish] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDish = async () => {
      try {
        const response = await fetch(`/api/catering/platos/${id}`)
        const data = await response.json()

        if (data.success) {
          setDish(data.data)
        } else {
          toast.error(data.error || 'Error al cargar el plato')
          router.push('/catering/platos')
        }
      } catch (error) {
        console.error('Error fetching dish:', error)
        toast.error('Error al cargar el plato')
        router.push('/catering/platos')
      } finally {
        setLoading(false)
      }
    }

    fetchDish()
  }, [id, router])

  const handleSubmit = async (data: UpdateDishInput) => {
    const response = await fetch(`/api/catering/platos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Error al actualizar el plato')
    }
  }

  const handleCancel = () => {
    router.push('/catering/platos')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!dish) {
    return null
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
        <span className="text-gray-900">{dish.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Editar Plato</h1>
        <p className="text-gray-600 mt-1">
          Modifica la información del plato <span className="font-semibold">{dish.name}</span>
        </p>
      </div>

      {/* Info adicional */}
      {dish.schedulesCount > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            ℹ️ Este plato está en <span className="font-semibold">{dish.schedulesCount}</span> menú(s) publicado(s).
            Los cambios no afectarán a los menús ya publicados.
          </p>
        </Card>
      )}

      {/* Formulario */}
      <DishForm
        mode="edit"
        initialData={dish}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}

