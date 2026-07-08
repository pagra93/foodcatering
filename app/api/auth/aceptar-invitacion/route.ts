/**
 * POST /api/auth/aceptar-invitacion  (F1)
 *
 * Recibe token + contraseña (form urlencoded), valida la invitación (PENDING, no
 * caducada), fija la contraseña real del usuario invitado, marca la invitación
 * como ACCEPTED e invalida sesiones previas (tokenVersion++). Mismo patrón que
 * el reset de contraseña.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { hash as bcryptHash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
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
  const url = new URL('/invitacion', base)
  url.searchParams.set('token', token)
  url.searchParams.set('error', error)
  return NextResponse.redirect(url, 303)
}

export async function POST(req: NextRequest) {
  const base = getAppBaseUrl()

  let token = ''
  try {
    const form = await req.formData()
    token = String(form.get('token') ?? '')
    const parsed = schema.safeParse({
      token,
      password: String(form.get('password') ?? ''),
      confirmPassword: String(form.get('confirmPassword') ?? ''),
    })

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Datos inválidos'
      return backToForm(base, token, msg)
    }

    const invitation = await prisma.userInvitation.findFirst({
      where: {
        token: parsed.data.token,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })
    if (!invitation) {
      return backToForm(base, token, 'La invitación no es válida o ha caducado')
    }

    // El usuario ya se creó al invitar; se localiza por (tenant, email).
    const user = await prisma.user.findFirst({
      where: { tenantId: invitation.tenantId, email: invitation.email },
      select: { id: true },
    })
    if (!user) {
      return backToForm(base, token, 'No se encontró la cuenta asociada')
    }

    const passwordHash = await bcryptHash(parsed.data.password, BCRYPT_COST)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        // tokenVersion++ invalida cualquier sesión previa (H7).
        data: { passwordHash, status: 'ACTIVE', tokenVersion: { increment: 1 } },
      }),
      prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date(), userId: user.id },
      }),
    ])

    return NextResponse.redirect(new URL('/login?invite=success', base), 303)
  } catch (e) {
    console.error('[aceptar-invitacion] error:', e)
    return backToForm(base, token, 'No se pudo activar la cuenta')
  }
}
