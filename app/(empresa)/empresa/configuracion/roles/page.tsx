import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react'
import type { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  PERMISSION_DESCRIPTIONS,
  rolesByTenantType,
} from '@/lib/auth/permissions'

export default function EmpresaRolesPage() {
  const roles = rolesByTenantType('EMPRESA')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/empresa/configuracion">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Configuración
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Roles de tu empresa</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Los 5 roles disponibles en el portal empresa. La configuración de
          permisos es del sistema y no editable — si necesitas cambios,
          contacta con Plati. Aquí puedes ver qué puede hacer cada rol
          para decidir qué asignas a cada persona.
        </p>
        <Badge variant="secondary" className="mt-2 gap-1.5">
          <Lock className="h-3.5 w-3.5" /> Solo lectura
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const permissions = PERMISSIONS[role as UserRole] ?? []
          return (
            <Card key={role} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 font-mono text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {role}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {ROLE_DESCRIPTIONS[role as UserRole]}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {permissions.length} permisos
                </Badge>
              </div>

              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                  Puede hacer
                </p>
                <ul className="space-y-1.5">
                  {permissions.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-xs text-gray-700"
                    >
                      <span className="mt-0.5 font-mono text-primary">✓</span>
                      <span>
                        <code className="mr-1 font-mono">{p}</code>
                        <span className="text-gray-500">
                          {PERMISSION_DESCRIPTIONS[p] ?? ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
