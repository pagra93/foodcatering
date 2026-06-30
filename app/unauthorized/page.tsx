import { type Metadata } from 'next'
import Link from 'next/link'
import { ShieldAlert, Home } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getDashboardPath } from '@/lib/auth/permissions'
import { BackButton } from '@/components/auth/BackButton'

export const metadata: Metadata = {
  title: 'Acceso Denegado · Plati',
  description: 'No tienes permisos para acceder a esta página',
}

export default async function UnauthorizedPage() {
  const session = await auth()

  // Determinar la ruta del dashboard según el rol
  const dashboardPath = session
    ? getDashboardPath(session.user.role, session.user.tenantType)
    : '/'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md text-center">
        {/* Icono */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-red-100 p-6 dark:bg-red-900/20">
            <ShieldAlert className="h-16 w-16 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Título */}
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-slate-100">
          Acceso Denegado
        </h1>

        {/* Mensaje */}
        <p className="mb-8 text-lg text-slate-600 dark:text-slate-400">
          No tienes los permisos necesarios para acceder a esta página.
        </p>

        {/* Información adicional si está autenticado */}
        {session && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Usuario:
              </span>{' '}
              {session.user.name}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Rol:
              </span>{' '}
              {session.user.role.replace('_', ' ')}
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col gap-3">
          {session ? (
            <>
              <Link
                href={dashboardPath}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary dark:bg-primary dark:hover:bg-primary"
              >
                <Home className="h-5 w-5" />
                Ir al Dashboard
              </Link>

              <BackButton />
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>

        {/* Ayuda */}
        <div className="mt-8 text-sm text-slate-500 dark:text-slate-500">
          Si crees que deberías tener acceso a esta página,{' '}
          <Link
            href="/soporte"
            className="font-medium text-primary hover:underline dark:text-primary"
          >
            contacta con soporte
          </Link>
          .
        </div>
      </div>
    </div>
  )
}

