/**
 * Impersonation System - Sistema de impersonación segura para super admins
 * 
 * Permite a super admins ver la plataforma desde la perspectiva de otro usuario
 * con limitaciones temporales y auditoría completa.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logAudit } from './audit'
import type { UserRole } from '@prisma/client'

/**
 * Token de impersonación (almacenado en JWT)
 */
export type ImpersonationToken = {
  originalUserId: string
  originalRole: UserRole
  targetUserId: string
  targetRole: UserRole
  targetTenantId: string
  expiresAt: number // timestamp
  startedAt: number // timestamp
}

/**
 * Duración de la impersonación en minutos
 */
const IMPERSONATION_DURATION_MINUTES = 15

/**
 * Verifica si el usuario actual está impersonando
 */
export async function isImpersonating(): Promise<boolean> {
  const session = await auth()
  return !!(session?.user as any)?.impersonationToken
}

/**
 * Obtiene el token de impersonación actual (si existe)
 */
export async function getImpersonationToken(): Promise<ImpersonationToken | null> {
  const session = await auth()
  if (!session?.user) return null
  
  const token = (session.user as any).impersonationToken as ImpersonationToken | undefined
  
  // Verificar que no haya expirado
  if (token && token.expiresAt < Date.now()) {
    return null
  }
  
  return token || null
}

/**
 * Verifica si un usuario puede impersonar
 */
export async function canImpersonate(): Promise<boolean> {
  const session = await auth()
  if (!session?.user) return false
  
  // Solo super admins pueden impersonar
  return session.user.role === 'SUPER_ADMIN'
}

/**
 * Inicia la impersonación de un usuario
 * 
 * @returns Token de impersonación o error
 */
export async function startImpersonation(
  targetUserId: string
): Promise<{ success: true; token: ImpersonationToken } | { success: false; error: string }> {
  try {
    // 1. Verificar autenticación y permisos
    const session = await auth()
    
    if (!session?.user) {
      return { success: false, error: 'No autenticado' }
    }
    
    if (session.user.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Solo super admins pueden impersonar' }
    }
    
    // 2. Verificar que no esté impersonando ya
    const existingToken = await getImpersonationToken()
    if (existingToken) {
      return { success: false, error: 'Ya estás impersonando a otro usuario' }
    }
    
    // 3. Obtener datos del usuario objetivo
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        tenantId: true,
        name: true,
        email: true,
      },
    })
    
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado' }
    }
    
    // 4. Verificar que el usuario objetivo no sea también super admin
    if (targetUser.role === 'SUPER_ADMIN') {
      return { success: false, error: 'No puedes impersonar a otro super admin' }
    }
    
    // 5. Crear token de impersonación
    const now = Date.now()
    const expiresAt = now + IMPERSONATION_DURATION_MINUTES * 60 * 1000
    
    const token: ImpersonationToken = {
      originalUserId: session.user.id,
      originalRole: session.user.role,
      targetUserId: targetUser.id,
      targetRole: targetUser.role,
      targetTenantId: targetUser.tenantId,
      startedAt: now,
      expiresAt,
    }
    
    // 6. Registrar en audit_logs
    await logAudit({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: 'impersonation_started',
      resource: 'user',
      resourceId: targetUser.id,
      details: {
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.name,
        targetRole: targetUser.role,
        targetTenantId: targetUser.tenantId,
        duration: IMPERSONATION_DURATION_MINUTES,
      },
    })
    
    return { success: true, token }
  } catch (error) {
    console.error('[startImpersonation] Error:', error)
    return { success: false, error: 'Error al iniciar impersonación' }
  }
}

/**
 * Termina la impersonación actual
 */
export async function stopImpersonation(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return { success: false, error: 'No autenticado' }
    }
    
    const token = await getImpersonationToken()
    
    if (!token) {
      return { success: false, error: 'No estás impersonando a nadie' }
    }
    
    // Registrar fin de impersonación
    await logAudit({
      userId: token.originalUserId,
      tenantId: session.user.tenantId,
      action: 'impersonation_ended',
      resource: 'user',
      resourceId: token.targetUserId,
      details: {
        duration: Math.round((Date.now() - token.startedAt) / 1000 / 60), // minutos
        reason: 'manual_stop',
      },
    })
    
    return { success: true }
  } catch (error) {
    console.error('[stopImpersonation] Error:', error)
    return { success: false, error: 'Error al terminar impersonación' }
  }
}

/**
 * Obtiene información sobre la impersonación actual (para UI)
 */
export async function getImpersonationInfo(): Promise<{
  isImpersonating: boolean
  originalUser?: {
    id: string
    role: UserRole
  }
  targetUser?: {
    id: string
    role: UserRole
    tenantId: string
  }
  expiresAt?: number
  remainingMinutes?: number
} | null> {
  const token = await getImpersonationToken()
  
  if (!token) {
    return { isImpersonating: false }
  }
  
  const remainingMs = token.expiresAt - Date.now()
  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 1000 / 60))
  
  return {
    isImpersonating: true,
    originalUser: {
      id: token.originalUserId,
      role: token.originalRole,
    },
    targetUser: {
      id: token.targetUserId,
      role: token.targetRole,
      tenantId: token.targetTenantId,
    },
    expiresAt: token.expiresAt,
    remainingMinutes,
  }
}

/**
 * Valida que el token de impersonación sea válido
 * Lanza error si ha expirado o es inválido
 */
export async function validateImpersonationToken(
  token: ImpersonationToken
): Promise<{ valid: true } | { valid: false; reason: string }> {
  // Verificar expiración
  if (token.expiresAt < Date.now()) {
    return { valid: false, reason: 'Token expirado' }
  }
  
  // Verificar que el usuario objetivo siga existiendo
  const targetUser = await prisma.user.findUnique({
    where: { id: token.targetUserId },
    select: { id: true, deletedAt: true },
  })
  
  if (!targetUser || targetUser.deletedAt) {
    return { valid: false, reason: 'Usuario objetivo no existe' }
  }
  
  return { valid: true }
}

