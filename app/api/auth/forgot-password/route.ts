/**
 * POST /api/auth/forgot-password  (M6)
 *
 * Recibe un email (form urlencoded) y, si corresponde a una cuenta activa,
 * envía un enlace de restablecimiento. SIEMPRE responde igual (redirige a la
 * pantalla de "revisa tu email") para no permitir enumeración de cuentas.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createPasswordResetToken, TOKEN_TTL_MINUTES } from '@/lib/auth/password-reset'
import { sendEmail, getAppBaseUrl } from '@/lib/email/client'
import { passwordResetEmail } from '@/lib/email/templates'
import { decryptNameSafe } from '@/lib/crypto/pii'

export async function POST(req: NextRequest) {
  const base = getAppBaseUrl()
  let email = ''
  try {
    const form = await req.formData()
    email = String(form.get('email') ?? '').trim().toLowerCase()
  } catch {
    // ignore: se responde genérico igualmente
  }

  if (email) {
    try {
      const user = await prisma.user.findFirst({
        where: { email, status: 'ACTIVE', deletedAt: null },
        select: { id: true, email: true, nameEnc: true },
      })
      if (user) {
        const raw = await createPasswordResetToken(user.id)
        const resetUrl = `${base}/reset-password?token=${encodeURIComponent(raw)}`
        const { subject, html, text } = passwordResetEmail({
          resetUrl,
          name: decryptNameSafe(user.nameEnc, ''),
          expiresMinutes: TOKEN_TTL_MINUTES,
        })
        await sendEmail({ to: user.email, subject, html, text })
      }
    } catch (e) {
      // No revelar nada al cliente: log interno y respuesta genérica.
      console.error('[forgot-password] error:', e)
    }
  }

  // Respuesta genérica siempre (anti-enumeración).
  return NextResponse.redirect(new URL('/forgot-password?sent=1', base), 303)
}
