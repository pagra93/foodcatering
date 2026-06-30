/**
 * Formulario de edición de empresa
 * Actualiza: Tenant + Company + CompanyPolicy
 */

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCompanyById, updateCompany } from '@/lib/db/queries/companies'
import { updateCompanySchema } from '@/lib/validations/company'
import { CompanyForm } from '@/components/admin/companies/CompanyForm'

async function updateCompanyAction(id: string, formData: FormData) {
  'use server'

  // Construir objeto desde FormData
  const data = {
    // Info básica (Tenant)
    name: formData.get('name') as string,
    contactEmail: formData.get('contactEmail') as string || undefined,
    contactPhone: formData.get('contactPhone') as string || undefined,

    // Branding
    primaryColor: formData.get('primaryColor') as string || undefined,
    logoUrl: formData.get('logoUrl') as string || undefined,

    // Info legal (Company)
    legalName: formData.get('legalName') as string,
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
  }

  // Validar con Zod
  const validated = updateCompanySchema.parse(data)

  // Actualizar empresa
  await updateCompany(id, validated)

  // Redirigir a la página de detalle
  redirect(`/admin/empresas/${id}`)
}

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getRequiredSession()
  const { id } = await params

  const company = await getCompanyById(id)

  if (!company) {
    notFound()
  }

  // Serializar datos: convertir Decimal a number y aplanar estructura para el formulario
  const serializedCompany = {
    // Información del tenant (nivel raíz)
    ...company,
    
    // Aplanar company fields al nivel raíz para el formulario
    legalName: company.company.legalName,
    cif: company.company.cif,
    billingAddress: company.company.billingAddress,
    plan: company.company.plan,
    
    // Política de servicio (convertir Decimal a number)
    policy: company.company.policy ? {
      ...company.company.policy,
      limitPerDay: Number(company.company.policy.limitPerDay),
      copayCompany: Number(company.company.policy.copayCompany),
      copayEmployee: Number(company.company.policy.copayEmployee),
    } : undefined,
    
    // Mantener company para referencia si es necesario
    company: company.company,
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/admin/empresas/${id}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a {company.name}
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Empresa</h1>
        <p className="mt-1 text-sm text-gray-500">
          Actualiza la configuración de {company.name}
        </p>
      </div>

      {/* Formulario */}
      <CompanyForm
        action={updateCompanyAction.bind(null, id)}
        initialData={serializedCompany}
      />
    </div>
  )
}

