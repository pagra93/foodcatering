/**
 * Página de Login General
 * Layout 50/50: Izquierda (branding) | Derecha (formulario)
 * Adaptable al tenant con colores y logo personalizados
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDashboardPath } from '@/lib/auth/permissions'
import { getTenantFromHeaders } from '@/lib/middleware/headers'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Comidas',
  description: 'Accede a tu portal de Comidas',
}

export default async function LoginPage() {
  // Si ya está autenticado, redirigir a su dashboard
  const session = await auth()
  
  if (session?.user) {
    const dashboardPath = getDashboardPath(
      session.user.role,
      session.user.tenantType
    )
    redirect(dashboardPath)
  }

  // Obtener información del tenant (si viene de subdominio)
  const tenantContext = getTenantFromHeaders()
  
  // Branding por defecto (general) o personalizado por tenant
  const branding = {
    bgColor: tenantContext?.id ? 'from-blue-600 to-blue-700' : 'from-blue-600 to-purple-600',
    logo: tenantContext?.id ? tenantContext.name : 'Comidas',
    tagline: tenantContext?.id 
      ? `Bienvenido a ${tenantContext.name}`
      : 'Gestión de menús corporativos con compliance fiscal automático',
    accentColor: 'blue',
  }

  return (
    <div className="flex min-h-screen">
      {/* Lado Izquierdo: Branding */}
      <div className={`hidden w-1/2 bg-gradient-to-br ${branding.bgColor} lg:flex lg:flex-col lg:justify-between lg:p-12`}>
        <div>
          {/* Logo y marca */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <span className="text-2xl font-bold text-white">
                  {branding.logo[0]?.toUpperCase() || 'C'}
                </span>
              </div>
              <span className="text-2xl font-bold text-white">{branding.logo}</span>
            </div>
          </div>

          {/* Contenido central */}
          <div className="space-y-6 text-white">
            <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
              {branding.tagline}
            </h1>
            
            <p className="text-lg text-white/90">
              Plataforma segura y compliant para gestionar el beneficio de comida diaria.
            </p>

            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90">Compliance IRPF automático</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90">Trazabilidad completa</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90">Multi-tenant seguro</span>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="text-sm text-white/70">
            <p>© 2025 {branding.logo}. Todos los derechos reservados.</p>
          </div>
        </div>

        {/* Lado Derecho: Formulario */}
        <div className="flex w-full items-center justify-center p-8 lg:w-1/2 lg:p-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8">
              {/* Logo móvil (solo visible en mobile) */}
              <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
                  <span className="text-xl font-bold text-white">
                    {branding.logo[0]?.toUpperCase() || 'C'}
                  </span>
                </div>
                <span className="text-xl font-bold text-gray-900">{branding.logo}</span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h1>
              <p className="mt-2 text-sm text-gray-600">
                Accede a tu portal con tus credenciales
              </p>
            </div>

            {/* Form */}
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}

