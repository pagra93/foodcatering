'use client'

import { ArrowLeft } from 'lucide-react'

/** Botón "Volver atrás" — interactividad cliente para páginas server. */
export function BackButton() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <ArrowLeft className="h-5 w-5" />
      Volver Atrás
    </button>
  )
}
