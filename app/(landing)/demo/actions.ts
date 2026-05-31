'use server'

import { demoRequestSchema, type DemoRequest } from '@/lib/validations/landing'

export type DemoActionState = {
  success: boolean
  message?: string
  fieldErrors?: Partial<Record<keyof DemoRequest, string[]>>
}

/**
 * Submit demo request.
 *
 * NOTE: Backend integration pending. Current implementation validates +
 * logs to server stdout. Before production, connect to one of:
 *   - Resend (install: `pnpm add resend`) + notify sales inbox
 *   - HubSpot forms API
 *   - Prisma `Lead` table (requires new migration)
 *
 * Decision pending PM approval.
 */
export async function submitDemoRequest(
  _prev: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const raw = {
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company'),
    employees: formData.get('employees')
      ? Number(formData.get('employees'))
      : undefined,
    role: formData.get('role'),
    message: formData.get('message') || undefined,
    gdprConsent: formData.get('gdprConsent') === 'on',
  }

  const parsed = demoRequestSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof DemoRequest, string[]>> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof DemoRequest
      if (!fieldErrors[key]) fieldErrors[key] = []
      fieldErrors[key]!.push(issue.message)
    }
    return {
      success: false,
      message: 'Revisa los campos marcados.',
      fieldErrors,
    }
  }

  // TODO: reemplazar por integración real (Resend / HubSpot / Prisma).
  console.log('[demo-request]', JSON.stringify(parsed.data, null, 2))

  return {
    success: true,
    message:
      'Solicitud recibida. Te contactamos en menos de 24 horas laborables.',
  }
}
