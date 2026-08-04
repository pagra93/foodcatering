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
// El login busca al usuario por email SIN conocer aún su tenant (es una lectura
// inherentemente cross-tenant, previa a la sesión). Debe usar el cliente sin
// guard de aislamiento; con `prisma` (guardado) el findFirst sin filtro de tenant
// lanzaría con TENANT_GUARD_ENFORCE=true y rompería el login de todos.
import { prismaAdmin } from '@/lib/db/prisma-admin'
import type { UserRole, TenantType } from '@prisma/client'
import type { ImpersonationToken } from './impersonation'
import { resolveUserPermissions } from './resolve-permissions'
import { authRateLimiter, authEmailRateLimiter, getRateLimitKey } from '@/lib/ratelimit'
import { BCRYPT_COST } from './password'
import type { JWT } from 'next-auth/jwt'

/**
 * Schema de validación para login
 */
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  tenantSubdomain: z.string().optional(), // Para multi-tenant
  otp: z.string().optional(), // Código MFA (TOTP o recuperación), si aplica
})

// Duplicado deliberado de impersonation.ts#IMPERSONATION_DURATION_MINUTES:
// importarlo de ahí crearía un ciclo (config → impersonation → @/lib/auth → config).
const IMPERSONATION_DURATION_MINUTES = 15

// Hash bcrypt señuelo (cacheado) para igualar el tiempo de respuesta del login
// cuando el usuario no existe (M7 — anti-enumeración por timing). Coste 10 para
// igualar el de los hashes almacenados hoy.
let dummyPasswordHash: string | null = null

/**
 * Restaura en el token la identidad original tras una impersonación (fin
 * explícito vía update() o expiración del TTL). Rol/tenant/permisos se releen
 * SIEMPRE de BD. Devuelve false si el usuario original ya no existe (la sesión
 * debe invalidarse). Borra siempre el impersonationToken del JWT.
 */
