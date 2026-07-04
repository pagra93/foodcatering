import { redirect } from 'next/navigation'
import { getRequiredSession } from '@/lib/auth/session'
import {
  CateringWizard,
  type CateringFormData,
} from '@/components/admin/caterings/CateringWizard'
import { createCatering } from '@/lib/db/queries/caterings'
import { getCateringPlanOptions } from '@/lib/db/queries/admin-plans-taxes'
import { createCateringSchema, slugify } from '@/lib/validations/catering'

async function createCateringAction(
  data: CateringFormData
): Promise<{ error?: string } | void> {
  'use server'

  // Mapear los datos del wizard a la forma que espera createCatering.
  const mapped = {
    name: (data.displayName || data.name || '').trim(),
    subdomain: slugify(data.name || data.displayName || ''),
    contactEmail: data.contactEmail || undefined,
    contactPhone: data.contactPhone || undefined,
    primaryColor: data.primaryColor || undefined,
    logoUrl: data.logoUrl || undefined,
    legalName: data.legalName,
    cif: data.cif,
    billingAddress: [data.billingAddress, data.postalCode, data.city, data.country]
      .filter(Boolean)
      .join(', '),
    iban: data.iban || undefined,
    contactPerson: data.contactPerson,
    // El restaurante reutiliza el contacto general (el wizard no separa contacto de restaurante).
    restaurantContactEmail: data.contactEmail,
    restaurantContactPhone: data.contactPhone,
    dailyCapacity: data.dailyCapacity,
    cutoffTime: data.cutoffTime,
    operationalDays: data.operationalDays,
    zones: (data.zones ?? []).map((z) => ({
      name: z.name,
      postalCodes: (z.postalCodes ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      maxDistance: z.maxDistance ?? 0,
      operator: z.operator ?? '',
    })),
    saasPlanId: data.saasPlanId || null,
  }

  const parsed = createCateringSchema.safeParse(mapped)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  let tenantId: string
  try {
    const tenant = await createCatering(parsed.data)
    tenantId = tenant.id
  } catch {
    return {
      error: 'No se pudo crear el catering. ¿El subdominio o el CIF ya están en uso?',
    }
  }

  redirect(`/admin/caterings/${tenantId}`)
}

export default async function NewCateringPage() {
  await getRequiredSession()
  const plans = await getCateringPlanOptions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Catering</h1>
        <p className="mt-1 text-sm text-gray-500">
          Registra un nuevo catering proveedor en la plataforma.
        </p>
      </div>

      <CateringWizard onSubmit={createCateringAction} plans={plans} />
    </div>
  )
}
