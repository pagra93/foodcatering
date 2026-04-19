/**
 * Queries para gestión de Configuración de Empresa
 * Información general, plan, límites, preferencias, documentación
 */

import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

// ============================================================================
// OBTENER CONFIGURACIÓN COMPLETA
// ============================================================================

export async function getCompanyConfiguration(tenantId: string) {
  // Primero obtener la company para tener su ID
  const company = await prisma.company.findUnique({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      legalName: true,
      cif: true,
      billingAddress: true,
      plan: true,
      sector: true,
      employeeCount: true,
      contactRrhhName: true,
      contactRrhhEmail: true,
      contactRrhhPhone: true,
      contactFinanceName: true,
      contactFinanceEmail: true,
      contactFinancePhone: true,
      contractSignedAt: true,
      contractUrl: true,
      digitalCertificateUrl: true,
      cifDocumentUrl: true,
      contractAnnexes: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!company) {
    return null
  }

  // Ahora buscar policy, settings y sites con los IDs correctos
  const [policy, sites, settings] = await Promise.all([
    // Política y plan (usa company.id)
    prisma.companyPolicy.findUnique({
      where: { companyId: company.id },
      select: {
        id: true,
        cutoffTime: true,
        daysActive: true,
        limitPerDay: true,
        copayCompany: true,
        copayEmployee: true,
        noShowRule: true,
        effectiveFrom: true,
        effectiveTo: true,
        version: true,
        changedBy: true,
        changeReason: true,
        updatedAt: true,
      },
    }),

    // Sedes (usa tenantId)
    prisma.companySite.findMany({
      where: {
        tenantId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        postalCode: true,
        city: true,
        contactName: true,
        contactPhone: true,
        deliveryWindow: true,
        deliveryNotes: true,
        notes: true,
      },
      orderBy: { name: 'asc' },
    }),

    // Settings adicionales (usa company.id)
    prisma.companySettings.findUnique({
      where: { companyId: company.id },
      select: {
        id: true,
        deliveryLocation: true,
        deliveryInstructions: true,  // Corregido: deliveryInstructions (no deliveryNotes)
        notificationsEmail: true,
        notifyDailySummary: true,
        notifyIncidents: true,
        notifyInvoices: true,
        notifyLowAdoption: true,
        defaultViewEmployees: true,
        defaultPeriodReports: true,
        alertCancellationRate: true,
        alertAdoptionRate: true,
        alertDeductibilityRate: true,
      },
    }),
  ])

  // Obtener estadísticas de uso
  const stats = await prisma.employee.aggregate({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
    _count: true,
  })

  return {
    company,
    policy,
    sites,
    settings,
    stats: {
      activeEmployees: stats._count,
    },
  }
}

// ============================================================================
// ACTUALIZAR INFORMACIÓN GENERAL
// ============================================================================

export type UpdateCompanyGeneralData = {
  legalName?: string
  cif?: string
  billingAddress?: string
  sector?: string | null
  employeeCount?: number | null
  contactRrhhName?: string | null
  contactRrhhEmail?: string | null
  contactRrhhPhone?: string | null
  contactFinanceName?: string | null
  contactFinanceEmail?: string | null
  contactFinancePhone?: string | null
}

export async function updateCompanyGeneral(
  tenantId: string,
  data: UpdateCompanyGeneralData
) {
  return prisma.company.update({
    where: { tenantId: tenantId },
    data,
  })
}

// ============================================================================
// ACTUALIZAR POLÍTICA Y PLAN
// ============================================================================

export type UpdateCompanyPolicyData = {
  cutoffTime?: string
  daysActive?: string[] | unknown // JSON
  limitPerDay?: number
  copayCompany?: number
  copayEmployee?: number
  noShowRule?: 'CHARGE' | 'NO_CHARGE' | 'PARTIAL'
  effectiveFrom?: Date | string
  effectiveTo?: Date | string
  changedBy: string
  changeReason: string
}

export async function updateCompanyPolicy(
  tenantId: string,
  data: UpdateCompanyPolicyData
) {
  const currentPolicy = await prisma.companyPolicy.findUnique({
    where: { companyId: tenantId },
  })

  if (!currentPolicy) {
    throw new Error('Company policy not found')
  }

  // Crear historial antes de actualizar
  await prisma.companyPolicyHistory.create({
    data: {
      policyId: currentPolicy.id,
      companyId: tenantId,
      previousValues: currentPolicy as any,
      newValues: data as any,
      version: currentPolicy.version + 1,
      changedBy: data.changedBy,
      changeReason: data.changeReason,
    },
  })

  // Actualizar política
  return prisma.companyPolicy.update({
    where: { companyId: tenantId },
    data: {
      ...data,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
      version: currentPolicy.version + 1,
    } as Prisma.CompanyPolicyUncheckedUpdateInput,
  })
}

// ============================================================================
// ACTUALIZAR SETTINGS
// ============================================================================

export type UpdateCompanySettingsData = {
  deliveryLocation?: string
  deliveryInstructions?: string  // Corregido: deliveryInstructions (no deliveryNotes)
  notificationsEmail?: string[]
  notifyDailySummary?: boolean
  notifyIncidents?: boolean
  notifyInvoices?: boolean
  notifyLowAdoption?: boolean
  defaultViewEmployees?: string
  defaultPeriodReports?: string
  alertCancellationRate?: number
  alertAdoptionRate?: number
  alertDeductibilityRate?: number
}

export async function updateCompanySettings(
  tenantId: string,
  data: UpdateCompanySettingsData
) {
  // Verificar si existen settings
  const existing = await prisma.companySettings.findUnique({
    where: { companyId: tenantId },
  })

  if (existing) {
    return prisma.companySettings.update({
      where: { companyId: tenantId },
      data,
    })
  } else {
    return prisma.companySettings.create({
      data: {
        tenantId,
        companyId: tenantId,
        notificationsEmail: [],
        ...data,
      },
    })
  }
}

// ============================================================================
// GESTIÓN DE SEDES
// ============================================================================

export type CreateSiteData = {
  companyId: string
  name: string
  address: string
  postalCode?: string
  city?: string
  contactName?: string
  contactPhone?: string
  deliveryWindow?: string
  deliveryNotes?: string
  notes?: string
}

export async function createCompanySite(tenantId: string, data: CreateSiteData) {
  return prisma.companySite.create({
    data: {
      tenantId,
      ...data,
    },
  })
}

export async function updateCompanySite(
  siteId: string,
  tenantId: string,
  data: Partial<CreateSiteData>
) {
  return prisma.companySite.update({
    where: {
      id: siteId,
      tenantId, // Verificar tenant
    },
    data,
  })
}

export async function deleteCompanySite(siteId: string, tenantId: string) {
  // Soft delete
  return prisma.companySite.update({
    where: {
      id: siteId,
      tenantId,
    },
    data: {
      active: false,
    },
  })
}

// ============================================================================
// HISTORIAL DE CAMBIOS DE POLÍTICA
// ============================================================================

export async function getPolicyHistory(tenantId: string) {
  return prisma.companyPolicyHistory.findMany({
    where: { companyId: tenantId },
    orderBy: { changedAt: 'desc' },
    take: 20,
  })
}
