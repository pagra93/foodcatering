/**
 * Módulo de Auditoría Fiscal - Portal Empresa
 * ♻️ Reutiliza tablas FiscalReport y DeliveryProof ya existentes
 */

import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import {
  getOrGenerateFiscalReport,
  getAnnualFiscalSummary,
  checkFiscalCompliance,
} from '@/lib/db/queries/empresa-auditoria'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Suspense } from 'react'
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { requireCompanyFeature } from '@/lib/plans/guard'

// ============================================================================
// Server Component - Datos con cache
// ============================================================================

async function AuditoriaData() {
  const tenant = await getCurrentTenant()
  const tenantId = tenant.id

  // Gating por plan: la auditoría fiscal es una feature de pago.
  const locked = await requireCompanyFeature(tenantId, 'fiscal-audit')
  if (locked) return locked

  // Obtener company para sacar el companyId
  const { prisma } = await import('@/lib/db/prisma')
  const company = await prisma.company.findUnique({
    where: { tenantId },
    select: { id: true },
  })

  if (!company) {
    throw new Error('Company not found')
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  // Fetch en paralelo
  const [monthlyReport, annualSummary, compliance] = await Promise.all([
    getOrGenerateFiscalReport(tenantId, currentYear, currentMonth),
    getAnnualFiscalSummary(tenantId, currentYear),
    checkFiscalCompliance(tenantId, company.id, currentYear, currentMonth),  // Añadido company.id
  ])

  return (
    <div className="space-y-6">
      {/* Estado de Cumplimiento */}
      <Alert variant={compliance.compliant ? 'default' : 'destructive'}>
        {compliance.compliant ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertTitle>
          {compliance.compliant
            ? 'Cumplimiento Fiscal Correcto'
            : 'Hay problemas de cumplimiento'}
        </AlertTitle>
        <AlertDescription>
          {compliance.compliant
            ? 'Todos los pedidos cumplen con la normativa fiscal.'
            : `Se detectaron ${compliance.issues.length} problema(s) que requieren atención.`}
        </AlertDescription>
      </Alert>

      {/* KPIs del mes actual */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyReport.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Importe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(monthlyReport.totalAmount).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deducible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Number(monthlyReport.deductibleAmount).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (Number(monthlyReport.deductibleAmount) /
                  Number(monthlyReport.totalAmount)) *
                100
              ).toFixed(1)}
              % del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={compliance.compliant ? 'default' : 'destructive'}
              className="text-lg"
            >
              {compliance.compliant ? '✓ OK' : '✗ Revisar'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Problemas de cumplimiento */}
      {!compliance.compliant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Problemas Detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compliance.issues.map((issue, idx) => (
                <Alert key={idx} variant="destructive">
                  <AlertDescription>
                    <span className="font-semibold">{issue.message}</span> (
                    {issue.count} casos)
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen Anual */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Anual {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Anuales</p>
              <p className="text-2xl font-bold">{annualSummary.totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Importe Total</p>
              <p className="text-2xl font-bold">
                {annualSummary.totalAmount.toFixed(2)}€
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deducible</p>
              <p className="text-2xl font-bold text-green-600">
                {annualSummary.deductibleAmount.toFixed(2)}€
              </p>
              <p className="text-xs text-muted-foreground">
                {annualSummary.deductiblePercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Desglose mensual */}
          <div className="grid gap-2 md:grid-cols-6">
            {annualSummary.monthlyReports.map((m) => (
              <div
                key={m.month}
                className="border rounded-lg p-3 text-center hover:bg-gray-50"
              >
                <p className="text-xs text-muted-foreground">
                  {new Date(currentYear, m.month - 1).toLocaleDateString(
                    'es-ES',
                    { month: 'short' }
                  )}
                </p>
                <p className="text-lg font-bold">{m.orders}</p>
                <p className="text-xs text-green-600">
                  {m.deductible.toFixed(0)}€
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Dossier Fiscal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Genera un dossier completo con toda la documentación fiscal para
              presentar ante Hacienda (Art. 45 RIRPF).
            </p>

            <div className="flex gap-2">
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Descargar Dossier Mes Actual
              </Button>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Generar Anual {currentYear}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata del reporte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Integridad y Trazabilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hash de Firma:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {monthlyReport.signatureHash.slice(0, 16)}...
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Generado:</span>
              <span>
                {new Date(monthlyReport.generatedAt).toLocaleString('es-ES')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Período:</span>
              <Badge variant="outline">
                {monthlyReport.periodYear}-{String(monthlyReport.periodMonth).padStart(2, '0')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Loading State
// ============================================================================

function AuditoriaLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
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

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Auditoría Fiscal
        </h1>
        <p className="text-muted-foreground">
          Reportes fiscales, cumplimiento normativo y trazabilidad completa
        </p>
      </div>

      {/* Content con Suspense */}
      <Suspense fallback={<AuditoriaLoading />}>
        <AuditoriaData />
      </Suspense>
    </div>
  )
}

