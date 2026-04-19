import { ModuleUnderDevelopment } from '@/components/admin/ModuleUnderDevelopment'

export default function AnnouncementsPage() {
  return (
    <ModuleUnderDevelopment
      title="Avisos en-app"
      breadcrumb={['Plantillas y Branding']}
      backHref="/admin/templates"
      backLabel="Volver a Plantillas"
      purpose="Banners in-app que aparecen a ciertos usuarios cuando entran a su portal. Útil para anunciar nuevas features, mantenimientos programados, cambios de política, etc. Segmentables por rol, tipo de tenant, duración."
      plannedFeatures={[
        'CRUD de aviso con título, cuerpo, severidad (INFO/WARNING/CRITICAL).',
        'Audiencia: roles + tipos de tenant + lista de tenants concretos.',
        'Programación: startsAt / endsAt.',
        'Flag dismissible (el user puede cerrarlo) vs permanente.',
        'Preview cómo se verá en cada portal antes de publicar.',
        'Componente <AnnouncementBanner> inyectado en layouts automáticamente.',
      ]}
      dataSources={[
        'Announcement (nuevo modelo Prisma)',
        'Audiencia JSON: { roles: [...], tenantTypes: [...], tenantIds: [...] }',
      ]}
      eta="Sprint 4"
    />
  )
}
