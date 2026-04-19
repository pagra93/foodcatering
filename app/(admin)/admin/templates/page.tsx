import { ModuleUnderDevelopment } from '@/components/admin/ModuleUnderDevelopment'

export default function TemplatesPage() {
  return (
    <ModuleUnderDevelopment
      title="Plantillas y Branding"
      breadcrumb={[]}
      purpose="Personalización visual y textual de la plataforma: colores y logos por tenant, plantillas de emails/SMS/WhatsApp con variables, y avisos en-app segmentados por audiencia."
      plannedFeatures={[
        'Branding por tenant: colores primario/secundario, logo, favicon, CSS personalizado.',
        'Preview en vivo del portal con los cambios de branding aplicados.',
        'Plantillas de comunicación: email/SMS/WhatsApp/in-app con variables Liquid.',
        'Avisos en-app: banners INFO/WARNING/CRITICAL segmentados por rol y tenant.',
        'Envío de test con datos dummy al super admin.',
      ]}
      dataSources={[
        'Tenant.primaryColor / logoUrl (ya existen)',
        'Tenant.secondaryColor / faviconUrl / customCss (campos nuevos)',
        'CommunicationTemplate (nuevo modelo)',
        'Announcement (nuevo)',
      ]}
      eta="Sprint 4"
    />
  )
}
