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
    headline: 'Control total para RRHH y Finanzas',
    description:
      'Dashboard con adopción real, importador CSV con validación, auditoría fiscal mensual y export a tu ERP.',
    bullets: [
      'KPIs de pedidos, gasto y adopción en un vistazo',
      'Alta masiva de empleados con CSV + invitaciones por token',
      'Snapshot SHA-256 diario y dossier fiscal mensual',
      'Conciliación pedidos ↔ factura línea a línea',
      'Permisos RRHH · Finanzas · Manager de sede',
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
      'Selector semanal con fotos, alérgenos codificados y calorías. Cambios hasta las 11:00. Rating post-comida.',
    bullets: [
      'Vista semanal de 5 días × 3 opciones por día',
      'Alérgenos codificados por color (conflicto / presente / no contiene)',
      'Confirmación de pedido con copay visible',
      'Incidencias reportables desde la app',
      'Historial de gasto y plato favorito',
    ],
    screenshotCaption: 'demoempresa.plati.es / empleado / menus',
    screenshotLabel: 'Portal empleado: selector semanal de menús con platos y alérgenos',
  },
  {
    key: 'catering',
    label: 'Catering',
    icon: Utensils,
    headline: 'La cocina y el reparto, en un sistema',
    description:
      'KDS en tablet, packing nominativo con alérgenos, rutas optimizadas con GPS y facturación mensual automática.',
    bullets: [
      'KDS fullscreen con auto-refresh y consolidación por plato',
      'Packing por empleado con etiqueta de alérgenos y sede',
      'Rutas optimizadas + Google Maps + confirmación in-situ',
      'Prueba de entrega (foto, firma, geolocalización)',
      'Factura mensual automática el día 1',
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
