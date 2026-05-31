'use client'

import { useState } from 'react'
import { ChevronRight, Clock, Lock, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { IntegrationSpec, IntegrationStatus } from './catalog'

const STATUS_META: Record<
  IntegrationStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  available: {
    label: 'Disponible',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Clock,
  },
  'coming-soon': {
    label: 'Próximamente',
    className: 'bg-primary/10 text-primary border-primary/30',
    icon: Clock,
  },
  'on-request': {
    label: 'A petición',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Mail,
  },
  active: {
    label: 'Activa',
    className: 'bg-primary/10 text-primary border-primary/30',
    icon: Clock,
  },
}

export function IntegrationCard({ spec }: { spec: IntegrationSpec }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[spec.status]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full text-left"
      >
        <Card className="h-full p-5 transition-all hover:border-gray-300 hover:shadow-md">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ backgroundColor: spec.brandColor }}
            >
              <span className="text-sm font-bold">{spec.monogram}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{spec.name}</h3>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                {spec.description}
              </p>
              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.className}`}
                >
                  <meta.icon className="h-2.5 w-2.5" />
                  {meta.label}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </button>

      {open && <ConfigModal spec={spec} onClose={() => setOpen(false)} />}
    </>
  )
}

function ConfigModal({
  spec,
  onClose,
}: {
  spec: IntegrationSpec
  onClose: () => void
}) {
  const meta = STATUS_META[spec.status]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: spec.brandColor }}
          >
            <span className="text-base font-bold">{spec.monogram}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{spec.name}</h2>
            <p className="mt-1 text-sm text-gray-600">{spec.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.className}`}
              >
                <meta.icon className="h-3 w-3" />
                {meta.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 border-t pt-5">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold">Configuración</h3>
          </div>

          <div className="space-y-3">
            {spec.configFields.map((f, i) => (
              <div key={i}>
                <Label>{f.label}</Label>
                {f.type === 'textarea' ? (
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
                    rows={3}
                    placeholder={f.placeholder}
                    disabled
                  />
                ) : f.type === 'select' ? (
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
                    disabled
                  >
                    <option>{f.placeholder ?? ''}</option>
                  </select>
                ) : (
                  <Input
                    type={f.type}
                    placeholder={f.placeholder}
                    disabled
                    className="mt-1"
                  />
                )}
                {f.help && (
                  <p className="mt-1 text-xs text-gray-500">{f.help}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-md bg-gray-50 p-4 text-xs text-gray-600">
            {spec.status === 'coming-soon' && (
              <p>
                <strong>Conector en desarrollo.</strong> La UI muestra los
                campos que tendrás que rellenar cuando esté activo. Si necesitas
                esta integración urgente, avísanos y priorizamos.
              </p>
            )}
            {spec.status === 'on-request' && (
              <p>
                <strong>Integración a petición.</strong> No está en el roadmap
                inmediato, pero la habilitamos si un cliente enterprise lo
                solicita. Escríbenos a{' '}
                <a
                  href="mailto:soporte@plati.es"
                  className="text-primary hover:underline"
                >
                  soporte@plati.es
                </a>
                .
              </p>
            )}
            {spec.status === 'available' && (
              <p>
                <strong>Disponible.</strong> Rellena los campos y pulsa Guardar.
              </p>
            )}
            {spec.status === 'active' && (
              <p>
                <strong>Activa.</strong> Esta integración ya está configurada y
                funcionando.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button disabled>
            {spec.status === 'active' ? 'Guardar cambios' : 'Conectar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
