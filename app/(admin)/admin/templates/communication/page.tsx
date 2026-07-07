import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EMAIL_TEMPLATES, renderSampleEmail } from '@/lib/email/registry'
import {
  CommunicationTemplates,
  type TemplateView,
} from '@/components/admin/templates/communication/CommunicationTemplates'

export default function CommunicationPage() {
  // El HTML se genera en el servidor a partir de las plantillas de código;
  // el cliente solo lo previsualiza y permite enviar un test.
  const templates: TemplateView[] = EMAIL_TEMPLATES.map((t) => {
    const sample = renderSampleEmail(t.id)
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      trigger: t.trigger,
      subject: sample?.subject ?? '',
      html: sample?.html ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Plantillas
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Plantillas de Comunicación
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Emails que envía el sistema. Previsualízalos y envíate un test. El
          diseño y los textos viven en el código (<code>lib/email</code>);
          editarlos desde aquí llegará en una versión futura.
        </p>
      </div>

      <CommunicationTemplates templates={templates} />
    </div>
  )
}
