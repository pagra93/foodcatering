/**
 * Configuración de NextAuth v5
 * Multi-tenant con Prisma Adapter
 */

import { NextAuthConfig } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
// NO importar bcryptjs aquí (causa problemas con Edge Runtime)
// Se importará dinámicamente dentro de authorize()
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { UserRole, TenantType } from '@prisma/client'
import type { ImpersonationToken } from './impersonation'

/**
 * Schema de validación para login
 */
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  tenantSubdomain: z.string().optional(), // Para multi-tenant
})

/**
 * Configuración de NextAuth
 */
export const authConfig = {
  // NO usar adapter con Credentials provider
  // El adapter es solo para OAuth/Email providers
  // adapter: PrismaAdapter(prisma),

  // Páginas personalizadas
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/error',
    verifyRequest: '/verify',
  },

  // Session strategy (JWT es necesario para Credentials)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  // Providers
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantSubdomain: { label: 'Tenant', type: 'text' },
      },
      async authorize(credentials) {
        try {
          // Validar input
          const { email, password, tenantSubdomain } = loginSchema.parse(
            credentials
          )

          // Buscar usuario
          const user = await prisma.user.findFirst({
            where: {
              email,
              status: 'ACTIVE',
              deletedAt: null,
            },
            include: {
              tenant: true,
            },
          })

          if (!user || !user.passwordHash) {
            return null
          }

          // Verificar tenant (si se especificó)
          if (tenantSubdomain && user.tenant.subdomain !== tenantSubdomain) {
            return null
          }

          // Verificar contraseña
          // Importación dinámica de bcryptjs para evitar problemas con Edge Runtime
          const { compare } = await import('bcryptjs')
          const isPasswordValid = await compare(password, user.passwordHash)
          if (!isPasswordValid) {
            return null
          }

          // Retornar user info (se pasará al JWT)
          // Normalizar role y tenantType a mayúsculas (BD guarda en minúscula, enum es mayúscula)
          const normalizedRole = user.role.toUpperCase() as UserRole
          const normalizedTenantType = user.tenant.type.toUpperCase() as TenantType
          
          return {
            id: user.id,
            email: user.email,
            name: user.nameEnc, // TODO: descifrar en producción
            role: normalizedRole,
            tenantId: user.tenantId,
            tenantType: normalizedTenantType,
            mfaEnabled: user.mfaEnabled,
            status: user.status,
          }
        } catch (error) {
          console.error('Error en authorize:', error)
          return null
        }
      },
    }),
  ],

  // Callbacks
  callbacks: {
    /**
     * JWT Callback - Enriquecer el token con datos del usuario
     */
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantType = user.tenantType
        token.mfaEnabled = user.mfaEnabled
      }

      // Update session (cuando se llama a update())
      if (trigger === 'update' && session) {
        token.name = session.name
        
        // Manejar impersonación
        if (session.impersonationToken) {
          token.impersonationToken = session.impersonationToken as ImpersonationToken
          
          // Sobrescribir datos del usuario con los del usuario impersonado
          token.id = session.impersonationToken.targetUserId
          token.role = session.impersonationToken.targetRole
          token.tenantId = session.impersonationToken.targetTenantId
          
          // Cargar datos completos del usuario impersonado
          const targetUser = await prisma.user.findUnique({
            where: { id: session.impersonationToken.targetUserId },
            select: { nameEnc: true, email: true, tenant: { select: { type: true } } },
          })
          
          if (targetUser) {
            token.name = targetUser.nameEnc
            token.email = targetUser.email
            token.tenantType = targetUser.tenant.type
          }
        } else if (token.impersonationToken) {
          // Si se removió el token de impersonación, restaurar usuario original
          const impToken = token.impersonationToken as ImpersonationToken
          
          // Restaurar datos del usuario original
          const originalUser = await prisma.user.findUnique({
            where: { id: impToken.originalUserId },
            select: {
              nameEnc: true,
              email: true,
              role: true,
              tenantId: true,
              tenant: { select: { type: true } },
            },
          })
          
          if (originalUser) {
            token.id = impToken.originalUserId
            token.name = originalUser.nameEnc
            token.email = originalUser.email
            token.role = originalUser.role
            token.tenantId = originalUser.tenantId
            token.tenantType = originalUser.tenant.type
          }
          
          // Remover token de impersonación
          delete token.impersonationToken
        }
      }

      return token
    },

    /**
     * Session Callback - Pasar datos del JWT a la sesión
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
        session.user.tenantId = token.tenantId
        session.user.tenantType = token.tenantType
        session.user.mfaEnabled = token.mfaEnabled
        
        // Incluir token de impersonación si existe
        if (token.impersonationToken) {
          ;(session.user as any).impersonationToken = token.impersonationToken
        }
      }

      return session
    },

    /**
     * SignIn Callback - Control adicional en el login
     */
    async signIn({ user, account, profile }) {
      // Con Credentials provider, la validación ya se hizo en authorize()
      // Este callback es principalmente para OAuth providers
      
      // Validación adicional solo si tenemos acceso al status
      if (user && 'status' in user && user.status !== 'ACTIVE') {
        return false
      }

      return true
    },

    /**
     * Redirect Callback - Redirigir según el tipo de tenant
     */
    async redirect({ url, baseUrl }) {
      // Si la URL es relativa, usar baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // Si la URL es del mismo dominio, permitir
      else if (new URL(url).origin === baseUrl) {
        return url
      }
      // Sino, redirigir a baseUrl
      return baseUrl
    },
  },

  // Events (para logging)
  events: {
    async signIn({ user }) {
      console.log(`✅ Login exitoso: ${user.email}`)
      // TODO: Registrar en audit_logs
    },
    async signOut({ token }) {
      console.log(`👋 Logout: ${token.email}`)
      // TODO: Registrar en audit_logs
    },
  },

  // Debug en desarrollo
  debug: process.env.NODE_ENV === 'development',

  // Trust host para producción (requerido en NextAuth v5)
  trustHost: true,
} satisfies NextAuthConfig

export default authConfig

