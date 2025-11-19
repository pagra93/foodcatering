/**
 * Página: Packing Display (Pantalla de Empaquetado)
 * Ruta: /catering/produccion/empaquetado
 * 
 * Esta página está optimizada para tablets en zona de empaquetado:
 * - Fullscreen (sin layout normal)
 * - Tipografía grande
 * - Auto-refresh
 * - Solo lectura
 */

import { PackingDisplay } from '@/components/catering/production/PackingDisplay'

type PageProps = {
  searchParams: {
    date?: string
    companyId?: string
  }
}

export default function PackingDisplayPage({ searchParams }: PageProps) {
  // Fecha del query param o hoy
  const date = searchParams.date ? new Date(searchParams.date) : new Date()

  // Si la fecha es inválida, usar hoy
  if (isNaN(date.getTime())) {
    const today = new Date()
    return <PackingDisplay date={today} companyId={searchParams.companyId} />
  }

  return <PackingDisplay date={date} companyId={searchParams.companyId} />
}

// Metadata
export const metadata = {
  title: 'Producción - Empaquetado',
  description: 'Vista de producción para empaquetado',
}

