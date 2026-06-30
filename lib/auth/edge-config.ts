/**
 * Configuración edge-safe de NextAuth.
 *
 * `middleware.ts` corre en el Edge Runtime de Next.js, donde Prisma y bcrypt
 * no funcionan. Esta config omite `providers` y cualquier callback que
 * dependa de Node APIs; sólo sirve para que el middleware pueda validar el
 * JWT ya firmado por la config completa (`./config.ts`) al hacer login.
 *
 * Patrón oficial Auth.js v5: https://authjs.dev/guides/edge-compatibility
 */

import type { NextAuthConfig } from 'next-auth'

export const edgeAuthConfig = {
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/error',
    verifyRequest: '/verify',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [],
  trustHost: true,
  callbacks: {
    // El JWT ya viene firmado por la config completa con id/role/tenantId.
    // En edge sólo necesitamos exponerlo en session.user para que el
    // middleware pueda leerlo sin pegarse contra Prisma.
    async session({ session, token }) {
      if (session.user && token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = token as any
        session.user.id = t.id
        session.user.role = t.role
        session.user.tenantId = t.tenantId
        session.user.tenantType = t.tenantType
        // Permisos resueltos en el login (config.ts). El middleware los usa
        // para el enforcement por sección sin pegarse contra Prisma.
        session.user.permissions = t.permissions ?? []
      }
      return session
    },
  },
} satisfies NextAuthConfig

export default edgeAuthConfig
