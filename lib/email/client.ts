/**
 * Cliente de email (Resend). Punto único de envío para toda la app.
 *
 * Degrada con elegancia: si `RESEND_API_KEY` no está configurada (dev sin clave,
 * o antes de dar de alta la cuenta), NO lanza — registra un aviso y devuelve
 * `{ ok: false, skipped: true }`. Así los flujos que envían email (reset de
 * contraseña, etc.) siguen funcionando en local sin romper.
 *
 * Cada intento de envío (enviado, fallido o saltado) se persiste en `EmailLog`
 * vía `prismaAdmin` — best-effort, nunca rompe el envío.
 *
 * Configuración (env):
 *   RESEND_API_KEY  — clave de Resend (obligatoria para enviar de verdad).
 *   EMAIL_FROM      — remitente, ej. "Plati <no-reply@plati.es>".
 */

import { Resend } from 'resend'
import { prismaAdmin } from '@/lib/db/prisma-admin'

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
  /**
   * Id de la plantilla del registro (`lib/email/registry.ts`), p. ej.
   * 'password-reset' o 'welcome'. Solo trazabilidad: se persiste en `EmailLog`.
   */
  template?: string
}

export type SendEmailResult = {
  ok: boolean
  id?: string
  /** true si no se envió por falta de RESEND_API_KEY (no es un error duro). */
  skipped?: boolean
  error?: string
}

/** Enmascara direcciones para logs (RGPD): "p***@dominio.com". */
function maskEmailForLog(to: string): string {
  return to
    .split(',')
    .map((addr) => addr.trim().replace(/^(.).*?(@.*)$/, '$1***$2'))
    .join(', ')
}

type EmailLogEntry = {
  to: string
  template: string | undefined
  subject: string
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  providerId?: string | undefined
  error?: string | undefined
}

/**
 * Persiste el resultado de cada intento de envío en `EmailLog` (auditoría de
 * deliverability). Usa `prismaAdmin` (sin guard de tenant: EmailLog no es un
 * modelo multi-tenant). Best-effort: el log NUNCA rompe el envío.
 */
async function persistEmailLog(entry: EmailLogEntry): Promise<void> {
  try {
    await prismaAdmin.emailLog.create({
      data: {
        to: entry.to,
        template: entry.template ?? null,
        subject: entry.subject,
        status: entry.status,
        providerId: entry.providerId ?? null,
        error: entry.error ?? null,
      },
    })
  } catch (e) {
    console.error('[email] no se pudo persistir el registro en EmailLog:', e)
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getClient()
  const to = Array.isArray(input.to) ? input.to.join(', ') : input.to

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada — email NO enviado a "${maskEmailForLog(to)}" (asunto: "${input.subject}")`
    )
    await persistEmailLog({
      to,
      template: input.template,
      subject: input.subject,
      status: 'SKIPPED',
      error: 'RESEND_API_KEY no configurada',
    })
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
      await persistEmailLog({
        to,
        template: input.template,
        subject: input.subject,
        status: 'FAILED',
        error: error.message,
      })
      return { ok: false, error: error.message }
    }
    await persistEmailLog({
      to,
      template: input.template,
      subject: input.subject,
      status: 'SENT',
      providerId: data?.id,
    })
    return { ok: true, id: data?.id }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error desconocido'
    console.error('[email] fallo enviando email:', e)
    await persistEmailLog({
      to,
      template: input.template,
      subject: input.subject,
      status: 'FAILED',
      error: message,
    })
    return { ok: false, error: message }
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
