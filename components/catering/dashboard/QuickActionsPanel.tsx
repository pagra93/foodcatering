'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChefHat, Truck, Calendar, type LucideIcon } from 'lucide-react'

type QuickAction = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  variant?: 'default' | 'secondary' | 'outline'
}

const quickActions: QuickAction[] = [
  {
    title: 'Ver Cocina Hoy',
    description: 'Producción y platos del día',
    href: '/catering/produccion',
    icon: ChefHat,
    variant: 'default',
  },
  {
    title: 'Ver Repartos Hoy',
    description: 'Rutas y entregas programadas',
    href: '/catering/repartos',
    icon: Truck,
    variant: 'default',
  },
  {
    title: 'Subir Menú Semanal',
    description: 'Publicar menús próximos días',
    href: '/catering/menus',
    icon: Calendar,
    variant: 'secondary',
  },
]

export function QuickActionsPanel() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Acciones Rápidas
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <Button
                variant={action.variant}
                className="w-full h-auto flex-col items-start gap-2 p-4"
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-xs font-normal opacity-80">
                    {action.description}
                  </div>
                </div>
              </Button>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

