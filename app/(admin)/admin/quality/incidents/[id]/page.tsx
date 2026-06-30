import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, ChefHat, ShoppingCart, User } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getGlobalIncidentById } from '@/lib/db/queries/admin-quality'
import { formatPrice } from '@/lib/utils'
import {
  SEVERITY_META,
  STATUS_META,
  incidentTypeLabel,
  incidentTypeDescription,
  resolutionTypeLabel,
} from '@/lib/incidents/constants'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-1 text-sm text-gray-900">{children}</div>
    </div>
  )
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const incident = await getGlobalIncidentById(id)

  if (!incident) {
    notFound()
  }

  const severity = SEVERITY_META[incident.severity]
  const status = STATUS_META[incident.status]
  const typeDesc = incidentTypeDescription(incident.type)
  const resolution = incident.resolution
  const isClosed = incident.status === 'RESOLVED' || incident.status === 'COMPENSATED'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/quality/incidents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Incidencias
          </Link>
        </Button>
      </div>

      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{incidentTypeLabel(incident.type)}</h1>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${severity.className}`}
            >
              Severidad {severity.label}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {typeDesc && <p className="mt-1 text-sm text-gray-500">{typeDesc}</p>}
          <p className="mt-1 font-mono text-xs text-gray-400">{incident.id}</p>
        </div>
        {!isClosed && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Abierta hace</p>
            <p
              className={`text-lg font-semibold ${
                incident.daysOpen > 7 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {incident.daysOpen}d
            </p>
          </div>
        )}
      </div>

      {/* Partes implicadas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Empresa</span>
          </div>
          <Link
            href={`/admin/empresas/${incident.tenantEmpresa}`}
            className="mt-1 block text-sm font-semibold text-primary hover:underline"
          >
            {incident.empresaName}
          </Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <ChefHat className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Catering</span>
          </div>
          <Link
            href={`/admin/caterings/${incident.tenantCatering}`}
            className="mt-1 block text-sm font-semibold text-primary hover:underline"
          >
            {incident.cateringName}
          </Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Pedido</span>
          </div>
          {incident.order ? (
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {format(incident.order.serviceDate, 'dd MMM yyyy', { locale: es })}
              <span className="ml-1 font-normal text-gray-500">
                · {formatPrice(Number(incident.order.price))}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Sin pedido asociado</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <User className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Empleado</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {incident.order?.employeeId
              ? `#${incident.order.employeeId.slice(-8)}`
              : '—'}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Detalle + resolución */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Detalle</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Descripción">
                {incident.description ? (
                  <span className="whitespace-pre-wrap">{incident.description}</span>
                ) : (
                  <span className="text-gray-400">Sin descripción</span>
                )}
              </Field>
            </div>
            {incident.order && (
              <>
                <Field label="Estado del pedido">{incident.order.status}</Field>
                <Field label="Menú">{incident.order.menuType}</Field>
              </>
            )}
          </div>

          {/* Resolución desglosada */}
          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Resolución</h3>
            {resolution ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Tipo">
                  {resolutionTypeLabel(resolution.type) ?? '—'}
                </Field>
                <Field label="Compensación">
                  {typeof resolution.amount === 'number'
                    ? formatPrice(resolution.amount)
                    : '—'}
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Detalles">
                    {resolution.details ? (
                      <span className="whitespace-pre-wrap">{resolution.details}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </Field>
                </div>
                <Field label="Resuelta por">{incident.resolvedByEmail ?? '—'}</Field>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Todavía sin resolver.</p>
            )}
          </div>
        </Card>

        {/* Seguimiento / timeline */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Seguimiento</h2>
          <ol className="space-y-4">
            <li>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Reportada
              </p>
              <p className="text-sm text-gray-900">
                {format(incident.createdAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
              </p>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(incident.createdAt, { addSuffix: true, locale: es })}
                {incident.openedByEmail && ` · por ${incident.openedByEmail}`}
              </p>
            </li>
            {incident.assignedToEmail && (
              <li>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Asignada
                </p>
                <p className="text-sm text-gray-900">{incident.assignedToEmail}</p>
              </li>
            )}
            <li>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {isClosed ? 'Resuelta' : 'Última actualización'}
              </p>
              <p className="text-sm text-gray-900">
                {incident.resolvedAt
                  ? format(incident.resolvedAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })
                  : format(incident.updatedAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </li>
          </ol>
          {incident.reportedByEmail && (
            <div className="mt-5 border-t pt-4">
              <Field label="Reportada por">{incident.reportedByEmail}</Field>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
