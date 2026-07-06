import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/require-super-admin'
import { getCateringById, updateCatering } from '@/lib/db/queries/caterings'
import { getCateringPlanOptions } from '@/lib/db/queries/admin-plans-taxes'
import { updateCateringSchema } from '@/lib/validations/catering'
import { Button } from '@/components/ui/button'
import { CateringEditForm } from '@/components/admin/caterings/CateringEditForm'

async function updateCateringAction(
  id: string,
  formData: FormData
): Promise<{ error?: string } | void> {
  'use server'

  await requireSuperAdmin('catering:edit')

  const get = (k: string) => {
    const v = formData.get(k)
    return typeof v === 'string' && v.length > 0 ? v : undefined
  }

  const data = {
    name: get('name'),
    contactEmail: get('contactEmail'),
    contactPhone: get('contactPhone'),
    primaryColor: get('primaryColor'),
    logoUrl: get('logoUrl'),
    legalName: get('legalName'),
    billingAddress: get('billingAddress'),
    iban: get('iban'),
    contactPerson: get('contactPerson'),
    restaurantContactEmail: get('restaurantContactEmail'),
    restaurantContactPhone: get('restaurantContactPhone'),
    dailyCapacity: get('dailyCapacity'),
    cutoffTime: get('cutoffTime'),
    operationalDays: formData.getAll('operationalDays').map(String),
    // Plan de catering: vacío = sin plan (null), no "no cambiar".
    saasPlanId: (formData.get('saasPlanId') as string) || null,
  }

  const parsed = updateCateringSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  try {
    await updateCatering(id, parsed.data)
  } catch {
    return { error: 'No se pudieron guardar los cambios.' }
  }

  redirect(`/admin/caterings/${id}`)
}

export default async function EditCateringPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getRequiredSession()
  const { id } = await params

  const catering = await getCateringById(id)
  if (!catering) {
    notFound()
  }

  const plans = await getCateringPlanOptions()

  const r = catering.restaurant
  const initialData = {
    name: catering.name,
    contactEmail: catering.contactEmail ?? '',
    contactPhone: catering.contactPhone ?? '',
    primaryColor: catering.primaryColor ?? '',
    logoUrl: catering.logoUrl ?? '',
    legalName: r.legalName,
    billingAddress: r.billingAddress,
    iban: r.iban ?? '',
    contactPerson: r.contactPerson ?? '',
    restaurantContactEmail: r.contactEmail ?? '',
    restaurantContactPhone: r.contactPhone ?? '',
    dailyCapacity: r.dailyCapacity,
    cutoffTime: r.cutoffTime,
    saasPlanId: r.saasPlanId,
    operationalDays: (r.operationalDays as string[]) ?? [],
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/caterings/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a {catering.name}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Catering</h1>
        <p className="mt-1 text-sm text-gray-500">Actualiza los datos de {catering.name}.</p>
      </div>

      <CateringEditForm
        action={updateCateringAction.bind(null, id)}
        initialData={initialData}
        plans={plans}
      />
    </div>
  )
}
