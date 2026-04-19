/**
 * Suite: cifrado PII (AES-256-GCM)
 */

import { describe, expect, it, beforeAll } from 'vitest'

// Clave de prueba determinista (32 bytes hex). NO usar fuera de tests.
const TEST_KEY = '0'.repeat(63) + '1'

beforeAll(() => {
  process.env['PII_ENCRYPTION_KEY'] = TEST_KEY
})

describe('encryptPII / decryptPII', () => {
  it('ciclo encrypt→decrypt devuelve el texto original', async () => {
    const { encryptPII, decryptPII } = await import('@/lib/crypto/pii')
    const plain = 'María José Gómez-Sánchez'
    const blob = encryptPII(plain)
    expect(blob).not.toBe(plain)
    expect(decryptPII(blob)).toBe(plain)
  })

  it('dos cifrados del mismo texto producen blobs distintos (IV aleatorio)', async () => {
    const { encryptPII } = await import('@/lib/crypto/pii')
    const a = encryptPII('mismo texto')
    const b = encryptPII('mismo texto')
    expect(a).not.toBe(b)
  })

  it('el blob es base64 válido', async () => {
    const { encryptPII } = await import('@/lib/crypto/pii')
    const blob = encryptPII('algo')
    expect(blob).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('un blob corrupto lanza al descifrar', async () => {
    const { encryptPII, decryptPII } = await import('@/lib/crypto/pii')
    const blob = encryptPII('secreto')
    // Invertir el último byte del blob → tag de auth inválido
    const corrupted = blob.slice(0, -4) + 'AAAA'
    expect(() => decryptPII(corrupted)).toThrow()
  })

  it('descifrar un blob vacío lanza', async () => {
    const { decryptPII } = await import('@/lib/crypto/pii')
    expect(() => decryptPII('')).toThrow(/Blob PII inválido/)
  })
})

describe('looksEncrypted', () => {
  it('reconoce blobs cifrados como probables', async () => {
    const { encryptPII, looksEncrypted } = await import('@/lib/crypto/pii')
    const blob = encryptPII('Laura Gómez')
    expect(looksEncrypted(blob)).toBe(true)
  })

  it('rechaza texto plano corto', async () => {
    const { looksEncrypted } = await import('@/lib/crypto/pii')
    expect(looksEncrypted('Laura')).toBe(false)
    expect(looksEncrypted('Laura Gómez')).toBe(false)
  })

  it('rechaza null/undefined/empty', async () => {
    const { looksEncrypted } = await import('@/lib/crypto/pii')
    expect(looksEncrypted(null)).toBe(false)
    expect(looksEncrypted(undefined)).toBe(false)
    expect(looksEncrypted('')).toBe(false)
  })
})
