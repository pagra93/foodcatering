import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronRight,
  ChefHat,
  MapPin,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { auth } from '@/lib/auth'
import { MyDpaCard } from '@/components/shared/MyDpaCard'

export default async function CateringConfiguracionPage() {
  const session = (await auth()) as Session | null
  if (!session?.user?.tenantId) redirect('/login')
  const tenantId = session.user.tenantId

  const items = [
    {
      href: '/catering/configuracion/usuarios',
      icon: Users,
      title: 'Usuarios del Catering',
      description:
        'Alta, baja y cambio de rol del equipo: ADMIN_CATERING, CHEF, COCINERO, REPARTIDOR, FINANZAS_CATERING.',
    },
    {
      href: '/catering/configuracion/roles',
      icon: ShieldCheck,
      title: 'Roles y Permisos',
      description:
        'Consulta los 5 roles del portal catering y qué puede hacer cada uno. Solo lectura — los roles son del sistema.',
    },
    {
      href: '/catering/configuracion/branding',
      icon: Palette,
      title: 'Branding',
      description:
        'Personaliza color primario, logo y favicon del portal catering.',
    },
    {
      href: '/catering/configuracion/menu-templates',
      icon: ChefHat,
      title: 'Plantillas de menú',
      description:
        'Plantillas semanales reutilizables. Úsalas como punto de partida al programar menús para cada cliente.',
    },
    {
      href: '/catering/configuracion/zones',
      icon: MapPin,
      title: 'Zonas de reparto',
      description:
        'Códigos postales que cubres, con distancia máxima y notas operativas. Se usa para enrutar pedidos.',
    },
    {
      href: '/catering/configuracion/holidays',
      icon: CalendarDays,
      title: 'Festivos',
      description:
        'Ajusta qué festivos oficiales aplican a tu operativa (24/7 pueden desactivarlos) y añade los tuyos propios.',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administra la configuración del catering, los usuarios del equipo y
          otros ajustes operativos.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group">
            <Card className="p-5 transition-colors group-hover:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <it.icon className="h-4 w-4 text-amber-600" />
                    <h3 className="font-semibold">{it.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{it.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <MyDpaCard tenantId={tenantId} />
    </div>
  )
}
