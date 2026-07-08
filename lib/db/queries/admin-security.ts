/**
 * Queries para el módulo de seguridad (checklist OWASP + pentest reports).
 */

// F5: panel admin = lecturas cross-tenant a propósito → cliente sin guard.
import { prismaAdmin as prisma } from '@/lib/db/prisma-admin'
import type { SecurityCheckCategory } from '@prisma/client'

export const OWASP_CATEGORY_LABEL: Record<SecurityCheckCategory, string> = {
  OWASP_A01_ACCESS_CONTROL: 'A01 · Broken Access Control',
  OWASP_A02_CRYPTO_FAILURES: 'A02 · Cryptographic Failures',
  OWASP_A03_INJECTION: 'A03 · Injection',
  OWASP_A04_INSECURE_DESIGN: 'A04 · Insecure Design',
  OWASP_A05_SECURITY_MISCONFIG: 'A05 · Security Misconfiguration',
  OWASP_A06_VULNERABLE_COMPONENTS: 'A06 · Vulnerable Components',
  OWASP_A07_AUTH_FAILURES: 'A07 · Authentication Failures',
  OWASP_A08_DATA_INTEGRITY: 'A08 · Data Integrity Failures',
  OWASP_A09_LOGGING_MONITORING: 'A09 · Logging & Monitoring Failures',
  OWASP_A10_SSRF: 'A10 · SSRF',
}

export async function getSecurityChecks() {
  return prisma.securityCheck.findMany({
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getSecurityReports(limit = 25) {
  return prisma.securityReport.findMany({
    orderBy: { scannedAt: 'desc' },
    take: limit,
  })
}

export async function getSecurityKPIs() {
  const [verified, failed, pending, totalReports, criticalFindings] =
    await Promise.all([
      prisma.securityCheck.count({ where: { status: 'VERIFIED' } }),
      prisma.securityCheck.count({ where: { status: 'FAILED' } }),
      prisma.securityCheck.count({ where: { status: 'PENDING' } }),
      prisma.securityReport.count(),
      prisma.securityReport.count({
        where: { severity: { in: ['CRITICAL', 'HIGH'] } },
      }),
    ])
  return { verified, failed, pending, totalReports, criticalFindings }
}
