/**
 * Página de creación de Tenant
 */

import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TenantForm } from '@/components/admin/tenants/TenantForm'
import { Skeleton } from '@/components/ui/skeleton'

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crear Tenant</h1>
          <p className="mt-2 text-gray-600">
            Registra una nueva empresa o catering en la plataforma
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <TenantForm mode="create" />
      </Suspense>
    </div>
  )
}

