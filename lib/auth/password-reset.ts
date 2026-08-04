/**
 * Tokens de restablecimiento de contraseña (M6 + L3).
 *
 * - El token en claro (alta entropía) se genera aquí y viaja SOLO por email.
 * - En BD se guarda únicamente su hash SHA-256.
 * - Caduca a los `TOKEN_TTL_MINUTES` y es de un solo uso.
 * - Al emitir uno nuevo se invalidan los anteriores no usados del usuario.
 */

import { randomBytes, createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'

export const TOKEN_TTL_MINUTES = 60

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** Crea un token de reset y devuelve el valor EN CLARO (para el enlace del email). */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

  await prisma.$transaction([
    // Invalidar tokens previos no usados (un solo enlace válido a la vez).
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(raw), expiresAt },
    }),
  ])

  return raw
}

/**
 * Valida y consume un token. Devuelve el `userId` si es válido (existe, no usado,
 * no caducado) y lo marca como usado; en caso contrario devuelve null.
 */
export async function consumePasswordResetToken(
  raw: string
): Promise<{ userId: string } | null> {
  const token = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashToken(raw),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (!token) return null

  // Consumo ATÓMICO: condicionado a usedAt:null en el WHERE. Dos POST en
  // paralelo con el mismo enlace → solo uno consume; el otro recibe null
  // (antes ambos pasaban el check y fijaban contraseñas distintas).
  const res = await prisma.passwordResetToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (res.count !== 1) return null

  return { userId: token.userId }
}
