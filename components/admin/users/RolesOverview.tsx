'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronRight, Users, ShieldCheck, Lock } from 'lucide-react'
import type { UserRole } from '@prisma/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PERMISSIONS } from '@/lib/auth/permissions'
import type { RoleUsageStat } from '@/lib/db/queries/admin-roles'

const CATEGORY_META = {
  ROOT: {
    title: 'Equipo Plati',
    description:
      'Roles internos del equipo que opera la plataforma. Gestión directa desde este portal.',
    color: 'purple',
    icon: ShieldCheck,
    gestionable: true,
  },
  EMPRESA: {
    title: 'Roles de Empresas',
    description:
      'Roles que usan las empresas clientes en su propio portal. Solo lectura aquí — la gestión la hace cada ADMIN_EMPRESA desde /empresa/configuracion/usuarios.',
    color: 'blue',
    icon: Lock,
    gestionable: false,
  },
  CATERING: {
    title: 'Roles de Caterings',
    description:
      'Roles que usan los caterings en su portal. Solo lectura — la gestión la hace cada ADMIN_CATERING desde /catering/configuracion/usuarios.',
    color: 'amber',
    icon: Lock,
    gestionable: false,
  },
} as const

const COLORS = {
  purple:
    'border-primary/30 bg-primary/10 [--color-bar:theme(colors.purple.600)]',
  blue: 'border-primary/30 bg-primary/10 [--color-bar:theme(colors.blue.600)]',
  amber:
    'border-amber-200 bg-amber-50/50 [--color-bar:theme(colors.amber.600)]',
} as const

type Tab = 'ROOT' | 'EMPRESA' | 'CATERING'

export function RolesOverview({ stats }: { stats: RoleUsageStat[] }) {
  const [tab, setTab] = useState<Tab>('ROOT')
  const categoryStats = stats.filter((s) => s.category === tab)
  const meta = CATEGORY_META[tab]
  const Icon = meta.icon

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {(['ROOT', 'EMPRESA', 'CATERING'] as const).map((t) => {
          const count = stats.filter((s) => s.category === t).length
          const users = stats
            .filter((s) => s.category === t)
            .reduce((sum, s) => sum + s.usersCount, 0)
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {CATEGORY_META[t].title}
              <Badge variant="outline" className="text-xs">
                {count} roles · {users} users
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Header de la categoría */}
      <Card className={`p-5 ${COLORS[meta.color]}`}>
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="text-base font-semibold">{meta.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{meta.description}</p>
            {!meta.gestionable && (
              <Badge variant="secondary" className="mt-2">
                Solo lectura
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Grid de roles */}
      <div className="grid gap-4 md:grid-cols-2">
        {categoryStats.map((stat) => (
          <RoleCard key={stat.role} stat={stat} />
        ))}
      </div>
    </div>
  )
}

function RoleCard({ stat }: { stat: RoleUsageStat }) {
  const permissions = PERMISSIONS[stat.role as UserRole] ?? []

  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-mono text-sm font-semibold">{stat.role}</h3>
          <Badge variant="outline" className="text-xs">
            {stat.permissionsCount} permisos
          </Badge>
        </div>

        <p className="mt-2 text-sm text-gray-600">{stat.description}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {permissions.slice(0, 6).map((p) => (
            <Badge
              key={p}
              variant="outline"
              className="font-mono text-[10px] uppercase tracking-wider"
            >
              {p}
            </Badge>
          ))}
          {permissions.length > 6 && (
            <Badge variant="secondary" className="text-[10px]">
              +{permissions.length - 6}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>
            <strong>{stat.usersCount}</strong>{' '}
            {stat.usersCount === 1 ? 'usuario' : 'usuarios'}
          </span>
        </div>
        <span className="text-gray-500">
          {stat.lastActivityAt
            ? `Activo ${formatDistanceToNow(stat.lastActivityAt, {
                locale: es,
                addSuffix: true,
              })}`
            : 'Sin actividad reciente'}
        </span>
      </div>

      <Link
        href={{
          pathname: '/admin/users',
          query: { role: stat.role },
        }}
        className="mt-3 inline-flex items-center text-xs font-medium text-primary hover:underline"
      >
        Ver usuarios con este rol
        <ChevronRight className="ml-0.5 h-3 w-3" />
      </Link>
    </Card>
  )
}
