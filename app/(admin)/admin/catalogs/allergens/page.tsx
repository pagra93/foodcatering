import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllAllergens } from '@/lib/db/queries/catalogs'
import { AllergensManager } from '@/components/admin/catalogs/AllergensManager'

export default async function AdminAllergensPage() {
  const allergens = await getAllAllergens(true)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/catalogs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Catálogos
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Alérgenos</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Catálogo de los 14 alérgenos oficiales de la UE + alérgenos
          adicionales personalizados. Los caterings los asignan a sus platos
          desde el selector visual.
        </p>
      </div>

      <AllergensManager allergens={allergens} />
    </div>
  )
}
