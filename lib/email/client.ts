/**
 * Cliente de email (Resend). Punto único de envío para toda la app.
 *
 * Degrada con elegancia: si `RESEND_API_KEY` no está configurada (dev sin clave,
 * o antes de dar de alta la cuenta), NO lanza — registra un aviso y devuelve
 * `{ ok: false, skipped: true }`. Así los flujos que envían email (reset de
 * contraseña, etc.) siguen funcionando en local sin romper.
 *
 * Configuración (env):
 *   RESEND_API_KEY  — clave de Resend (obligatoria para enviar de verdad).
 *   EMAIL_FROM      — remitente, ej. "Plati <no-reply@plati.es>".
 */

import { Resend } from 'resend'

const DEFAULT_FROM = 'Plati <no-reply@plati.es>'

let cached: Resend | null = null

function getClient(): Resend | null {
  const key = process.env['RESEND_API_KEY']
  if (!key) return null
  if (!cached) cached = new Resend(key)
  return cached
}

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export type SendEmailResult = {
  ok: boolean
  id?: string
  /** true si no se envió por falta de RESEND_API_KEY (no es un error duro). */
  skipped?: boolean
  error?: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getClient()
  const to = Array.isArray(input.to) ? input.to.join(', ') : input.to

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada — email NO enviado a "${to}" (asunto: "${input.subject}")`
    )
    return { ok: false, skipped: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env['EMAIL_FROM'] || DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    })
    if (error) {
      console.error('[email] Resend devolvió error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (e) {
    console.error('[email] fallo enviando email:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' }
  }
}

/** True si el envío real está configurado (hay RESEND_API_KEY). Solo servidor. */
export function isEmailConfigured(): boolean {
  return !!process.env['RESEND_API_KEY']
}

/** URL base pública de la app para construir enlaces en emails. */
export function getAppBaseUrl(): string {
  return (
    process.env['NEXT_PUBLIC_APP_URL'] ||
    process.env['NEXTAUTH_URL'] ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}
