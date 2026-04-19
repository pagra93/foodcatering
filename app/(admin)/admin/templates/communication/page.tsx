import { ModuleUnderDevelopment } from '@/components/admin/ModuleUnderDevelopment'

export default function CommunicationPage() {
  return (
    <ModuleUnderDevelopment
      title="Plantillas de Comunicación"
      breadcrumb={['Plantillas y Branding']}
      backHref="/admin/templates"
      backLabel="Volver a Plantillas"
      purpose="Plantillas editables de emails, SMS, WhatsApp e in-app para todos los eventos del sistema: confirmación de pedido, factura emitida, incidencia reportada, invitación a empleado, etc. Variables Liquid-style con datos del contexto."
      plannedFeatures={[
        'CRUD de plantilla: canal (EMAIL/SMS/WHATSAPP/IN_APP), código, locale.',
        'Editor con subject, bodyHtml, bodyText.',
        'Variables disponibles documentadas: {{employee.name}}, {{order.date}}, …',
        'Preview con datos dummy.',
        'Envío de test al email del super admin.',
        'Scope: plantillas globales del sistema + overrides por tenant.',
        'Versionado para poder revertir.',
      ]}
      dataSources={[
        'CommunicationTemplate (nuevo modelo Prisma)',
        'Channel enum: EMAIL / SMS / WHATSAPP / IN_APP',
      ]}
      eta="Sprint 4"
    />
  )
}
