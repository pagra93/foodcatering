/**
 * Instancia de NextAuth edge-safe — úsala SOLO en `middleware.ts`.
 *
 * Resto del código (API routes, Server Components, Server Actions) debe
 * importar desde `@/lib/auth`, que incluye Credentials + callbacks con
 * Prisma.
 */

import NextAuth from 'next-auth'
import { edgeAuthConfig } from './edge-config'

export const { auth } = NextAuth(edgeAuthConfig)
