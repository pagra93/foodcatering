/**
 * Middleware Simplificado con Inyección de Tenant
 * Maneja subdominios, redirecciones y tenant headers
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/edge'
import {
  rulesForPath,
  requiredPermissionForPath,
  permitted,
} from '@/lib/auth/section-permissions'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host') || ''

  // Ignorar assets, API y ficheros estáticos públicos (SEO/GEO)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt' ||
    pathname === '/llms-full.txt' ||
    // Imágenes de metadatos generadas por convención de Next (sin extensión en
    // la URL, así que el matcher de abajo no las excluye). Las usan los
    // crawlers de redes sociales y deben ser públicas.
    pathname.startsWith('/opengraph-image') ||
    pathname.startsWith('/twitter-image')
  ) {
    return NextResponse.next()
  }

  // Extraer subdomain
  const hostParts = host.split('.')
  const subdomain = hostParts.length >= 3 ? hostParts[0] : null

  // Si hay subdomain y está en ruta raíz, redirigir a login
  if (subdomain && pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Landing page en dominio principal
  if (!subdomain && pathname === '/') {
    return NextResponse.next()
  }

  // Rutas públicas de marketing (landing multi-página) + auth + versiones markdown
  const publicPaths = [
    '/login',
    '/register',
    '/error',
    '/verify',
    '/forgot-password',
    '/reset-password',
    '/caterings',
    '/compliance',
    '/precios',
    '/calculadora',
    '/producto',
    '/demo',
    '/privacidad',
    '/terminos',
    '/cookies',
    '/md',
  ]
  const isPublic = publicPaths.some(path => pathname.startsWith(path))

  if (!isPublic) {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Enforcement por sección/portal: si la ruta exige un permiso `:view` que el
    // rol no tiene, fuera. Reglas:
    //  - El super admin nunca se bloquea (cross-tenant total).
    //  - Si la sesión aún no lleva permissions[] (JWT anterior a la migración),
    //    NO se aplica enforcement (fallback): el límite del portal lo siguen
    //    garantizando los gates por rol de cada layout. Al volver a iniciar
    //    sesión, permissions[] se rellena y el enforcement por permiso manda.
    const rules = rulesForPath(pathname)
    if (rules && session.user.role !== 'SUPER_ADMIN') {
      const perms = session.user.permissions ?? []
      if (perms.length > 0) {
        const required = requiredPermissionForPath(rules, pathname)
        if (required && !permitted(perms, required)) {
          return NextResponse.redirect(new URL('/unauthorized', req.url))
        }
      }
    }

    // Inyectar tenant ID en headers desde la sesión
    if (session?.user?.tenantId) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-tenant-id', session.user.tenantId)
      
      if (session.user.tenantType) {
        requestHeaders.set('x-tenant-type', session.user.tenantType)
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } else {
      // Sin PII en logs: se identifica por userId, no por email.
      console.error('[ERROR] Usuario sin tenantId en sesión (userId: %s)', session.user.id)
      return NextResponse.redirect(new URL('/login?error=NoTenant', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

