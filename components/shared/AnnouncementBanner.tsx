'use client'

/**
 * Banner de avisos en-app. Recibe los avisos activos (resueltos en el layout del
 * portal) y los muestra. Los descartables se ocultan al cerrarlos, recordándolo
 * en localStorage por id (sin tabla por-usuario).
 */

import { useEffect, useState } from 'react'
import { X, Info, AlertTriangle, AlertOctagon } from 'lucide-react'
import type { ActiveAnnouncement } from '@/lib/db/queries/admin-announcements'

const STORAGE_KEY = 'plati:dismissed-announcements'

const STYLE: Record<
  ActiveAnnouncement['severity'],
  { box: string; icon: typeof Info }
> = {
  INFO: { box: 'border-primary/30 bg-primary/5 text-primary', icon: Info },
  WARNING: { box: 'border-amber-300 bg-amber-50 text-amber-800', icon: AlertTriangle },
  CRITICAL: { box: 'border-red-300 bg-red-50 text-red-800', icon: AlertOctagon },
}

export function AnnouncementBanner({ announcements }: { announcements: ActiveAnnouncement[] }) {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setDismissed(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      setDismissed([])
    }
    setMounted(true)
  }, [])

  if (!mounted) return null

  const visible = announcements.filter((a) => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  const dismiss = (id: string) => {
    const next = [...new Set([...dismissed, id])]
    setDismissed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-2 px-4 pt-4 lg:px-8">
      {visible.map((a) => {
        const s = STYLE[a.severity]
        const Icon = s.icon
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${s.box}`}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{a.title}</p>
              <p className="mt-0.5 opacity-90">{a.body}</p>
            </div>
            {a.dismissible && (
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                aria-label="Descartar aviso"
                className="flex-shrink-0 rounded p-1 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
