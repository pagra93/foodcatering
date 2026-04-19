import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CATEGORY_META,
  integrationsByCategory,
  type IntegrationCategory,
} from './catalog'
import { IntegrationCard } from './IntegrationCard'

/**
 * Componente reutilizable para las 5 sub-páginas de integraciones
 * filtradas por categoría.
 */
export function IntegrationsCategoryPage({
  category,
}: {
  category: IntegrationCategory
}) {
  const items = integrationsByCategory(category)
  const meta = CATEGORY_META[category]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/integrations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Integraciones
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold">{meta.label}</h1>
          <Badge variant="secondary">{items.length} proveedores</Badge>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          {meta.description}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((spec) => (
          <IntegrationCard key={spec.slug} spec={spec} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          Aún no hay proveedores en esta categoría.
        </p>
      )}
    </div>
  )
}
