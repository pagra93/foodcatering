import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db/prisma'
import { getDpaOverview } from '@/lib/db/queries/admin-dpa'
import { NewDpaForm } from '@/components/admin/compliance/dpa/NewDpaForm'

const STATUS_META: Record<
  'OK' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING',
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  OK: { label: 'Vigente', variant: 'default' },
  EXPIRING_SOON: { label: 'Caducando', variant: 'outline' },
  EXPIRED: { label: 'Caducado', variant: 'destructive' },
  MISSING: { label: 'Sin DPA', variant: 'destructive' },
}

export default async function DpaPage() {
  const [overview, tenants] = await Promise.all([
    getDpaOverview(),
    prisma.tenant.findMany({
      where: {
        type: { in: ['EMPRESA', 'CATERING'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true, name: true, subdomain: true, type: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
  ])

  const missing = overview.filter((o) => o.status === 'MISSING').length
  const expiringOrExpired = overview.filter(
    (o) => o.status === 'EXPIRING_SOON' || o.status === 'EXPIRED'
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/compliance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Compliance
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Data Processing Agreements</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Contratos de tratamiento de datos (RGPD Art. 28) firmados con cada
          tenant EMPRESA y CATERING. El PDF vive fuera (Drive/S3); aquí
          guardamos metadatos, versión y vigencia. Los tenants pueden
          descargarlo desde su portal.
        </p>
      </div>

      {(missing > 0 || expiringOrExpired > 0) && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1 text-sm">
              {missing > 0 && (
                <p>
                  <strong>{missing}</strong>{' '}
                  {missing === 1 ? 'tenant no tiene' : 'tenants no tienen'} DPA
                  vigente. Exposición legal bajo RGPD Art. 28.
                </p>
              )}
              {expiringOrExpired > 0 && (
                <p className="mt-1">
                  <strong>{expiringOrExpired}</strong>{' '}
                  {expiringOrExpired === 1 ? 'DPA caducado' : 'DPAs caducados'}{' '}
                  o próximo a caducar (&lt;30 días).
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <NewDpaForm
        tenants={tenants.map((t) => ({
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          type: t.type as 'EMPRESA' | 'CATERING',
        }))}
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Versión</th>
              <th className="px-4 py-3 text-left">Firmado</th>
              <th className="px-4 py-3 text-left">Vence</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">PDF</th>
            </tr>
          </thead>
          <tbody>
            {overview.map((o) => (
              <tr
                key={o.tenantId}
                className="border-b last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{o.tenantName}</div>
                  <div className="font-mono text-[10px] text-gray-500">
                    {o.subdomain}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {o.tenantType}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {o.currentVersion ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {o.signedAt
                    ? format(o.signedAt, 'dd MMM yyyy', { locale: es })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {o.effectiveTo ? (
                    <>
                      {format(o.effectiveTo, 'dd MMM yyyy', { locale: es })}
                      {o.daysToExpire !== null && o.daysToExpire < 30 && (
                        <span
                          className={`ml-1 text-[10px] ${
                            o.daysToExpire < 0
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }`}
                        >
                          ({o.daysToExpire < 0 ? 'caducado' : `${o.daysToExpire}d`})
                        </span>
                      )}
                    </>
                  ) : o.currentVersion ? (
                    <span className="text-gray-400">Sin expiración</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={STATUS_META[o.status].variant}
                    className="flex w-fit items-center gap-1 text-[10px]"
                  >
                    {o.status === 'OK' && <CheckCircle className="h-3 w-3" />}
                    {o.status !== 'OK' && <AlertTriangle className="h-3 w-3" />}
                    {STATUS_META[o.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {o.pdfUrl ? (
                    <a
                      href={o.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
