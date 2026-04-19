/**
 * Layout interno del Portal del Catering
 * 
 * Incluye:
 * - CateringNavbar (top)
 * - CateringSidebar (left)
 * - Área de contenido principal
 * - ImpersonationBanner si aplica
 */

import { CateringNavbar } from '@/components/catering/CateringNavbar'
import { CateringSidebar } from '@/components/catering/CateringSidebar'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'
import { withBranding } from '@/components/shared/BrandProvider'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'

export default async function CateringInnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Obtener información del tenant (catering)
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
    },
  })

  if (!tenant) {
    redirect('/unauthorized')
  }

  const tenantData = {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    status: tenant.status,
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor,
  }

  const userData = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  }

  const { branding, style } = await withBranding(tenant.id)

  return (
    <div className="flex h-screen overflow-hidden" style={style}>
      {branding.faviconUrl && (
        <link rel="icon" href={branding.faviconUrl} sizes="any" />
      )}

      <CateringSidebar tenant={tenantData} user={userData} branding={branding} />

      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        {session?.user?.impersonationToken && <ImpersonationBanner />}
        <CateringNavbar tenant={tenantData} user={userData} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

