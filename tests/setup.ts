/**
 * Setup global para tests con Vitest
 * Configuración de mocks y extensiones de expect
 */

import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup después de cada test
afterEach(() => {
  cleanup()
})

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock de next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Variables de entorno para tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret-for-testing-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.WILDCARD_DOMAIN = '.test.local'
process.env.NODE_ENV = 'test'

// Extend expect con matchers custom si es necesario
export {}

