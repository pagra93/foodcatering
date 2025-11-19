import { getRequiredSession } from '@/lib/auth/session'
import { CateringWizard } from '@/components/admin/caterings/CateringWizard'

export default async function NewCateringPage() {
  const session = await getRequiredSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Catering</h1>
        <p className="mt-1 text-sm text-gray-500">
          Registra un nuevo catering proveedor en la plataforma.
        </p>
      </div>

      <CateringWizard />
    </div>
  )
}

