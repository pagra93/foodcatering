/**
 * Cifrado simétrico para campos PII (personally identifiable information).
 *
 * Modelo: AES-256-GCM con IV aleatorio por operación. Formato de salida:
 *   base64( IV (12 bytes) | authTag (16 bytes) | ciphertext )
 *
 * La clave se toma de `PII_ENCRYPTION_KEY` (32 bytes en hex = 64 chars).
 * Generar con: `openssl rand -hex 32`.
 *
 * Este helper es la base para Sprint 4 (cifrado real de `User.nameEnc`,
 * `User.phoneEnc` y cualquier PII adicional). Hoy los campos se almacenan en
 * texto plano; el plan es migrar con un script de una sola ejecución que
 * reescriba todos los registros al nuevo formato cifrado.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm' as const
const IV_LENGTH = 12 // GCM recomienda 96 bits
const KEY_LENGTH = 32 // 256 bits

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env['PII_ENCRYPTION_KEY']
  if (!raw) {
    throw new Error(
      'PII_ENCRYPTION_KEY no está configurada. Genera una con `openssl rand -hex 32` y añádela al entorno.'
    )
  }

  const key = Buffer.from(raw, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `PII_ENCRYPTION_KEY debe tener ${KEY_LENGTH} bytes (64 chars hex). Recibidos: ${key.length} bytes.`
    )
  }

  cachedKey = key
  return key
}

/**
 * Cifra una cadena (PII) con AES-256-GCM. Devuelve el blob en base64.
 *
 * Lanza si `PII_ENCRYPTION_KEY` falta o es inválida.
 */
export function encryptPII(plain: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, enc]).toString('base64')
}

/**
 * Descifra un blob PII previamente cifrado por `encryptPII`.
 *
 * Lanza si el blob es inválido, la clave no coincide, o el authTag falla
 * (integridad comprometida).
 */
export function decryptPII(blob: string): string {
  const buf = Buffer.from(blob, 'base64')
  if (buf.length < IV_LENGTH + 16) {
    throw new Error('Blob PII inválido (demasiado corto)')
  }

  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16)
  const ciphertext = buf.subarray(IV_LENGTH + 16)

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/**
 * Utilidad: ¿parece este valor un blob cifrado por `encryptPII`?
 * Heurística: longitud mínima + sólo caracteres base64.
 * No es fiable al 100% pero sirve para filtrar valores legados en texto plano
 * durante la migración.
 */
export function looksEncrypted(value: string | null | undefined): boolean {
  if (!value) return false
  if (value.length < 40) return false
  return /^[A-Za-z0-9+/]+=*$/.test(value)
}

/**
 * Descifra de forma segura un nombre PII para mostrarlo en UI.
 *
 * Tolera el periodo de migración: si el valor está en texto plano (legado, aún
 * sin cifrar) lo devuelve tal cual; si parece cifrado intenta descifrarlo y, si
 * falla (clave ausente/incorrecta), devuelve un placeholder en vez de reventar.
 * Pensado para render server-side de listados/detalles del panel admin.
 */
export function decryptNameSafe(
  value: string | null | undefined,
  fallback = 'Sin nombre'
): string {
  if (!value) return fallback
  if (!looksEncrypted(value)) return value // texto plano legado
  try {
    return decryptPII(value)
  } catch {
    return fallback
  }
}
