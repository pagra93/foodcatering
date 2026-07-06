/**
 * Configuración de NextAuth v5
 * Multi-tenant con Prisma Adapter
 */

import { type NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
// NO importar bcryptjs aquí (causa problemas con Edge Runtime)
// Se importará dinámicamente dentro de authorize()
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { UserRole, TenantType } from '@prisma/client'
import type { ImpersonationToken } from './impersonation'
import { resolveUserPermissions } from './resolve-permissions'
import { authRateLimiter, getRateLimitKey } from '@/lib/ratelimit'

/**
 * Schema de validación para login
 */
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  tenantSubdomain: z.string().optional(), // Para multi-tenant
})

// Duplicado deliberado de impersonation.ts#IMPERSONATION_DURATION_MINUTES:
// importarlo de ahí crearía un ciclo (config → impersonation → @/lib/auth → config).
const IMPERSONATION_DURATION_MINUTES = 15

// Hash bcrypt señuelo (cacheado) para igualar el tiempo de respuesta del login
// cuando el usuario no existe (M7 — anti-enumeración por timing). Coste 10 para
// igualar el de los hashes almacenados hoy.
let dummyPasswordHash: string | null = null

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
      async authorize(credentials, request) {
        try {
          // Validar input
          const { email, password, tenantSubdomain } = loginSchema.parse(
            credentials
          )

          // H6: rate limit de login por IP + email, para frenar fuerza bruta y
          // credential stuffing dirigido a una cuenta concreta.
          if (request) {
            const rl = await authRateLimiter.check(
              `login:${getRateLimitKey(request)}:${email}`
            )
            if (!rl.allowed) return null
          }

          // bcryptjs se importa dinámicamente (problemas con Edge Runtime).
          const { compare, hash } = await import('bcryptjs')
          // M7: hash señuelo (mismo coste) para gastar el mismo tiempo cuando el
          // usuario no existe y no filtrar por timing qué emails están dados de alta.
          if (!dummyPasswordHash) {
            dummyPasswordHash = await hash('timing-guard-placeholder', 10)
          }

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
            await compare(password, dummyPasswordHash) // M7: tiempo constante
            return null
          }

          // Verificar tenant (si se especificó)
          if (tenantSubdomain && user.tenant.subdomain !== tenantSubdomain) {
            await compare(password, dummyPasswordHash) // M7: tiempo constante
            return null
          }

          // Verificar contraseña
          const isPasswordValid = await compare(password, user.passwordHash)
          if (!isPasswordValid) {
            return null
          }

          // Retornar user info (se pasará al JWT)
          // Normalizar role y tenantType a mayúsculas (BD guarda en minúscula, enum es mayúscula)
          const normalizedRole = user.role.toUpperCase() as UserRole
          const normalizedTenantType = user.tenant.type.toUpperCase() as TenantType

          // Permisos efectivos (RBAC dinámico) para la sesión.
          const permissions = await resolveUserPermissions(user.roleId, normalizedRole)

          return {
            id: user.id,
            email: user.email,
            name: user.nameEnc, // TODO: descifrar en producción
            role: normalizedRole,
            tenantId: user.tenantId,
            tenantType: normalizedTenantType,
            mfaEnabled: user.mfaEnabled,
            status: user.status,
            roleId: user.roleId,
            permissions,
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
        token.roleId = user.roleId
        token.permissions = user.permissions
      }

      // Update session (cuando se llama a update())
      if (trigger === 'update' && session) {
        token.name = session.name
        
        // Manejar impersonación (endurecido — C1).
        // El payload de `update()` lo controla el cliente, así que aquí NO se
        // confía en él salvo para saber A QUIÉN se quiere impersonar. El rol,
        // el tenant y los permisos se derivan SIEMPRE de la BD, y solo un
        // SUPER_ADMIN verificado (por el token vigente, firmado por el servidor)
        // puede impersonar. Esto cierra el bypass por el que cualquier usuario
        // se autoconcedía SUPER_ADMIN vía useSession().update().
        if (session.impersonationToken) {
          // Identidad real del token vigente, antes de sobreescribir nada.
          const realUserId = token.id
          const realRole = token.role
          const requestedTargetId = (
            session.impersonationToken as ImpersonationToken
          ).targetUserId

          // Guarda 1: solo un super admin real puede impersonar. Si no, se
          // ignora la petición por completo (no se muta el token).
          if (realRole === 'SUPER_ADMIN' && requestedTargetId) {
            const targetUser = await prisma.user.findUnique({
              where: { id: requestedTargetId },
              select: {
                id: true,
                role: true,
                tenantId: true,
                roleId: true,
                nameEnc: true,
                email: true,
                deletedAt: true,
                tenant: { select: { type: true } },
              },
            })

            // Guarda 2/3: el objetivo debe existir, no estar borrado y no ser
            // otro super admin. Rol/tenant/permisos salen de la BD, nunca del
            // payload del cliente.
            if (
              targetUser &&
              !targetUser.deletedAt &&
              targetUser.role !== 'SUPER_ADMIN'
            ) {
              const now = Date.now()
              // Token reconstruido en servidor: la identidad "original" es la
              // del token vigente verificado, no la que envíe el cliente.
              token.impersonationToken = {
                originalUserId: realUserId,
                originalRole: realRole,
                targetUserId: targetUser.id,
                targetRole: targetUser.role,
                targetTenantId: targetUser.tenantId,
                startedAt: now,
                expiresAt: now + IMPERSONATION_DURATION_MINUTES * 60 * 1000,
              } satisfies ImpersonationToken

              token.id = targetUser.id
              token.role = targetUser.role
              token.tenantId = targetUser.tenantId
              token.tenantType = targetUser.tenant.type
              token.name = targetUser.nameEnc
              token.email = targetUser.email
              token.roleId = targetUser.roleId
              token.permissions = await resolveUserPermissions(
                targetUser.roleId,
                targetUser.role
              )
            }
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
              roleId: true,
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
            token.roleId = originalUser.roleId
            token.permissions = await resolveUserPermissions(
              originalUser.roleId,
              originalUser.role
            )
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
        session.user.roleId = token.roleId
        session.user.permissions = token.permissions

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
    async signIn({ user }) {
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
    async signIn() {
      // Auditoría de login se registra fuera (lib/auth/audit.ts#logLogin)
    },
    async signOut(message) {
      // 'token' sólo existe con sesión JWT; con DB session se pasa 'session'
      if ('token' in message && message.token) {
        // Auditoría de logout se registra fuera (lib/auth/audit.ts#logLogout)
      }
    },
  },

  // Debug en desarrollo
  debug: process.env.NODE_ENV === 'development',

  // Trust host para producción (requerido en NextAuth v5)
  trustHost: true,
} satisfies NextAuthConfig

export default authConfig

