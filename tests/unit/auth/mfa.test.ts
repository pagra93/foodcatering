import { describe, it, expect } from 'vitest'
import * as OTPAuth from 'otpauth'
import {
  generateMfaSecret,
  buildOtpauthUrl,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  formatBackupCode,
} from '@/lib/auth/mfa'

describe('mfa', () => {
  it('genera un secreto base32 y una URL otpauth', () => {
    const secret = generateMfaSecret()
    expect(secret).toMatch(/^[A-Z2-7]+$/)
    const url = buildOtpauthUrl('user@empresa.com', secret)
    expect(url).toContain('otpauth://totp/')
    expect(url).toContain('Plati')
  })

  it('verifica un token TOTP válido', () => {
    const secret = generateMfaSecret()
    const totp = new OTPAuth.TOTP({
      issuer: 'Plati',
      label: 'x',
      secret: OTPAuth.Secret.fromBase32(secret),
    })
    expect(verifyTotp(secret, totp.generate())).toBe(true)
  })

  it('rechaza un token de otro secreto', () => {
    const secretA = generateMfaSecret()
    const secretB = generateMfaSecret()
    const totpA = new OTPAuth.TOTP({
      issuer: 'Plati',
      label: 'x',
      secret: OTPAuth.Secret.fromBase32(secretA),
    })
    expect(verifyTotp(secretB, totpA.generate())).toBe(false)
  })

  it('rechaza entradas no numéricas sin lanzar', () => {
    const secret = generateMfaSecret()
    expect(verifyTotp(secret, 'abc')).toBe(false)
    expect(verifyTotp(secret, '')).toBe(false)
  })

  it('genera 8 códigos de recuperación únicos', () => {
    const codes = generateBackupCodes()
    expect(codes).toHaveLength(8)
    expect(new Set(codes).size).toBe(8)
  })

  it('hashea códigos de recuperación de forma estable y normalizada', () => {
    const codes = generateBackupCodes()
    const first = codes[0]!
    expect(hashBackupCode(first)).toBe(hashBackupCode(first))
    expect(hashBackupCode('ABCDE12345')).toBe(hashBackupCode(' abcde12345 '))
    expect(hashBackupCode('a')).not.toBe(hashBackupCode('b'))
  })

  it('formatea un código de 10 chars como xxxxx-xxxxx', () => {
    expect(formatBackupCode('abcde12345')).toBe('abcde-12345')
  })
})
