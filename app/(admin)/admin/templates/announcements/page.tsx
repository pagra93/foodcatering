import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAnnouncements } from '@/lib/db/queries/admin-announcements'
import {
  AnnouncementManager,
  type AnnouncementRow,
} from '@/components/admin/templates/announcements/AnnouncementManager'

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements()
  const rows: AnnouncementRow[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    audience: a.audience,
    startsAt: a.startsAt ? a.startsAt.toISOString().slice(0, 10) : null,
    endsAt: a.endsAt ? a.endsAt.toISOString().slice(0, 10) : null,
    dismissible: a.dismissible,
    active: a.active,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Plantillas
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Avisos en-app</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Banners que se muestran a los usuarios dentro de sus portales:
          mantenimientos, cambios, novedades. Segmentados por portal y ventana
          temporal, con severidad Info / Aviso / Crítico.
        </p>
      </div>

      <AnnouncementManager announcements={rows} />
    </div>
  )
}
