/**
 * Página de edición de Tenant
 */

import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenantById } from '@/lib/db/queries/tenants'
import { Button } from '@/components/ui/button'
import { TenantForm } from '@/components/admin/tenants/TenantForm'
import { Skeleton } from '@/components/ui/skeleton'

type PageProps = {
  params: {
    id: string
  }
}

async function TenantEditForm({ tenantId }: { tenantId: string }) {
  try {
    const tenant = await getTenantById(tenantId)

    return (
      <TenantForm
        mode="edit"
        tenantId={tenant.id}
        initialData={{
          name: tenant.name,
          type: tenant.type as 'EMPRESA' | 'CATERING',
          subdomain: tenant.subdomain,
          status: tenant.status as any,
          primaryColor: tenant.primaryColor || undefined,
          logoUrl: tenant.logoUrl || undefined,
          contactEmail: tenant.contactEmail || undefined,
          contactPhone: tenant.contactPhone || undefined,
          address: tenant.address || undefined,
          city: tenant.city || undefined,
          postalCode: tenant.postalCode || undefined,
          country: tenant.country || undefined,
          timezone: tenant.timezone || undefined,
          currency: tenant.currency || undefined,
          language: tenant.language || undefined,
          notes: tenant.notes || undefined,
        }}
      />
    )
  } catch (error) {
    notFound()
  }
}

export default function EditTenantPage({ params }: PageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/tenants/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Tenant</h1>
          <p className="mt-2 text-gray-600">
            Modifica la información del tenant
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <TenantEditForm tenantId={params.id} />
      </Suspense>
    </div>
  )
}