async function restoreOriginalIdentity(token: JWT): Promise<boolean> {
  const impToken = token.impersonationToken as ImpersonationToken | undefined
  delete token.impersonationToken
  if (!impToken) return true

  const originalUser = await prisma.user.findUnique({
    where: { id: impToken.originalUserId },
    select: {
      nameEnc: true,
      email: true,
      role: true,
      roleId: true,
      tenantId: true,
      tokenVersion: true,
      tenant: { select: { type: true } },
    },
  })

  if (!originalUser) return false

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
  token.tokenVersion = originalUser.tokenVersion
  token.checkedAt = Date.now()
  return true
}

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
          const { email, password, tenantSubdomain, otp } = loginSchema.parse(
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

          // H6b: bucket por email, independiente de la IP y de cabeceras que el
          // cliente pueda manipular (X-Forwarded-For): corta el password
          // spraying distribuido contra una misma cuenta.
          const rlEmail = await authEmailRateLimiter.check(`login-email:${email}`)
          if (!rlEmail.allowed) return null

          // bcryptjs se importa dinámicamente (problemas con Edge Runtime).
          const { compare, hash } = await import('bcryptjs')
          // M7: hash señuelo (mismo coste) para gastar el mismo tiempo cuando el
          // usuario no existe y no filtrar por timing qué emails están dados de alta.
          if (!dummyPasswordHash) {
            dummyPasswordHash = await hash('timing-guard-placeholder', BCRYPT_COST)
          }

          // Buscar usuario (cross-tenant: aún no hay sesión ni tenant conocido →
          // cliente sin guard de aislamiento, si no el findFirst por email lanza).
          const user = await prismaAdmin.user.findFirst({
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

          // Segundo factor (MFA/TOTP) si el usuario lo tiene activado (F2).
          if (user.mfaEnabled && user.mfaSecret) {
            // CredentialsSignin se importa aquí (no a nivel de módulo) para no
            // arrastrar `next/server` al cargar config.ts en tests. Su subclase
            // hace que el `code` llegue al cliente (SignInResponse.code).
            const { CredentialsSignin } = await import('next-auth')
            class MfaError extends CredentialsSignin {
              constructor(c: string) {
                super()
                this.code = c
              }
            }

            if (!otp) throw new MfaError('mfa_required')

            const { verifyTotp, hashBackupCode } = await import('./mfa')
            const { decryptPII } = await import('@/lib/crypto/pii')

            const secret = decryptPII(user.mfaSecret)
            let ok = verifyTotp(secret, otp)

            // Si el TOTP no valida, probar código de recuperación (un solo uso).
            if (!ok) {
              const codeHash = hashBackupCode(otp)
              if (user.mfaBackupCodes.includes(codeHash)) {
                ok = true
                await prisma.user.update({
                  where: { id: user.id },
                  data: {
                    mfaBackupCodes: user.mfaBackupCodes.filter(
                      (c) => c !== codeHash
                    ),
                  },
                })
              }
            }

            if (!ok) throw new MfaError('mfa_invalid')
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
            tokenVersion: user.tokenVersion,
          }
        } catch (error) {
          // Los errores MFA deben propagarse para que su `code` llegue al
          // cliente (mfa_required / mfa_invalid); el resto → login genérico.
          const code = (error as { code?: unknown })?.code
          if (typeof code === 'string' && code.startsWith('mfa_')) throw error
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
        token.tokenVersion = user.tokenVersion
        token.checkedAt = Date.now()
      }

      // TTL de impersonación: si expiró, restaurar la identidad real ANTES de
      // cualquier otra lógica. Sin esto, la impersonación duraría los 30 días
      // del JWT (el banner desaparece a los 15 min, pero la sesión seguiría
      // siendo la del usuario objetivo — problema RGPD).
      if (token.impersonationToken) {
        const imp = token.impersonationToken as ImpersonationToken
        if (typeof imp.expiresAt === 'number' && imp.expiresAt <= Date.now()) {
          const restored = await restoreOriginalIdentity(token)
          if (!restored) return null
        }
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
                tokenVersion: true,
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
              token.tokenVersion = targetUser.tokenVersion
              token.checkedAt = now
            }
          }
        } else if (token.impersonationToken) {
          // Fin explícito de la impersonación (update() sin token): restaurar
          // el usuario original desde BD.
          const restored = await restoreOriginalIdentity(token)
          if (!restored) return null
        }
      }

      // H7: revalidación periódica contra BD (throttled) para revocar sesiones.
      // Sólo en peticiones posteriores (no en el sign-in inicial ni en updates,
      // que ya refrescan checkedAt). Cubre: usuario deshabilitado/borrado, cambio
      // de rol/permisos/tenant (se propagan sin re-login), y bump de tokenVersion
      // (p.ej. cambio de contraseña → invalida las demás sesiones).
      if (!user && trigger !== 'update') {
        const THROTTLE_MS = 5 * 60 * 1000
        const last = token.checkedAt ?? 0
        if (Date.now() - last > THROTTLE_MS) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              status: true,
              deletedAt: true,
              tokenVersion: true,
              role: true,
              roleId: true,
              tenantId: true,
            },
          })

          if (!dbUser || dbUser.status !== 'ACTIVE' || dbUser.deletedAt) {
            return null
          }
          if (
            typeof token.tokenVersion === 'number' &&
            dbUser.tokenVersion !== token.tokenVersion
          ) {
            return null
          }

          // Propagar rol/permisos/tenant sin re-login. No durante impersonación
          // activa (esos valores son del usuario impersonado, no del real).
          if (!token.impersonationToken) {
            token.role = dbUser.role
            token.roleId = dbUser.roleId
            token.tenantId = dbUser.tenantId
            token.permissions = await resolveUserPermissions(
              dbUser.roleId,
              dbUser.role
            )
            token.tokenVersion = dbUser.tokenVersion
          }
          token.checkedAt = Date.now()
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

