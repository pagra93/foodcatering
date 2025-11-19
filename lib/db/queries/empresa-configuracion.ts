/**
 * Queries para gestión de Configuración de Empresa
 * Información general, plan, límites, preferencias, documentación
 */

import { prisma } from '@/lib/db/prisma'

// ============================================================================
// OBTENER CONFIGURACIÓN COMPLETA
// ============================================================================

export async function getCompanyConfiguration(tenantId: string) {
  const [company, policy, sites, settings] = await Promise.all([
    // Información general de la empresa
    prisma.company.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        legalName: true,
        cif: true,
        address: true,
        postalCode: true,
        city: true,
        province: true,
        phone: true,
        email: true,
        website: true,
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
        status: true,
        statusNotes: true,
        createdAt: true,
      },
    }),

    // Política y plan
    prisma.companyPolicy.findUnique({
      where: { companyId: tenantId },
      select: {
        id: true,
        dailyLimit: true,
        monthlyLimit: true,
        subsidyPercentage: true,
        allowWeekends: true,
        allowHolidays: true,
        cutoffTime: true,
        cancellationDeadlineHours: true,
        penaltyForNoShow: true,
        penaltyForLateCancellation: true,
        allowDietaryPreferences: true,
        requiresManagerApproval: true,
        maxAdvanceOrderDays: true,
        minAdvanceOrderDays: true,
        fiscalYearStart: true,
        version: true,
        changedBy: true,
        changeReason: true,
        updatedAt: true,
      },
    }),

    // Sedes
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
        notes: true,
      },
      orderBy: { name: 'asc' },
    }),

    // Settings adicionales
    prisma.companySettings.findUnique({
      where: { companyId: tenantId },
      select: {
        id: true,
        emailNotifications: true,
        smsNotifications: true,
        notifyOnOrderConfirmed: true,
        notifyOnOrderDelivered: true,
        notifyOnIncident: true,
        notifyOnInvoice: true,
        weeklyDigest: true,
        monthlyReport: true,
        preferredLanguage: true,
        timezone: true,
        currency: true,
        dateFormat: true,
        fiscalDocRetention: true,
        autoApproveOrders: true,
        requirePhotoProof: true,
        allowEmployeeFeedback: true,
        publicHolidays: true,
        customCutoffRules: true,
      },
    }),
  ])

  if (!company) {
    return null
  }

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
  address?: string
  postalCode?: string
  city?: string
  province?: string
  phone?: string
  email?: string
  website?: string
  sector?: string
  employeeCount?: number
  contactRrhhName?: string
  contactRrhhEmail?: string
  contactRrhhPhone?: string
  contactFinanceName?: string
  contactFinanceEmail?: string
  contactFinancePhone?: string
}

export async function updateCompanyGeneral(
  tenantId: string,
  data: UpdateCompanyGeneralData
) {
  return prisma.company.update({
    where: { id: tenantId },
    data,
  })
}

// ============================================================================
// ACTUALIZAR POLÍTICA Y PLAN
// ============================================================================

export type UpdateCompanyPolicyData = {
  dailyLimit?: number
  monthlyLimit?: number
  subsidyPercentage?: number
  allowWeekends?: boolean
  allowHolidays?: boolean
  cutoffTime?: string
  cancellationDeadlineHours?: number
  penaltyForNoShow?: number
  penaltyForLateCancellation?: number
  allowDietaryPreferences?: boolean
  requiresManagerApproval?: boolean
  maxAdvanceOrderDays?: number
  minAdvanceOrderDays?: number
  fiscalYearStart?: Date
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
      version: currentPolicy.version + 1,
    },
  })
}

// ============================================================================
// ACTUALIZAR SETTINGS
// ============================================================================

export type UpdateCompanySettingsData = {
  emailNotifications?: boolean
  smsNotifications?: boolean
  notifyOnOrderConfirmed?: boolean
  notifyOnOrderDelivered?: boolean
  notifyOnIncident?: boolean
  notifyOnInvoice?: boolean
  weeklyDigest?: boolean
  monthlyReport?: boolean
  preferredLanguage?: string
  timezone?: string
  currency?: string
  dateFormat?: string
  fiscalDocRetention?: number
  autoApproveOrders?: boolean
  requirePhotoProof?: boolean
  allowEmployeeFeedback?: boolean
  publicHolidays?: any
  customCutoffRules?: any
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
        companyId: tenantId,
        ...data,
      },
    })
  }
}

// ============================================================================
// GESTIÓN DE SEDES
// ============================================================================

export type CreateSiteData = {
  name: string
  address: string
  postalCode?: string
  city?: string
  contactName?: string
  contactPhone?: string
  deliveryWindow?: string
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

