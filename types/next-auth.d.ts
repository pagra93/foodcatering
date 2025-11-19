/**
 * Extensión de tipos de NextAuth
 * Añade tenant_id, role, y permisos al JWT y Session
 */

import type { DefaultSession } from 'next-auth'
import type { JWT as DefaultJWT } from 'next-auth/jwt'
import type { UserRole, TenantType } from '@prisma/client'
import type { ImpersonationToken } from '@/lib/auth/impersonation'

declare module 'next-auth' {
  /**
   * Session extendida con datos del tenant y permisos
   */
  interface Session extends DefaultSession {
    user: {
      id: string
      email: string
      name: string | null
      role: UserRole
      tenantId: string
      tenantType: TenantType
      mfaEnabled: boolean
      impersonationToken?: ImpersonationToken
    } & DefaultSession['user']
  }

  /**
   * User extendido (del callback de signIn)
   */
  interface User {
    id: string
    email: string
    name: string | null
    role: UserRole
    tenantId: string
    tenantType: TenantType
    mfaEnabled: boolean
    status: string
  }
}

declare module 'next-auth/jwt' {
  /**
   * JWT extendido con datos del tenant
   */
  interface JWT extends DefaultJWT {
    id: string
    email: string
    name: string | null
    role: UserRole
    tenantId: string
    tenantType: TenantType
    mfaEnabled: boolean
    
    // Impersonación (opcional)
    impersonationToken?: ImpersonationToken
  }
}

