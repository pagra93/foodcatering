import { type Metadata } from 'next'
import Link from 'next/link'
import { Home, SearchX } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'La página que buscas no existe o ha sido movida',
}

/**
 * Página 404 global: URLs sin ruta y llamadas a notFound().
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md text-center">
        {/* Icono */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-slate-200 p-6 dark:bg-slate-700/40">
            <SearchX className="h-16 w-16 text-slate-500 dark:text-slate-400" />
          </div>
        </div>

        {/* Título */}
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-slate-100">
          Página no encontrada
        </h1>

        {/* Mensaje */}
        <p className="mb-8 text-lg text-slate-600 dark:text-slate-400">
          La página que buscas no existe o ha sido movida.
        </p>

        {/* Acción */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Home className="h-5 w-5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
