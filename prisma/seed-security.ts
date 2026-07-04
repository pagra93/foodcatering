/**
 * Seed del checklist OWASP Top 10 (SecurityCheck).
 * Idempotente: crea un control por categoría solo si esa categoría no tiene
 * ninguno. No pisa lo que el admin haya editado.
 */

import { PrismaClient, type SecurityCheckCategory } from '@prisma/client'

const prisma = new PrismaClient()

const OWASP_ITEMS: Record<SecurityCheckCategory, string> = {
  OWASP_A01_ACCESS_CONTROL:
    'Autorización por tenant y por permiso (RBAC) en cada ruta/acción; sin acceso cross-tenant.',
  OWASP_A02_CRYPTO_FAILURES:
    'PII cifrada en reposo (email/nombre/teléfono) y tráfico solo por HTTPS/TLS.',
  OWASP_A03_INJECTION:
    'Acceso a datos vía Prisma (consultas parametrizadas); validación de entrada con Zod.',
  OWASP_A04_INSECURE_DESIGN:
    'Límites de negocio en backend (p. ej. ≤11€/día); Server Actions para mutaciones.',
  OWASP_A05_SECURITY_MISCONFIG:
    'Cabeceras de seguridad, cookies httpOnly/secure y variables de entorno separadas dev/prod.',
  OWASP_A06_VULNERABLE_COMPONENTS:
    'Auditoría periódica de dependencias (pnpm audit) y actualización de CVEs críticos.',
  OWASP_A07_AUTH_FAILURES:
    'NextAuth con contraseñas hasheadas (bcrypt), MFA disponible y rate-limit en login.',
  OWASP_A08_DATA_INTEGRITY:
    'Facturas/liquidaciones/auditorías con hash de integridad SHA-256 (tamper-evident).',
  OWASP_A09_LOGGING_MONITORING:
    'AuditLog de acciones sensibles con actor, entidad y hash; trazabilidad de impersonación.',
  OWASP_A10_SSRF:
    'Sin fetch de URLs controladas por el usuario desde el servidor; allowlist de destinos.',
}

async function main() {
  console.log('🔒 Seeding OWASP Top 10 checklist...')
  let created = 0
  for (const [category, item] of Object.entries(OWASP_ITEMS) as [
    SecurityCheckCategory,
    string,
  ][]) {
    const existing = await prisma.securityCheck.findFirst({ where: { category } })
    if (existing) continue
    await prisma.securityCheck.create({
      data: { category, item, status: 'PENDING' },
    })
    created += 1
  }
  console.log(`✅ OWASP checklist: ${created} controles creados (los ya existentes se respetan).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
