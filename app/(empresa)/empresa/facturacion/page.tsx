/**
 * Módulo de Facturación - Portal Empresa
 * ♻️ Reutiliza estructura del portal de Admin adaptada para empresa
 */

import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant/get-tenant'
import {
  getBillingSum,
  getMonthlyBreakdown,
  getConciliationReport,
} from '@/lib/db/queries/empresa-facturacion'
import { BillingKPIs } from '@/components/empresa/facturacion/BillingKPIs'
import { BillingMonthlyBreakdown } from '@/components/empresa/facturacion/BillingMonthlyBreakdown'
import { BillingConciliation } from '@/components/empresa/facturacion/BillingConciliation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Suspense } from 'react'
import { Euro, FileText, CheckSquare } from 'lucide-react'

// ============================================================================
// Server Component - Datos con cache
// ============================================================================

async function BillingData() {
  const { tenantId, tenantType } = await getTenant()

  if (!tenantId || tenantType !== 'EMPRESA') {
    redirect('/login')
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  // Fetch en paralelo
  const [summary, breakdown, conciliation] = await Promise.all([
    getBillingSum(tenantId),
    getMonthlyBreakdown(tenantId, currentYear, currentMonth),
    getConciliationReport(tenantId, currentYear, currentMonth),
  ])

  return (
    <Tabs defaultValue="resumen" className="space-y-6">
      <TabsList>
        <TabsTrigger value="resumen">
          <Euro className="mr-2 h-4 w-4" />
          Resumen
        </TabsTrigger>
        <TabsTrigger value="desglose">
          <FileText className="mr-2 h-4 w-4" />
          Desglose Mensual
        </TabsTrigger>
        <TabsTrigger value="conciliacion">
          <CheckSquare className="mr-2 h-4 w-4" />
          Conciliación
        </TabsTrigger>
      </TabsList>

      {/* Tab 1: Resumen */}
      <TabsContent value="resumen" className="space-y-6">
        <BillingKPIs summary={summary} />

        {/* Histórico próximo mes (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-sm text-muted-foreground">
              Gráfica de evolución mensual (próximamente)
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 2: Desglose */}
      <TabsContent value="desglose">
        <BillingMonthlyBreakdown
          breakdown={breakdown}
          onExport={(format) => {
            // Handle export client-side
            window.location.href = `/api/empresa/facturacion/export?year=${currentYear}&month=${currentMonth}&format=${format}`
          }}
        />
      </TabsContent>

      {/* Tab 3: Conciliación */}
      <TabsContent value="conciliacion">
        <BillingConciliation report={conciliation} />
      </TabsContent>
    </Tabs>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function BillingLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Main Page Export
// ============================================================================

export default function BillingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground">
          Gestiona la facturación mensual, exporta a ERP y concilia pedidos
        </p>
      </div>

      {/* Content con Suspense */}
      <Suspense fallback={<BillingLoading />}>
        <BillingData />
      </Suspense>
    </div>
  )
}

