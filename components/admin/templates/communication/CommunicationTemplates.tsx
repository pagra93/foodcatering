'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Mail, Send, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { sendTestEmailAction } from './actions'

export type TemplateView = {
  id: string
  name: string
  description: string
  trigger: string
  subject: string
  html: string
}

export function CommunicationTemplates({
  templates,
}: {
  templates: TemplateView[]
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0]

  const sendTest = () => {
    if (!selected) return
    startTransition(async () => {
      try {
        const res = await sendTestEmailAction(selected.id)
        if (res.skipped) {
          toast.warning(
            'Email no enviado: falta configurar RESEND_API_KEY en el servidor.'
          )
        } else if (res.ok) {
          toast.success(`Email de prueba enviado a ${res.email}`)
        } else {
          toast.error('No se pudo enviar el email de prueba.')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  if (!selected) {
    return (
      <Card className="p-6 text-sm text-gray-500">No hay plantillas.</Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Lista de plantillas */}
      <div className="space-y-2">
        {templates.map((t) => {
          const active = t.id === selected.id
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail
                  className={`h-4 w-4 ${active ? 'text-primary' : 'text-gray-400'}`}
                />
                <span className="text-sm font-medium text-gray-900">
                  {t.name}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t.description}</p>
            </button>
          )
        })}
      </div>

      {/* Preview del seleccionado */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {selected.name}
            </p>
            <p className="text-xs text-gray-500">
              Asunto: <span className="font-medium">{selected.subject}</span>
            </p>
          </div>
          <Button size="sm" onClick={sendTest} disabled={isPending}>
            <Send className="mr-2 h-4 w-4" />
            {isPending ? 'Enviando…' : 'Enviar test a mi correo'}
          </Button>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 px-4 py-2 text-xs text-blue-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {selected.trigger} · La vista previa usa datos de ejemplo. El HTML
            vive en el código (<code>lib/email/templates.ts</code>).
          </span>
        </div>

        {/* iframe aislado: el CSS del email no afecta a la app */}
        <iframe
          key={selected.id}
          title={`Vista previa: ${selected.name}`}
          srcDoc={selected.html}
          sandbox=""
          className="h-[640px] w-full bg-gray-100"
        />
      </Card>
    </div>
  )
}
