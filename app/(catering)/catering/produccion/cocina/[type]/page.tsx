/**
 * Página: Kitchen Display (Pantalla de Cocina)
 * Ruta: /catering/produccion/cocina/[type]
 * 
 * Tipos: primeros, segundos, postres
 * 
 * Esta página está optimizada para tablets en cocina:
 * - Fullscreen (sin layout normal)
 * - Tipografía grande
 * - Auto-refresh
 * - Solo lectura
 */

import { notFound } from 'next/navigation'
import { KitchenDisplay } from '@/components/catering/production/KitchenDisplay'

type PageProps = {
  params: {
    type: string
  }
  searchParams: {
    date?: string
  }
}

const TYPE_MAP: Record<string, 'FIRST' | 'SECOND' | 'DESSERT'> = {
  primeros: 'FIRST',
  segundos: 'SECOND',
  postres: 'DESSERT',
}

export default function KitchenDisplayPage({ params, searchParams }: PageProps) {
  const course = TYPE_MAP[params.type]

  if (!course) {
    notFound()
  }

  // Fecha del query param o hoy
  const date = searchParams.date ? new Date(searchParams.date) : new Date()

  // Si la fecha es inválida, usar hoy
  if (isNaN(date.getTime())) {
    return notFound()
  }

  return <KitchenDisplay date={date} course={course} />
}

// Metadata para fullscreen
export const metadata = {
  title: 'Producción - Cocina',
  description: 'Vista de producción para cocina',
}

