import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  ChefHat,
  MapPin,
  Wheat,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { prisma } from '@/lib/db/prisma'

export default async function AdminCatalogsPage() {
  const [allergenCount, holidayCount, reasonCount] = await Promise.all([
    prisma.allergen.count({ where: { active: true } }),
    prisma.holiday.count({ where: { scope: { in: ['NATIONAL', 'REGION'] } } }),
    prisma.incidentReason.count({ where: { scope: 'SYSTEM', active: true } }),
  ])

  const items = [
    {
      href: '/admin/catalogs/allergens',
      icon: Wheat,
      title: 'Alérgenos',
      count: `${allergenCount} activos`,
      description:
        'Los 14 oficiales de la UE + personalizados. Los caterings los asignan a sus platos.',
    },
    {
      href: '/admin/catalogs/calendars',
      icon: CalendarDays,
      title: 'Festivos',
      count: `${holidayCount} oficiales`,
      description:
        'Nacionales y regionales. Excluyen días del cómputo fiscal IRPF. Empresas y caterings pueden desactivar los que no apliquen a su operativa.',
    },
    {
      href: '/admin/catalogs/incident-reasons',
      icon: AlertTriangle,
      title: 'Motivos de incidencia',
      count: `${reasonCount} activos`,
      description:
        'Catálogo global de motivos que empleados y caterings ven al reportar incidencias. Alimenta severidad SLA y auto-compensación.',
    },
    {
      href: '/admin/catalogs/menu-templates',
      icon: ChefHat,
      title: 'Plantillas de menú',
      count: 'Por catering',
      description:
        'Cada catering gestiona sus propias plantillas desde su portal. Admin solo consulta y audita.',
      muted: true,
    },
    {
      href: '/admin/catalogs/zones',
      icon: MapPin,
      title: 'Zonas de reparto',
      count: 'Por catering',
      description:
        'Cada catering define sus zonas por CP desde su portal. Admin solo consulta.',
      muted: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogos globales</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Datos maestros del sistema. Los tres primeros los gestiona el súper
          admin (alérgenos, festivos y motivos). Plantillas y zonas las
          administra cada catering desde su portal.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group">
            <Card
              className={`p-5 transition-colors group-hover:bg-gray-50 ${
                it.muted ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <it.icon className="h-4 w-4 text-gray-700" />
                    <h3 className="font-semibold">{it.title}</h3>
                    <span className="text-xs text-gray-500">· {it.count}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{it.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
