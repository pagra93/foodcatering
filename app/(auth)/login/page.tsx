/**
 * Página de Login General
 * Layout 50/50: Izquierda (formulario) | Derecha (imagen)
 */

import { type Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDashboardPath } from '@/lib/auth/permissions'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | SinTupper',
  description: 'Accede a tu portal de gestión de menús corporativos',
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

  return (
    <div className="flex min-h-screen">
      {/* LADO IZQUIERDO: Formulario */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">Sin</span>
              <span className="text-2xl font-bold text-orange-600">Tupper</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm">
              <svg className="h-4 w-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              <span className="text-gray-500">ES</span>
            </div>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido!</h1>
            <p className="mt-2 text-sm text-gray-600">
              Ingresa tu email y contraseña para acceder a tu portal.
            </p>
          </div>

          {/* Formulario */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link 
              href="/forgot-password" 
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Aún no tienes cuenta?{' '}
              <Link 
                href="/register" 
                className="font-medium text-orange-600 hover:text-orange-700"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>

          {/* Copyright */}
          <div className="mt-12 text-center text-xs text-gray-400">
            © 2025 SinTupper. Todos los derechos reservados.
          </div>
        </div>
      </div>

      {/* LADO DERECHO: Branding */}
      <div className="relative hidden w-1/2 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 lg:block">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="relative max-w-lg text-center">
            {/* Icono decorativo */}
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-white/20 p-6 backdrop-blur-sm">
                <svg className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
            </div>

            {/* Título y eslogan */}
            <h2 className="text-4xl font-bold text-white mb-4">
              Menús corporativos sin complicaciones
            </h2>
            <p className="text-xl text-orange-100 mb-8">
              Gestiona los beneficios de comida de tu empresa de forma simple y transparente
            </p>

            {/* Features */}
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 text-orange-200 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-white">
                  <span className="font-semibold">Cumplimiento fiscal garantizado:</span> Límite de 11€/día para deducción total
                </p>
              </div>
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 text-orange-200 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-white">
                  <span className="font-semibold">Gestión centralizada:</span> Un solo lugar para empleados, caterings y finanzas
                </p>
              </div>
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 text-orange-200 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-white">
                  <span className="font-semibold">Trazabilidad completa:</span> Reportes automáticos listos para auditorías
                </p>
              </div>
            </div>

            {/* Footer del lado derecho */}
            <div className="mt-12 pt-8 border-t border-orange-400/30">
              <p className="text-orange-100 text-sm">
                Más de 50 empresas confían en SinTupper para gestionar sus beneficios de comida
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
