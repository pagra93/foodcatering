'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/components/shared/activity/actions'

type Item = {
  id: string
  title: string
  message: string
  actionUrl: string | null
  createdAt: Date | string
}

export function NotificationBell({ items, count }: { items: Item[]; count: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const open = (it: Item) => {
    startTransition(async () => {
      const res = await markNotificationReadAction({ id: it.id })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      if (it.actionUrl) router.push(it.actionUrl)
      else router.refresh()
    })
  }

  const markAll = () => {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction()
      if (!res.success) {
        toast.error(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notificaciones</DropdownMenuLabel>
          {count > 0 && (
            <button
              onClick={markAll}
              disabled={isPending}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            No tienes notificaciones nuevas.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => open(it)}
                disabled={isPending}
                className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted"
              >
                <span className="text-sm font-medium text-gray-900">{it.title}</span>
                <span className="line-clamp-2 text-xs text-gray-600">{it.message}</span>
                <span className="text-[10px] text-gray-400">
                  {formatDistanceToNow(new Date(it.createdAt), { addSuffix: true, locale: es })}
                </span>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
