/**
 * NextAuth - Exports principales
 * Handlers y funciones de auth
 */

import NextAuth from 'next-auth'
import authConfig from './config'

/**
 * Inicializar NextAuth con la configuración
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig)

/**
 * Helper para obtener la sesión del servidor
 * Usar en Server Components y API Routes
 */
export { auth as getServerSession }

