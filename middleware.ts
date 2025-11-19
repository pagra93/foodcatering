/**
 * Next.js Middleware
 * Ejecuta en cada request para:
 * 1. Resolver tenant desde subdominio
 * 2. Verificar autenticación
 * 3. Proteger rutas según rol
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getSubdomainFromRequest,
  resolveTenantFromSubdomain,
  isTenantActive,
} from '@/lib/middleware/tenant'
import { auth } from '@/lib/auth'

/**
 * Rutas públicas (no requieren auth ni tenant)
 */
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/verify',
  '/api/auth',
]

/**
 * Rutas que no requieren tenant (landing, etc)
 */
const NO_TENANT_ROUTES = [
  '/', // Landing page
  '/login', // Login sin subdomain
  '/forgot-password',
  '/reset-password',
  '/verify',
  '/privacy',
  '/terms',
  '/contact',
]

/**
 * Rutas que no pasan por middleware
 */
const IGNORED_PATHS = [
  '/_next',
  '/favicon.ico',
  '/api/health',
  '/robots.txt',
  '/sitemap.xml',
]

/**
 * Verificar si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

/**
 * Verificar si una ruta no requiere tenant
 */
function noTenantRequired(pathname: string): boolean {
  return NO_TENANT_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * Verificar si debe ignorarse
 */
function shouldIgnore(pathname: string): boolean {
  return IGNORED_PATHS.some((path) => pathname.startsWith(path))
}

/**
 * Middleware principal
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Ignorar rutas estáticas y API de Next.js
  if (shouldIgnore(pathname)) {
    return NextResponse.next()
  }

  // Permitir rutas que no requieren tenant (landing page, etc)
  if (noTenantRequired(pathname)) {
    return NextResponse.next()
  }

  // 1. RESOLVER TENANT DESDE SUBDOMINIO
  const subdomain = getSubdomainFromRequest(req)

  let tenant = null

  // Si hay subdomain, resolver tenant
  if (subdomain) {
    tenant = await resolveTenantFromSubdomain(subdomain)

    // Tenant no encontrado
    if (!tenant) {
      return new NextResponse('Tenant no encontrado', { status: 404 })
    }

    // Tenant suspendido
    if (!isTenantActive(tenant.status)) {
      return new NextResponse('Tenant suspendido', { status: 403 })
    }
  }
  
  // Si no hay subdomain pero es ruta /admin, permitir (desarrollo local)
  // El resto de rutas (/empresa, /catering) requieren subdomain
  if (!subdomain && !pathname.startsWith('/admin') && !pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // 2. VERIFICAR AUTENTICACIÓN
  const session = await auth()

  // Rutas públicas (permitir sin auth)
  if (isPublicRoute(pathname)) {
    // Si ya está autenticado y va a login, redirigir al dashboard
    if (session && pathname === '/auth/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Si no hay sesión, redirigir a login
  if (!session) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. VERIFICAR QUE EL USUARIO PERTENECE AL TENANT
  // Solo validar si hay tenant (subdomain)
  if (tenant) {
    // Super admin puede acceder a todos los tenants
    if (
      session.user.role !== 'SUPER_ADMIN' &&
      session.user.tenantId !== tenant.id
    ) {
      return new NextResponse('Acceso denegado a este tenant', { status: 403 })
    }
  }

  // 4. VERIFICAR PERMISOS POR TIPO DE PORTAL
  
  // Portal Admin (admin.comida.com)
  if (pathname.startsWith('/admin')) {
    const allowedRoles = ['SUPER_ADMIN', 'ROOT']
    if (!allowedRoles.includes(session.user.role as string)) {
      return new NextResponse('Acceso denegado - Solo Super Admin', { status: 403 })
    }
  }
  
  // Portal Empresa ({empresa}.comida.com/empresa/*)
  if (pathname.startsWith('/empresa')) {
    if (!tenant) {
      return new NextResponse('Se requiere subdomain para portal empresa', { status: 400 })
    }
    
    if (tenant.type !== 'EMPRESA') {
      return new NextResponse('Este tenant no es una empresa', { status: 403 })
    }
    
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'MANAGER_SEDE', 'VIEWER']
    if (!allowedRoles.includes(session.user.role as string)) {
      return new NextResponse('Acceso denegado - Sin permisos para portal empresa', { status: 403 })
    }
  }
  
  // Portal Catering ({catering}.comida.com/catering/*)
  if (pathname.startsWith('/catering')) {
    if (!tenant) {
      return new NextResponse('Se requiere subdomain para portal catering', { status: 400 })
    }
    
    if (tenant.type !== 'CATERING') {
      return new NextResponse('Este tenant no es un catering', { status: 403 })
    }
    
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_CATERING', 'CHEF', 'COCINERO', 'REPARTIDOR']
    if (!allowedRoles.includes(session.user.role as string)) {
      return new NextResponse('Acceso denegado - Sin permisos para portal catering', { status: 403 })
    }
  }
  
  // Portal Empleado ({empresa}.comida.com/empleado/*)
  if (pathname.startsWith('/empleado')) {
    if (!tenant) {
      return new NextResponse('Se requiere subdomain para portal empleado', { status: 400 })
    }
    
    if (tenant.type !== 'EMPRESA') {
      return new NextResponse('El portal de empleado solo está disponible para empresas', { status: 403 })
    }
    
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'RRHH', 'FINANZAS', 'EMPLEADO']
    if (!allowedRoles.includes(session.user.role as string)) {
      return new NextResponse('Acceso denegado - Sin permisos para portal empleado', { status: 403 })
    }
  }

  // 5. INYECTAR TENANT EN HEADERS (para usar en la app)
  const requestHeaders = new Headers(req.headers)
  
  if (tenant) {
    requestHeaders.set('x-tenant-id', tenant.id)
    requestHeaders.set('x-tenant-type', tenant.type)
    requestHeaders.set('x-tenant-status', tenant.status)
  }

  // Continuar con el request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

/**
 * Config del middleware
 * Define qué rutas pasan por el middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
