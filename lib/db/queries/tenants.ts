/**
 * Queries para gestión de Tenants (CRUD)
 */

import { prisma } from '@/lib/db/prisma'
import { type Prisma } from '@prisma/client'
import type { 
  CreateTenantInput, 
  UpdateTenantInput, 
  UpdateTenantStatusInput,
  TenantFiltersInput 
} from '@/lib/validations/tenant'

/**
 * Obtener listado de tenants con filtros y paginación
 */
export async function getTenants(filters: TenantFiltersInput) {
  const { search, type, status, sortBy, sortOrder, page, pageSize } = filters

  // Construir where clause
  const where: Prisma.TenantWhereInput = {
    deletedAt: null,
    id: { not: 'ROOT' }, // Excluir tenant ROOT
  }

  if (type && type !== 'ALL') {
    where.type = type
  }

  if (status && status !== 'ALL') {
    where.status = status
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { subdomain: { contains: search, mode: 'insensitive' } },
      { contactEmail: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Construir order by
  const orderBy: Prisma.TenantOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  }

  // Ejecutar queries en paralelo
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        type: true,
        subdomain: true,
        status: true,
        primaryColor: true,
        logoUrl: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        updatedAt: true,
        // Contadores de relaciones
        _count: {
          select: {
            users: true,
            companies: true,
            restaurants: true,
          },
        },
      },
    }),
    prisma.tenant.count({ where }),
  ])

  return {
    tenants,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Obtener un tenant por ID con todos sus datos
 */
export async function getTenantById(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          nameEnc: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      companies: {
        include: {
          sites: {
            where: { active: true },
            take: 5,
          },
          policy: true,
        },
      },
      restaurants: {
        include: {
          documents: {
            orderBy: { expiresAt: 'asc' },
            take: 5,
          },
        },
      },
      _count: {
        select: {
          users: true,
          companies: true,
          restaurants: true,
        },
      },
    },
  })

  if (!tenant) {
    throw new Error('Tenant no encontrado')
  }

  return tenant
}

/**
 * Crear un nuevo tenant
 */
export async function createTenant(data: CreateTenantInput, _createdBy: string) {
  // Verificar que el subdominio no exista
  const existing = await prisma.tenant.findUnique({
    where: { subdomain: data.subdomain },
  })

  if (existing) {
    throw new Error('El subdominio ya está en uso')
  }

  // Crear tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      type: data.type,
      subdomain: data.subdomain,
      status: data.status || 'ACTIVE',
      primaryColor: data.primaryColor,
      logoUrl: data.logoUrl,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country || 'ES',
      timezone: data.timezone || 'Europe/Madrid',
      currency: data.currency || 'EUR',
      language: data.language || 'es',
      notes: data.notes,
      config: (data.config ?? {}) as Prisma.InputJsonValue,
    },
  })

  // Si es empresa, crear registro en Company con el plan Starter por defecto.
  if (tenant.type === 'EMPRESA') {
    const starter = await prisma.saasPlan.findUnique({
      where: { code: 'starter' },
      select: { id: true },
    })
    await prisma.company.create({
      data: {
        tenantId: tenant.id,
        legalName: data.name,
        cif: '',
        billingAddress: data.address || '',
        saasPlanId: starter?.id ?? null,
      },
    })
  }

  // Si es catering, crear registro en Restaurant
  // NOTA: Restaurant requiere cif, billingAddress, contactPerson, contactEmail, contactPhone.
  // Si el form de creación de tenant no los aporta todavía, se rellenan con defaults vacíos
  // que el admin debe actualizar antes de operar el catering.
  if (tenant.type === 'CATERING') {
    await prisma.restaurant.create({
      data: {
        tenantId: tenant.id,
        displayName: data.name,
        legalName: data.name,
        cif: '',
        billingAddress: data.address || '',
        contactPerson: '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        zones: [],
      },
    })
  }

  return tenant
}

/**
 * Actualizar un tenant
 */
export async function updateTenant(
  id: string,
  data: Omit<UpdateTenantInput, 'id'>,
  _updatedBy: string
) {
  // Obtener tenant actual para comparar cambios
  const current = await prisma.tenant.findUnique({
    where: { id },
  })

  if (!current) {
    throw new Error('Tenant no encontrado')
  }

  // Si cambia el subdominio, verificar que no exista
  if (data.subdomain && data.subdomain !== current.subdomain) {
    const existing = await prisma.tenant.findUnique({
      where: { subdomain: data.subdomain },
    })

    if (existing) {
      throw new Error('El subdominio ya está en uso')
    }
  }

  // Actualizar tenant
  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      name: data.name,
      subdomain: data.subdomain,
      status: data.status,
      primaryColor: data.primaryColor,
      logoUrl: data.logoUrl,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      timezone: data.timezone,
      currency: data.currency,
      language: data.language,
      notes: data.notes,
      config: data.config !== undefined ? (data.config as Prisma.InputJsonValue) : undefined,
    },
  })

  return updated
}

/**
 * Cambiar estado de un tenant (activar, suspender, etc.)
 */
export async function updateTenantStatus(
  data: UpdateTenantStatusInput,
  _updatedBy: string
) {
  const { id, status } = data

  const tenant = await prisma.tenant.update({
    where: { id },
    data: { status },
  })

  return tenant
}

/**
 * Soft delete de un tenant
 */
export async function deleteTenant(id: string, _deletedBy: string) {
  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: 'SUSPENDED',
    },
  })

  return tenant
}

/**
 * Verificar si un subdominio está disponible
 */
export async function checkSubdomainAvailability(subdomain: string) {
  const existing = await prisma.tenant.findUnique({
    where: { subdomain },
    select: { id: true },
  })

  return !existing
}

