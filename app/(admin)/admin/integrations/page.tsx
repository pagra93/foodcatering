import { Plug, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CATEGORY_META,
  INTEGRATIONS,
  type IntegrationCategory,
} from '@/components/admin/integrations/catalog'
import { IntegrationCard } from '@/components/admin/integrations/IntegrationCard'

const CATEGORY_ORDER: IntegrationCategory[] = [
  'erp',
  'sso',
  'payments',
  'communications',
  'webhooks',
  'api-keys',
  'storage',
  'monitoring',
]

export default function IntegrationsPage() {
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    meta: CATEGORY_META[cat],
    items: INTEGRATIONS.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0)

  const totalCount = INTEGRATIONS.length
  const comingSoonCount = INTEGRATIONS.filter(
    (i) => i.status === 'coming-soon'
  ).length

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-tinta shadow-lg">
            <Plug className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Integraciones</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Conecta Plati con los sistemas que ya usas: tu ERP, tu
              identidad corporativa, tu pasarela de pagos, tu sistema de
              monitoring. Catálogo completo; activamos conectores según
              demanda de clientes.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3 w-3" />
                {totalCount} integraciones en catálogo
              </Badge>
              <Badge variant="outline">
                {comingSoonCount} en desarrollo
              </Badge>
              <Badge variant="outline">
                {INTEGRATIONS.filter((i) => i.status === 'on-request').length}{' '}
                a petición enterprise
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <Card className="border-primary/30 bg-primary/10 p-4 text-sm text-primary">
        <p>
          <strong>¿Cómo funciona?</strong> Haz click en cualquier integración
          para ver los campos de configuración que tendrás cuando esté
          disponible. Hoy todas están en modo preview — la infraestructura
          está lista pero los conectores reales se activan según demanda.
        </p>
      </Card>

      {/* Grid por categoría */}
      {byCategory.map((group) => (
        <section key={group.cat} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-bold">{group.meta.label}</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {group.meta.description}
              </p>
            </div>
            <Badge variant="secondary">{group.items.length}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {group.items.map((spec) => (
              <IntegrationCard key={spec.slug} spec={spec} />
            ))}
          </div>
        </section>
      ))}

      {/* Footer CTA */}
      <Card className="border-dashed border-gray-300 bg-gray-50/50 p-6 text-center">
        <p className="text-sm font-medium text-gray-700">
          ¿Necesitas una integración que no está aquí?
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Escríbenos a{' '}
          <a
            href="mailto:soporte@plati.es"
            className="text-primary hover:underline"
          >
            soporte@plati.es
          </a>{' '}
          y evaluamos añadirla al roadmap.
        </p>
      </Card>
    </div>
  )
}
