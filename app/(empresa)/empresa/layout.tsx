import { Suspense } from 'react'
import { getRequiredSession } from '@/lib/auth/session'
import { getCurrentTenant } from '@/lib/tenant/get-tenant'
import { getUnreadNotifications, getUnreadCount } from '@/lib/db/queries/activity'
import { getCompanyEntitlements } from '@/lib/plans/entitlements'
import { getActiveAnnouncements } from '@/lib/db/queries/admin-announcements'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'
import { EmpresaSidebar } from '@/components/empresa/EmpresaSidebar'
import { EmpresaNavbar } from '@/components/empresa/EmpresaNavbar'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { withBranding } from '@/components/shared/BrandProvider'

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getRequiredSession()
  const tenant = await getCurrentTenant()
  const { branding, style } = await withBranding(tenant.id)

  const [notifications, notifCount, entitlements, announcements] = await Promise.all([
    getUnreadNotifications(session.user.tenantId, session.user.id),
    getUnreadCount(session.user.tenantId, session.user.id),
    getCompanyEntitlements(session.user.tenantId),
    getActiveAnnouncements('EMPRESA'),
  ])

  return (
    <div className="min-h-screen bg-gray-50" style={style}>
      {branding.faviconUrl && (
        <link rel="icon" href={branding.faviconUrl} sizes="any" />
      )}
      <EmpresaSidebar
        tenant={tenant}
        user={session.user}
        permissions={session.user.permissions ?? []}
        features={[...entitlements.features]}
        branding={branding}
      />

      <div className="lg:pl-64">
        <EmpresaNavbar
          tenant={tenant}
          user={session.user}
          notifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            actionUrl: n.actionUrl,
            createdAt: n.createdAt,
          }))}
          notifCount={notifCount}
        />

        <AnnouncementBanner announcements={announcements} />

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<ContentSkeleton />}>{children}</Suspense>
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
