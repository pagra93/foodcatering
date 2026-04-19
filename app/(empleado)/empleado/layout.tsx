import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenant } from '@/lib/tenant/get-tenant'
import { EmpleadoNavbar } from '@/components/empleado/EmpleadoNavbar'
import { withBranding } from '@/components/shared/BrandProvider'

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const tenant = await getTenant()

  if (!session) {
    redirect('/login')
  }

  if (tenant.type !== 'EMPRESA') {
    redirect('/login')
  }

  const { branding, style } = await withBranding(tenant.id)

  return (
    <div className="min-h-screen bg-gray-50" style={style}>
      {branding.faviconUrl && (
        <link rel="icon" href={branding.faviconUrl} sizes="any" />
      )}
      <EmpleadoNavbar
        user={{
          name: session.user.name || '',
          email: session.user.email || '',
          role: session.user.role || '',
        }}
        branding={branding}
      />
      <main className="pb-20">{children}</main>
    </div>
  )
}
