/**
 * Página de Login General
 * Layout 50/50: Izquierda (formulario) | Derecha (imagen)
 */

import { type Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getDashboardPath } from '@/lib/auth/permissions'
import { PlatiLogo, PlatiSymbol } from '@/components/marketing/PlatiLogo'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión · Plati',
  description: 'Accede a tu portal de Plati',
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
            <Link href="/" aria-label="Plati — inicio">
              <PlatiLogo />
            </Link>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground">
              ¡Bienvenido!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entra con tu email y contraseña para acceder a tu portal.
            </p>
          </div>

          {/* Formulario */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary/80"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Copyright */}
          <div className="mt-12 text-center text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} Plati. Todos los derechos reservados.
          </div>
        </div>
      </div>

      {/* LADO DERECHO: Branding */}
      <div className="relative hidden w-1/2 bg-tinta lg:block">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="relative max-w-lg text-center text-hueso">
            {/* Símbolo de marca */}
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-hueso/10 p-6 backdrop-blur-sm">
                <PlatiSymbol tone="hueso" className="h-20 w-20" />
              </div>
            </div>

            {/* Título y eslogan */}
            <h2 className="plati-display mb-4 text-4xl text-hueso">
              El menú de hoy, en tu oficina<span className="plati-dot" />
            </h2>
            <p className="mb-8 text-xl text-hueso/70">
              Caterings locales cocinan cada día y lo llevamos a tu empresa. Comer
              juntos es cultura.
            </p>

            {/* Features */}
            <div className="space-y-4 text-left">
              {[
                {
                  t: 'Cocinado hoy:',
                  d: 'menús frescos de un catering local, servidos en tu oficina.',
                },
                {
                  t: 'Todo en un sitio:',
                  d: 'empresa, empleados y catering en la misma plataforma.',
                },
                {
                  t: 'Exento de IRPF:',
                  d: 'hasta 11€/día por empleado, sin papeleo para RRHH.',
                },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 h-6 w-6 flex-shrink-0 text-tomate"
                    aria-hidden="true"
                  />
                  <p className="text-hueso">
                    <span className="font-semibold">{f.t}</span> {f.d}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer del lado derecho */}
            <div className="mt-12 border-t border-hueso/15 pt-8">
              <p className="text-sm text-hueso/70">
                Caterings locales que ya cocinan para Plati cada día.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
