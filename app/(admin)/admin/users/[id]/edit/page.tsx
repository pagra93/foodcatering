import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Session } from 'next-auth'
import type { RoleCategory } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { decryptNameSafe } from '@/lib/crypto/pii'
import { EditUserForm } from '@/components/admin/users/EditUserForm'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [session, user] = await Promise.all([
    auth() as Promise<Session | null>,
    prisma.user.findUnique({
      where: { id },
      include: {
        tenant: { select: { name: true, type: true } },
      },
    }),
  ])

  if (!user) notFound()

  // Roles del RBAC válidos para la categoría del tenant (sistema + custom).
  const roles = await prisma.role.findMany({
    where: { category: user.tenant.type as unknown as RoleCategory },
    select: { id: true, name: true, isSystem: true },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })

  const currentUserId = session?.user?.id ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/users/${user.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al usuario
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Editar Usuario</h1>
        <p className="mt-1 text-sm text-gray-500">
          {decryptNameSafe(user.nameEnc, user.email)} · {user.email}
        </p>
      </div>

      <EditUserForm
        user={{
          id: user.id,
          email: user.email,
          nameEnc: decryptNameSafe(user.nameEnc, ''),
          phoneEnc: user.phoneEnc,
          role: user.role,
          roleId: user.roleId,
        }}
        tenant={user.tenant}
        roles={roles}
        currentUserId={currentUserId}
      />
    </div>
  )
}
