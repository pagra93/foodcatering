/**
 * MFA por TOTP (F2). Segundo factor con apps tipo Google Authenticator.
 *
 * - El secreto se genera aquí y se guarda CIFRADO en `User.mfaSecret`
 *   (encryptPII, AES-256-GCM). Nunca se persiste en claro.
 * - Los códigos de recuperación se guardan como hash SHA-256 en
 *   `User.mfaBackupCodes` y son de un solo uso.
 * - Módulo server-only (usa node:crypto + otplib).
 */

import * as OTPAuth from 'otpauth'
import { createHash, randomBytes } from 'node:crypto'

const ISSUER = 'Plati'
// Tolerancia de ±1 ventana (30s) para desajustes de reloj del móvil.
const WINDOW = 1

function buildTotp(email: string, secret: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
}

/** Genera un secreto TOTP nuevo (base32). */
export function generateMfaSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32
}

/** URL `otpauth://` para el QR (a partir del email y el secreto). */
export function buildOtpauthUrl(email: string, secret: string): string {
  return buildTotp(email, secret).toString()
}

/** Verifica un código TOTP de 6 dígitos contra el secreto. */
export function verifyTotp(secret: string, token: string): boolean {
  try {
    const totp = buildTotp(ISSUER, secret)
    return totp.validate({ token: token.replace(/\s+/g, ''), window: WINDOW }) !== null
  } catch {
    return false
  }
}

/** Genera N códigos de recuperación en claro (para mostrar una sola vez). */
export function generateBackupCodes(n = 8): string[] {
  return Array.from({ length: n }, () => randomBytes(5).toString('hex'))
}

/** Hash SHA-256 de un código de recuperación (normalizado). */
export function hashBackupCode(code: string): string {
  return createHash('sha256')
    .update(code.trim().toLowerCase().replace(/\s+/g, ''))
    .digest('hex')
}

/** Formatea un código en claro para mostrarlo (xxxxx-xxxxx). */
export function formatBackupCode(code: string): string {
  return code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code
}
