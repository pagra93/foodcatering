import Link from 'next/link'
import { ChevronRight, Palette, MessageSquare, Megaphone } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plantillas y Branding</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Personalización visual y textual de la plataforma: marca blanca por
          tenant (colores, logo, favicon), avisos en-app y plantillas de
          comunicación.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SubModule
          href="/admin/templates/branding"
          icon={Palette}
          iconColor="text-primary"
          title="Branding por tenant"
          description="Marca blanca: color primario/secundario, logo y favicon por tenant. El color tiñe todo su portal."
          badge="Activo"
          badgeVariant="default"
        />
        <SubModule
          href="/admin/templates/announcements"
          icon={Megaphone}
          iconColor="text-amber-600"
          title="Avisos en-app"
          description="Banners INFO/WARNING/CRITICAL segmentados por portal y ventana temporal."
          badge="Activo"
          badgeVariant="default"
        />
        <SubModule
          href="/admin/templates/communication"
          icon={MessageSquare}
          iconColor="text-primary"
          title="Plantillas de comunicación"
          description="Emails del sistema: vista previa y envío de test."
          badge="Activo"
          badgeVariant="default"
        />
      </div>
    </div>
  )
}

function SubModule({
  href,
  icon: Icon,
  iconColor,
  title,
  description,
  badge,
  badgeVariant = 'outline',
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
  badge?: string
  badgeVariant?: 'outline' | 'default' | 'secondary'
}) {
  return (
    <Link href={href} className="group">
      <Card className="p-5 transition-colors group-hover:bg-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${iconColor}`} />
              <h3 className="font-semibold">{title}</h3>
              {badge && (
                <Badge variant={badgeVariant} className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  )
}
