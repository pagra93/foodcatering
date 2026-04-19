/**
 * Helper para verificar si hay una ventana de mantenimiento activa
 * y redirigir a /mantenimiento a los usuarios que no estén en la
 * lista `allowedRoles`.
 *
 * Se llama desde los layouts de portal (no desde middleware edge porque
 * Prisma no corre en edge runtime).
 */

import { redirect } from 'next/navigation'
import type { UserRole } from '@prisma/client'
import { getActiveMaintenanceWindow } from '@/lib/db/queries/admin-operations'

/**
 * Llama a esta función al principio de un layout de portal. Si hay
 * mantenimiento activo y el rol no está permitido, redirige a
 * /mantenimiento. SUPER_ADMIN siempre pasa.
 */
export async function checkMaintenance(role: UserRole | undefined) {
  if (!role) return
  if (role === 'SUPER_ADMIN') return

  const active = await getActiveMaintenanceWindow()
  if (!active) return

  const allowedRoles = Array.isArray(active.allowedRoles)
    ? (active.allowedRoles as UserRole[])
    : ['SUPER_ADMIN']

  if (!allowedRoles.includes(role)) {
    redirect('/mantenimiento')
  }
}
