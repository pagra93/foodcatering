'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Lock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { postMessageAction } from './actions'

type Side = 'admin' | 'catering' | 'empresa' | 'other'

type Message = {
  id: string
  body: string
  isInternal: boolean
  createdAt: Date | string
  author: { id: string; name: string; role: string; tenantName: string; side: Side }
}

const SIDE_LABEL: Record<Side, string> = {
  admin: 'Plati',
  catering: 'Catering',
  empresa: 'Empresa',
  other: '—',
}
const SIDE_COLOR: Record<Side, string> = {
  admin: 'bg-primary/10 text-primary border-primary/30',
  catering: 'bg-amber-100 text-amber-700 border-amber-200',
  empresa: 'bg-blue-100 text-blue-700 border-blue-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
}

type Props = {
  entity: 'PENALTY' | 'INCIDENT'
  entityId: string
  messages: Message[]
  /** Solo el equipo Plati puede escribir notas internas. */
  canPostInternal: boolean
}

export function ActivityThread({ entity, entityId, messages, canPostInternal }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)

  const send = () => {
    const text = body.trim()
    if (!text) return
    startTransition(async () => {
      const res = await postMessageAction({
        entity,
        entityId,
        body: text,
        isInternal: internal,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setBody('')
      setInternal(false)
      router.refresh()
    })
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-base font-semibold">Seguimiento</h3>

      {messages.length === 0 ? (
        <p className="text-sm text-gray-500">
          No hay mensajes todavía. Escribe el primero para dejar constancia y avisar a la otra parte.
        </p>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border p-3 ${
                m.isInternal ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200'
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${SIDE_COLOR[m.author.side]}`}
                >
                  {SIDE_LABEL[m.author.side]}
                </span>
                <span className="text-sm font-medium text-gray-900">{m.author.name}</span>
                <span className="text-xs text-gray-400">· {m.author.tenantName}</span>
                {m.isInternal && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                    <Lock className="h-3 w-3" /> nota interna
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {format(new Date(m.createdAt), "d MMM · HH:mm", { locale: es })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{m.body}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Compose */}
      <div className="mt-4 space-y-2 border-t pt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Escribe un mensaje…"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between">
          {canPostInternal ? (
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
              />
              Nota interna (solo equipo Plati)
            </label>
          ) : (
            <span />
          )}
          <Button onClick={send} disabled={isPending || !body.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {isPending ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
