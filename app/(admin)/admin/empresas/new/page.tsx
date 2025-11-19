/**
 * Formulario de creación de empresa
 * Crea: Tenant + Company + CompanyPolicy + Sede inicial
 * TODO en una transacción atómica para garantizar integridad
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { createCompany } from '@/lib/db/queries/companies'
import { createCompanySchema } from '@/lib/validations/company'
import { CompanyForm } from '@/components/admin/companies/CompanyForm'

async function createCompanyAction(formData: FormData) {
  'use server'

  // Construir objeto desde FormData
  const data = {
    // Info básica (Tenant)
    name: formData.get('name') as string,
    subdomain: formData.get('subdomain') as string,
    contactEmail: formData.get('contactEmail') as string || undefined,
    contactPhone: formData.get('contactPhone') as string || undefined,

    // Branding
    primaryColor: formData.get('primaryColor') as string || undefined,
    logoUrl: formData.get('logoUrl') as string || undefined,

    // Info legal (Company)
    legalName: formData.get('legalName') as string,
    cif: formData.get('cif') as string,
    billingAddress: formData.get('billingAddress') as string,
    plan: formData.get('plan') as 'STARTER' | 'GROWTH' | 'ENTERPRISE',

    // Política de servicio
    policy: {
      cutoffTime: formData.get('policy.cutoffTime') as string,
      daysActive: formData.getAll('policy.daysActive') as string[],
      limitPerDay: Number(formData.get('policy.limitPerDay')),
      copayCompany: Number(formData.get('policy.copayCompany')),
      copayEmployee: Number(formData.get('policy.copayEmployee')),
      noShowRule: formData.get('policy.noShowRule') as 'CHARGE' | 'NO_CHARGE' | 'PARTIAL',
    },

    // Sede inicial
    site: {
      name: formData.get('site.name') as string,
      address: formData.get('site.address') as string,
      deliveryWindow: formData.get('site.deliveryWindow') as string || undefined,
    },

    // Regional
    timezone: formData.get('timezone') as string || 'Europe/Madrid',
    currency: formData.get('currency') as string || 'EUR',
    language: formData.get('language') as string || 'es',
  }

  // Validar con Zod
  const validated = createCompanySchema.parse(data)

  // Crear empresa (Tenant + Company + Policy + Site en transacción)
  const tenant = await createCompany(validated)

  // Redirigir a la página de detalle
  redirect(`/admin/empresas/${tenant.id}`)
}

export default async function NewCompanyPage() {
  await getRequiredSession()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/empresas"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Empresas
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Empresa</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea una nueva empresa con su configuración inicial
        </p>
      </div>

      {/* Formulario */}
      <CompanyForm action={createCompanyAction} />
    </div>
  )
}

