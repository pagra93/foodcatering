/**
 * Página: Raíz del Catering
 * Ruta: /catering
 * 
 * Redirige automáticamente a /catering/dashboard
 */

import { redirect } from 'next/navigation'

export default function CateringRootPage() {
  redirect('/catering/dashboard')
}

