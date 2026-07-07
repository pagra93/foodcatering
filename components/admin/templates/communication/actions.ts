'use server'

/**
 * Server Actions de /admin/templates/communication.
 * Envío de un email de prueba (con datos de ejemplo) al propio super admin.
 */

import { requireSuperAdmin } from '@/lib/auth/require-super-admin'
import { renderSampleEmail } from '@/lib/email/registry'
import { sendEmail } from '@/lib/email/client'

export async function sendTestEmailAction(templateId: string) {
  const actor = await requireSuperAdmin('template-communication:view')

  const sample = renderSampleEmail(templateId)
  if (!sample) throw new Error('Plantilla no encontrada')

  const result = await sendEmail({
    to: actor.email,
    subject: `[TEST] ${sample.subject}`,
    html: sample.html,
    text: sample.text,
  })

  return {
    ok: result.ok,
    skipped: result.skipped ?? false,
    email: actor.email,
  }
}
