'use server'

/**
 * Server actions del módulo Caterings (admin).
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const addDocumentSchema = z.object({
  type: z.enum(['REGISTRO_SANITARIO', 'RC', 'MANIPULADORES', 'OTROS']),
  fileUrl: z.string().url('La URL del documento no es válida'),
  issuedAt: z.string().min(1, 'La fecha de emisión es obligatoria'),
  expiresAt: z.string().min(1, 'La fecha de caducidad es obligatoria'),
})

/**
 * Añade un documento al catering por URL (sin storage de binarios).
 * Persiste un RestaurantDocument real y recalcula su estado de validez.
 */
export async function addCateringDocument(
  tenantId: string,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = addDocumentSchema.safeParse({
    type: formData.get('type'),
    fileUrl: formData.get('fileUrl'),
    issuedAt: formData.get('issuedAt'),
    expiresAt: formData.get('expiresAt'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { tenantId },
    select: { id: true },
  })
  if (!restaurant) {
    return { error: 'No se encontró el restaurante del catering.' }
  }

  const issuedAt = new Date(parsed.data.issuedAt)
  const expiresAt = new Date(parsed.data.expiresAt)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const status = expiresAt < now ? 'EXPIRED' : expiresAt <= in30 ? 'EXPIRING' : 'VALID'

  await prisma.restaurantDocument.create({
    data: {
      tenantId,
      restaurantId: restaurant.id,
      type: parsed.data.type,
      fileUrl: parsed.data.fileUrl,
      issuedAt,
      expiresAt,
      status,
    },
  })

  revalidatePath(`/admin/caterings/${tenantId}`)
  return { ok: true }
}

/**
 * Suspende o reactiva un catering (tenant.status). Acción real de admin.
 */
export async function setCateringStatus(
  tenantId: string,
  status: 'ACTIVE' | 'SUSPENDED'
): Promise<{ error?: string; ok?: boolean }> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, type: 'CATERING' },
    select: { id: true },
  })
  if (!tenant) {
    return { error: 'Catering no encontrado.' }
  }

  await prisma.tenant.update({ where: { id: tenantId }, data: { status } })

  revalidatePath('/admin/caterings')
  revalidatePath(`/admin/caterings/${tenantId}`)
  return { ok: true }
}
