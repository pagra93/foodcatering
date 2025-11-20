/**
 * Middleware Simplificado
 * Solo maneja subdominios y redirecciones básicas
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host') || ''

  // Ignorar assets y API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon')
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

  // Verificar auth solo en rutas protegidas
  const publicPaths = ['/login', '/register', '/error', '/verify', '/forgot-password', '/reset-password']
  const isPublic = publicPaths.some(path => pathname.startsWith(path))

  if (!isPublic) {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

