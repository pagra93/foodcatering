'use server'

/**
 * Server Actions de /admin/templates/communication.
 * Envío de un email de prueba (con datos de ejemplo) al propio super admin.
 */

import { requireSuperAdmin } from '@/lib/auth/require-super-admin'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import { renderSampleEmail } from '@/lib/email/registry'
import { sendEmail } from '@/lib/email/client'

export async function sendTestEmailAction(
  templateId: string
): Promise<ActionResult<{ sent: boolean; skipped: boolean; email: string }>> {
  return withAction(async () => {
    const actor = await requireSuperAdmin('template-communication:view')

    const sample = renderSampleEmail(templateId)
    if (!sample) throw new DomainError('Plantilla no encontrada', 404)

    const result = await sendEmail({
      to: actor.email,
      subject: `[TEST] ${sample.subject}`,
      html: sample.html,
      text: sample.text,
      template: templateId,
    })

    return {
      sent: result.ok,
      skipped: result.skipped ?? false,
      email: actor.email,
    }
  })
}
