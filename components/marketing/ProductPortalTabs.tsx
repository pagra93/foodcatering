'use client'

import type { LucideIcon } from 'lucide-react'
import { Briefcase, User, Utensils } from 'lucide-react'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { ScreenshotPlaceholder } from './ScreenshotFrame'

type PortalKey = 'empresa' | 'empleado' | 'catering'

type PortalContent = {
  key: PortalKey
  label: string
  icon: LucideIcon
  headline: string
  description: string
  bullets: string[]
  screenshotCaption: string
  screenshotLabel: string
}

const portals: PortalContent[] = [
  {
    key: 'empresa',
    label: 'Empresa',
    icon: Briefcase,
    headline: 'Todo bajo control, sin hojas de cálculo',
    description:
      'Ves de un vistazo quién usa el beneficio y cuánto se gasta. Subes tu plantilla, generas el informe fiscal del mes y lo exportas a tu contabilidad.',
    bullets: [
      'Pedidos, gasto y cuánta gente lo usa, de un vistazo',
      'Sube toda la plantilla de una vez; cada empleado recibe su invitación',
      'Informe fiscal del mes listo para tu asesor, con respaldo a prueba de inspección',
      'Cada línea de la factura cuadra sola con su pedido',
      'Cada rol (RRHH, Finanzas, responsable de sede) ve solo lo suyo',
    ],
    screenshotCaption: 'demoempresa.plati.es / dashboard',
    screenshotLabel: 'Portal empresa: dashboard con KPIs de adopción, pedidos y gasto',
  },
  {
    key: 'empleado',
    label: 'Empleado',
    icon: User,
    headline: 'Elegir qué comer, en 30 segundos',
    description:
      'Elige el menú de la semana desde el móvil, con fotos, alérgenos y calorías. Puede cambiarlo hasta las 11:00 y valorar la comida después.',
    bullets: [
      'La semana entera de un vistazo: cada día, sus opciones',
      'Alérgenos marcados por color: ve al instante qué puede comer',
      'Sabe lo que paga él antes de confirmar',
      'Si algo falla, lo reporta desde la app',
      'Su historial de gasto y su plato favorito, a mano',
    ],
    screenshotCaption: 'demoempresa.plati.es / empleado / menus',
    screenshotLabel: 'Portal empleado: selector semanal de menús con platos y alérgenos',
  },
  {
    key: 'catering',
    label: 'Catering',
    icon: Utensils,
    headline: 'La cocina y el reparto, sin papeleo',
    description:
      'Pantalla de cocina en tablet, etiquetado por persona con alérgenos, rutas de reparto optimizadas y factura automática a fin de mes.',
    bullets: [
      'Pantalla de cocina que suma los pedidos por plato en tiempo real',
      'Cada menú empaquetado con su nombre, alérgenos y sede de destino',
      'Rutas de reparto ordenadas, con Google Maps y confirmación al entregar',
      'Prueba de entrega con foto, firma y ubicación',
      'Factura del mes generada sola el día 1',
    ],
    screenshotCaption: 'democatering.plati.es / kds',
    screenshotLabel: 'Portal catering: Kitchen Display System con consolidación de pedidos',
  },
]

export function ProductPortalTabs() {
  return (
    <Tabs defaultValue="empresa" className="w-full">
      <TabsList className="mx-auto flex h-auto w-full max-w-xl flex-wrap items-center justify-center gap-1 rounded-xl bg-muted p-1.5">
        {portals.map((p) => (
          <TabsTrigger
            key={p.key}
            value={p.key}
            className="flex-1 gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            <p.icon className="h-4 w-4" aria-hidden="true" />
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {portals.map((p) => (
        <TabsContent key={p.key} value={p.key} className="mt-10 md:mt-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl text-balance">
                {p.headline}
              </h3>
              <p className="mt-4 text-base text-muted-foreground md:text-lg text-pretty">
                {p.description}
              </p>
              <ul className="mt-6 space-y-3">
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm text-foreground md:text-base"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-primary"
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <ScreenshotPlaceholder
              label={p.screenshotLabel}
              caption={p.screenshotCaption}
            />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
