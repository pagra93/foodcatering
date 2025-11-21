/**
 * Página de Login General
 * Layout 50/50: Izquierda (formulario) | Derecha (imagen)
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDashboardPath } from '@/lib/auth/permissions'
import { getTenantFromHeaders } from '@/lib/middleware/headers'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | BonSanté',
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

  // Obtener información del tenant (si viene de subdominio)
  const tenantContext = getTenantFromHeaders()

  return (
    <div className="flex min-h-screen">
      {/* LADO IZQUIERDO: Formulario */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">Bon</span>
              <span className="text-2xl font-bold text-green-600">Santé</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm">
              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
              </svg>
              <span className="text-gray-500">fr</span>
            </div>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bonjour!</h1>
            <p className="mt-2 text-sm text-gray-600">
              Pour vous connecter à votre compte, renseignez votre adresse email ainsi que votre mot de passe.
            </p>
          </div>

          {/* Formulario */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link 
              href="/forgot-password" 
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              N'avez pas vous créé votre compte ?{' '}
              <Link 
                href="/register" 
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                s'identifier sur BonSante.com
              </Link>
            </p>
          </div>

          {/* Copyright */}
          <div className="mt-12 text-center text-xs text-gray-400">
            All copyrights reserved Tous les droits de reproduction 2022
          </div>
        </div>
      </div>

      {/* LADO DERECHO: Imagen */}
      <div className="relative hidden w-1/2 bg-gray-100 lg:block">
        {/* Imagen de fondo */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Contenedor de imagen con plantas */}
          <div className="relative h-full w-full">
            {/* Simulación de imagen con plantas - reemplazar con imagen real */}
            <div className="flex h-full flex-col items-center justify-center p-12">
              {/* Plantas decorativas (placeholder) */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 h-64 w-64 rounded-full bg-white/50 backdrop-blur-sm" />
                <div className="mx-auto h-32 w-48 rounded-2xl bg-amber-100/50" />
              </div>

              {/* Texto superpuesto */}
              <div className="max-w-md text-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  Precision medicine is the new gold standard for cancer treatment
                </h2>
                <p className="mt-4 text-sm text-gray-600">
                  This moulding information expert includes validated recommendation examples, research consensus on dosing and much more
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
