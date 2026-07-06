/**
 * Backfill de cifrado de PII (C4).
 *
 * Cifra in-place los campos `nameEnc` / `phoneEnc` de User que todavía estén en
 * texto plano. IDEMPOTENTE: usa `looksEncrypted()` para saltar los ya cifrados,
 * así que se puede ejecutar varias veces sin doble cifrado.
 *
 * Usa un PrismaClient PROPIO, sin el middleware de descifrado de la app
 * (lib/db/prisma.ts), para leer el valor CRUDO de la BD. Si usara el cliente de
 * la app leería ya descifrado y no podría distinguir lo ya migrado.
 *
 * Uso (dev):   pnpm tsx scripts/encrypt-pii-backfill.ts
 * Uso (prod):  ALLOW_PROD=1 pnpm tsx scripts/encrypt-pii-backfill.ts
 *
 * Guarda anti-prod: aborta si DATABASE_URL apunta a una BD con 'prod' en el
 * nombre salvo que se pase ALLOW_PROD=1 (ejecución consciente en producción).
 */

import { PrismaClient } from '@prisma/client'
import { encryptPII, looksEncrypted } from '../lib/crypto/pii'

async function main() {
  const url = process.env['DATABASE_URL'] ?? ''
  const dbName = url.split('/').pop()?.split('?')[0] ?? '(desconocida)'

  if (/prod/i.test(dbName) && process.env['ALLOW_PROD'] !== '1') {
    console.error(
      `❌ DATABASE_URL apunta a '${dbName}' (parece producción). Aborta.\n` +
        '   Para ejecutarlo conscientemente en prod: ALLOW_PROD=1 pnpm tsx scripts/encrypt-pii-backfill.ts'
    )
    process.exit(1)
  }

  if (!process.env['PII_ENCRYPTION_KEY']) {
    console.error(
      '❌ PII_ENCRYPTION_KEY no está configurada. Genérala con `openssl rand -hex 32` y ponla en el entorno.'
    )
    process.exit(1)
  }

  const prisma = new PrismaClient()
  console.log(`🔐 Backfill de cifrado PII contra BD '${dbName}'...`)

  const users = await prisma.user.findMany({
    select: { id: true, nameEnc: true, phoneEnc: true },
  })

  let names = 0
  let phones = 0
  let unchanged = 0

  for (const u of users) {
    const data: { nameEnc?: string; phoneEnc?: string } = {}
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
    } else {
      unchanged++
    }
  }

  console.log(
    `✅ Hecho. Usuarios: ${users.length} · nombres cifrados: ${names} · teléfonos cifrados: ${phones} · sin cambios (ya cifrados o vacíos): ${unchanged}`
  )
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
