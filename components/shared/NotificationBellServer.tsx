import { auth } from '@/lib/auth'
import {
  getUnreadNotifications,
  getUnreadCount,
} from '@/lib/db/queries/activity'
import { NotificationBell } from './NotificationBell'

/** Carga las notificaciones no leídas del usuario y monta la campana. */
export async function NotificationBellServer() {
  const session = await auth()
  if (!session?.user?.tenantId) return null

  const [items, count] = await Promise.all([
    getUnreadNotifications(session.user.tenantId, session.user.id),
    getUnreadCount(session.user.tenantId, session.user.id),
  ])

  return (
    <NotificationBell
      items={items.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        actionUrl: n.actionUrl,
        createdAt: n.createdAt,
      }))}
      count={count}
    />
  )
}
