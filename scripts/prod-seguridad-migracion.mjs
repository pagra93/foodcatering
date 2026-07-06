/**
 * Migración de datos de seguridad para PRODUCCIÓN — una sola vez, IDEMPOTENTE.
 *
 * Hace dos cosas:
 *  1) Backfill de `User.roleId`: a los usuarios sin rol dinámico les asigna el
 *     rol de sistema que corresponde a su enum `role` (arregla el lockout de H2
 *     de los usuarios creados antes del fix, p.ej. desde los portales empresa/
 *     catering).
 *  2) Cifrado de PII: cifra `nameEnc`/`phoneEnc` que aún estén en texto plano
 *     (AES-256-GCM, exactamente el mismo formato que lib/crypto/pii.ts, para que
 *     la app los pueda descifrar).
 *
 * AUTOCONTENIDO: JavaScript puro (sin TypeScript, sin imports de la app). Se
 * ejecuta con `node`, así que corre dentro del contenedor de Coolify, donde ya
 * están DATABASE_URL y PII_ENCRYPTION_KEY en el entorno:
 *
 *   ALLOW_PROD=1 node scripts/prod-seguridad-migracion.mjs
 *
 * En dev (BD comidas_dev):
 *   node --env-file=.env scripts/prod-seguridad-migracion.mjs
 *
 * Guarda anti-accidente: aborta si la BD tiene 'prod' en el nombre salvo que se
 * pase ALLOW_PROD=1. Como es idempotente, se puede relanzar sin peligro.
 */

import { PrismaClient } from '@prisma/client'
import { createCipheriv, randomBytes } from 'crypto'

const IV_LENGTH = 12
const KEY_LENGTH = 32

function getKey() {
  const raw = process.env.PII_ENCRYPTION_KEY
  if (!raw) throw new Error('PII_ENCRYPTION_KEY no está configurada.')
  const key = Buffer.from(raw, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `PII_ENCRYPTION_KEY debe ser 64 chars hex (32 bytes). Recibidos: ${key.length} bytes.`
    )
  }
  return key
}

function encryptPII(plain) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, enc]).toString('base64')
}

function looksEncrypted(value) {
  if (!value) return false
  if (value.length < 40) return false
  return /^[A-Za-z0-9+/]+=*$/.test(value)
}

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  const dbName = url.split('/').pop()?.split('?')[0] ?? '(desconocida)'

  if (/prod/i.test(dbName) && process.env.ALLOW_PROD !== '1') {
    console.error(
      `❌ DATABASE_URL apunta a '${dbName}' (parece producción). Aborta.\n` +
        '   Ejecuta con ALLOW_PROD=1 si es intencional.'
    )
    process.exit(1)
  }
  if (!process.env.PII_ENCRYPTION_KEY) {
    console.error('❌ PII_ENCRYPTION_KEY no está configurada.')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  console.log(`🔧 Migración de seguridad contra BD '${dbName}'...`)

  // ── 1) Backfill de roleId ────────────────────────────────────────────────
  const sysRoles = await prisma.role.findMany({
    where: { isSystem: true },
    select: { id: true, baseRole: true },
  })
  const roleByBase = new Map(
    sysRoles.filter((r) => r.baseRole).map((r) => [r.baseRole, r.id])
  )
  const noRole = await prisma.user.findMany({
    where: { roleId: null, deletedAt: null },
    select: { id: true, role: true },
  })
  let roleFixed = 0
  for (const u of noRole) {
    const rid = roleByBase.get(u.role)
    if (rid) {
      await prisma.user.update({ where: { id: u.id }, data: { roleId: rid } })
      roleFixed++
    }
  }
  console.log(
    `  · roleId asignado a ${roleFixed}/${noRole.length} usuarios que no lo tenían.`
  )

  // ── 2) Cifrado de PII ────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    select: { id: true, nameEnc: true, phoneEnc: true },
  })
  let names = 0
  let phones = 0
  for (const u of users) {
    const data = {}
    if (u.nameEnc && !looksEncrypted(u.nameEnc)) {
      data.nameEnc = encryptPII(u.nameEnc)
      names++
    }
    if (u.phoneEnc && !looksEncrypted(u.phoneEnc)) {
      data.phoneEnc = encryptPII(u.phoneEnc)
      phones++
    }
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: u.id }, data })
    }
  }
  console.log(
    `  · PII cifrada: ${names} nombres, ${phones} teléfonos (de ${users.length} usuarios).`
  )

  console.log('✅ Migración de seguridad completada.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
