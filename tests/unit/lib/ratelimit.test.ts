/**
 * Suite: rate limiting in-memory
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { authRateLimiter, getRateLimitKey } from '@/lib/ratelimit'

describe('authRateLimiter (5 req / 60s)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('permite los primeros 5 intentos', async () => {
    const key = `test-allow-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      const result = await authRateLimiter.check(key)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4 - i)
    }
  })

  it('bloquea el 6º intento dentro de la ventana', async () => {
    const key = `test-block-${Date.now()}`
    for (let i = 0; i < 5; i++) await authRateLimiter.check(key)

    const sixth = await authRateLimiter.check(key)
    expect(sixth.allowed).toBe(false)
    expect(sixth.remaining).toBe(0)
    expect(sixth.resetIn).toBeGreaterThan(0)
  })

  it('resetea la ventana tras pasar el tiempo configurado', async () => {
    const key = `test-reset-${Date.now()}`
    for (let i = 0; i < 5; i++) await authRateLimiter.check(key)

    // Avanzar 61 segundos
    vi.advanceTimersByTime(61_000)

    const next = await authRateLimiter.check(key)
    expect(next.allowed).toBe(true)
    expect(next.remaining).toBe(4)
  })

  it('cada key es independiente', async () => {
    for (let i = 0; i < 5; i++) await authRateLimiter.check(`independent-A-${i}`)
    // Otra key arranca en verde
    const fresh = await authRateLimiter.check(`independent-B-${Date.now()}`)
    expect(fresh.allowed).toBe(true)
  })
})

describe('getRateLimitKey', () => {
  it('usa la primera IP de x-forwarded-for', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getRateLimitKey(req)).toBe('1.2.3.4')
  })

  it('cae a x-real-ip si no hay x-forwarded-for', () => {
    const req = new Request('http://x', {
      headers: { 'x-real-ip': '9.9.9.9' },
    })
    expect(getRateLimitKey(req)).toBe('9.9.9.9')
  })

  it("devuelve 'unknown' si no hay nada", () => {
    const req = new Request('http://x')
    expect(getRateLimitKey(req)).toBe('unknown')
  })
})
