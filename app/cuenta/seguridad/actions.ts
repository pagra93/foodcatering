'use server'

/**
 * Server Actions de /cuenta/seguridad — gestión del MFA (TOTP) del propio
 * usuario. Accesible a cualquier usuario autenticado (F2).
 *
 * Contrato: todas las actions devuelven `ActionResult` (withAction). Todo
 * cambio de segundo factor deja rastro en audit_logs (best-effort) y
 * revalida la página para que refleje el estado real del MFA.
 */

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import QRCode from 'qrcode'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { encryptPII, decryptPII } from '@/lib/crypto/pii'
import { logAudit } from '@/lib/auth/audit'
import { DomainError } from '@/lib/errors'
import { withAction, type ActionResult } from '@/lib/actions/with-action'
import {
  generateMfaSecret,
  buildOtpauthUrl,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  formatBackupCode,
} from '@/lib/auth/mfa'

async function requireUser() {
  const session = (await auth()) as Session | null
  if (!session?.user) throw new DomainError('Sesión requerida', 403)
  return session.user
}

/** Genera un secreto nuevo (aún sin activar) y devuelve el QR para escanear. */
export async function startMfaEnrollment(): Promise<
  ActionResult<{ qrDataUrl: string; secret: string }>
> {
  return withAction(async () => {
    const actor = await requireUser()
    const secret = generateMfaSecret()

    // Se guarda cifrado pero SIN activar mfaEnabled hasta confirmar un código.
    await prisma.user.update({
      where: { id: actor.id },
      data: { mfaSecret: encryptPII(secret) },
    })

    await logAudit({
      tenantId: actor.tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: actor.id,
      diff: { after: { mfaEnrollmentStarted: true } },
    })

    revalidatePath('/cuenta/seguridad')

    const otpauthUrl = buildOtpauthUrl(actor.email, secret)
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl)
    // `secret` se devuelve para introducción manual si no se puede escanear.
    return { qrDataUrl, secret }
  })
}

/** Confirma el enrolamiento verificando un código y activa el MFA. */
export async function confirmMfaEnrollment(
  code: string
): Promise<ActionResult<{ backupCodes: string[] }>> {
  return withAction(async () => {
    const actor = await requireUser()
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { mfaSecret: true },
    })
    if (!user?.mfaSecret) {
      throw new DomainError('Genera primero el código QR')
    }

    const secret = decryptPII(user.mfaSecret)
    if (!verifyTotp(secret, code)) {
      throw new DomainError('El código no es válido. Revisa la hora del móvil.')
    }

    const backupCodes = generateBackupCodes(8)
    await prisma.user.update({
      where: { id: actor.id },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: backupCodes.map(hashBackupCode),
      },
    })

    await logAudit({
      tenantId: actor.tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: actor.id,
      diff: { after: { mfaEnabled: true } },
    })

    revalidatePath('/cuenta/seguridad')

    // Se muestran una sola vez, formateados.
    return { backupCodes: backupCodes.map(formatBackupCode) }
  })
}

/** Desactiva el MFA tras verificar un código (TOTP o de recuperación). */
export async function disableMfa(code: string): Promise<ActionResult<void>> {
  return withAction(async () => {
    const actor = await requireUser()
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { mfaEnabled: true, mfaSecret: true, mfaBackupCodes: true },
    })
    if (!user?.mfaEnabled || !user.mfaSecret) return

    const secret = decryptPII(user.mfaSecret)
    const valid =
      verifyTotp(secret, code) ||
      user.mfaBackupCodes.includes(hashBackupCode(code))
    if (!valid) {
      throw new DomainError('El código no es válido')
    }

    await prisma.user.update({
      where: { id: actor.id },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
    })

    await logAudit({
      tenantId: actor.tenantId,
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: actor.id,
      diff: { after: { mfaEnabled: false } },
    })

    revalidatePath('/cuenta/seguridad')
  })
}
