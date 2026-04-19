import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getEmpresaBillingKPIs,
  getEmpresaInvoicesFromCatering,
  getEmpresaSaasInvoices,
} from '@/lib/db/queries/empresa-billing'
import { BillingTabs } from '@/components/empresa/facturacion/BillingTabs'

async function BillingData({ tenantId }: { tenantId: string }) {
  const [kpis, cateringInvoices, saasInvoices] = await Promise.all([
    getEmpresaBillingKPIs(tenantId),
    getEmpresaInvoicesFromCatering(tenantId),
    getEmpresaSaasInvoices(tenantId),
  ])

  return (
    <BillingTabs
      kpis={kpis}
      cateringInvoices={cateringInvoices.map((i) => ({
        id: i.id,
        period: i.period,
        number: i.number,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        total: i.total.toString(),
        status: i.status,
        catering: i.catering,
      }))}
      saasInvoices={saasInvoices.map((i) => ({
        id: i.id,
        period: i.period,
        number: i.number,
        planName: i.planName,
        total: i.total.toString(),
        status: i.status,
        issuedAt: i.issuedAt,
        dueBy: i.dueBy,
      }))}
    />
  )
}

export default async function BillingPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantId = session.user.tenantId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Tus facturas mensuales. Recibes dos tipos: del catering (por los
          pedidos servidos) y de SinTupper (tu plan SaaS).
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <BillingData tenantId={tenantId} />
      </Suspense>
    </div>
  )
}
