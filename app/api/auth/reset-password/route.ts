/**
 * POST /api/auth/reset-password  (M6)
 *
 * Recibe token + nueva contraseña (form urlencoded), valida el token (existe,
 * no usado, no caducado), fija la nueva contraseña (bcrypt 12, L1) e invalida
 * las sesiones activas del usuario (tokenVersion++, H7).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { hash as bcryptHash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { consumePasswordResetToken } from '@/lib/auth/password-reset'
import { BCRYPT_COST } from '@/lib/auth/password'
import { getAppBaseUrl } from '@/lib/email/client'

const schema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir una mayúscula')
      .regex(/[0-9]/, 'Debe incluir un número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

function backToForm(base: string, token: string, error: string) {
  const url = new URL('/reset-password', base)
  url.searchParams.set('token', token)
  url.searchParams.set('error', error)
  return NextResponse.redirect(url, 303)
}

export async function POST(req: NextRequest) {
  const base = getAppBaseUrl()

  let token = ''
  try {
    const form = await req.formData()
    const parsed = schema.safeParse({
      token: String(form.get('token') ?? ''),
      password: String(form.get('password') ?? ''),
      confirmPassword: String(form.get('confirmPassword') ?? ''),
    })
    token = String(form.get('token') ?? '')

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Datos inválidos'
      return backToForm(base, token, msg)
    }

    const consumed = await consumePasswordResetToken(parsed.data.token)
    if (!consumed) {
      return backToForm(base, token, 'El enlace no es válido o ha caducado')
    }

    const passwordHash = await bcryptHash(parsed.data.password, BCRYPT_COST)
    await prisma.user.update({
      where: { id: consumed.userId },
      // tokenVersion++ invalida las sesiones activas (H7).
      data: { passwordHash, tokenVersion: { increment: 1 } },
    })

    return NextResponse.redirect(new URL('/login?reset=success', base), 303)
  } catch (e) {
    console.error('[reset-password] error:', e)
    return backToForm(base, token, 'No se pudo restablecer la contraseña')
  }
}
