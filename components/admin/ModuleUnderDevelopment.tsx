/**
 * Componente reusable para páginas del portal admin que todavía no están
 * implementadas. Elimina el 404 y muestra al super admin qué albergará
 * la sección (propósito del PRD + datos futuros + ETA).
 *
 * Uso:
 *   <ModuleUnderDevelopment
 *     title="Penalizaciones"
 *     breadcrumb={['Calidad y SLAs', 'Penalizaciones']}
 *     purpose="..."
 *     plannedFeatures={[...]}
 *     dataSources={[...]}
 *     eta="Sprint 2"
 *   />
 */

import Link from 'next/link'
import { ArrowLeft, ChevronRight, Construction, Database, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = {
  /** Título grande de la página. */
  title: string
  /** Array de niveles de breadcrumb — no incluir "Admin" ni el título final. */
  breadcrumb?: string[]
  /** Descripción corta del propósito, 1-2 frases. */
  purpose: string
  /** Bullet list de features planeadas según PRD. */
  plannedFeatures: string[]
  /** Bullet list de modelos Prisma / APIs que alimentarán este módulo. */
  dataSources: string[]
  /** Etiqueta de cuándo se espera (p.ej. "Sprint 2", "Post-MVP"). */
  eta?: string
  /** Link opcional para "Volver" — por defecto al dashboard. */
  backHref?: string
  /** Texto del botón "Volver". */
  backLabel?: string
}

export function ModuleUnderDevelopment({
  title,
  breadcrumb = [],
  purpose,
  plannedFeatures,
  dataSources,
  eta,
  backHref = '/admin',
  backLabel = 'Volver al Dashboard',
}: Props) {
  return (
    <div className="space-y-6">
      {/* Header / breadcrumbs */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      {breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-gray-700">
            Admin
          </Link>
          {breadcrumb.map((crumb) => (
            <span key={crumb} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              <span>{crumb}</span>
            </span>
          ))}
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900">{title}</span>
        </nav>
      )}

      {/* Title + badge */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Badge variant="secondary" className="gap-1.5">
          <Construction className="h-3.5 w-3.5" />
          Próximamente
        </Badge>
        {eta && <Badge variant="outline">{eta}</Badge>}
      </div>

      <p className="max-w-3xl text-base text-gray-600">{purpose}</p>

      {/* Features + Data sources */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Funcionalidades previstas
            </h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            {plannedFeatures.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-blue-500">›</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Fuentes de datos
            </h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            {dataSources.map((source) => (
              <li key={source} className="flex gap-2">
                <span className="text-emerald-500">›</span>
                <span className="font-mono text-xs">{source}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Footer info */}
      <Card className="bg-blue-50/40 p-5 text-sm text-gray-600">
        <p>
          Este módulo está planificado en el roadmap y se activará en una
          próxima iteración. La estructura ya existe en la barra lateral
          para que el equipo entienda el alcance completo del portal. Si
          necesitas priorizar este módulo, comunícalo al equipo de
          producto.
        </p>
      </Card>
    </div>
  )
}
