import { type Metadata } from 'next'

import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'

// NOTA: contenido base de partida. Debe revisarlo un asesor legal antes de
// publicar y ajustar la tabla de cookies a las que realmente use el sitio.
export const metadata: Metadata = {
  title: 'Política de cookies',
  description:
    'Qué cookies usa Plati, para qué sirven y cómo gestionarlas o desactivarlas.',
  alternates: { canonical: '/cookies' },
  robots: 'noindex, follow',
}

const UPDATED_AT = '27 de junio de 2026'

const SECTIONS: LegalSection[] = [
  {
    heading: 'Qué es una cookie',
    body: (
      <p>
        Una cookie es un pequeño archivo que un sitio web guarda en tu navegador
        para recordar información sobre tu visita (por ejemplo, mantener tu sesión
        iniciada o medir el uso del sitio).
      </p>
    ),
  },
  {
    heading: 'Cookies que usamos',
    body: (
      <ul>
        <li>
          <strong>Técnicas / necesarias:</strong> imprescindibles para que el
          sitio y el acceso a la plataforma funcionen (sesión, seguridad,
          preferencias). No requieren consentimiento.
        </li>
        <li>
          <strong>Analíticas:</strong> nos ayudan a entender cómo se usa el sitio
          de forma agregada para mejorarlo. Se activan solo con tu consentimiento.
        </li>
        <li>
          <strong>De terceros:</strong> si incrustamos contenido externo (por
          ejemplo, mapas), dicho proveedor puede instalar sus propias cookies.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Cómo gestionarlas',
    body: (
      <p>
        Puedes aceptar, rechazar o configurar las cookies no necesarias desde el
        banner de consentimiento. También puedes borrarlas o bloquearlas desde la
        configuración de tu navegador; ten en cuenta que desactivar las técnicas
        puede afectar al funcionamiento del sitio.
      </p>
    ),
  },
  {
    heading: 'Más información',
    body: (
      <p>
        El tratamiento de los datos que recogen las cookies se explica en nuestra{' '}
        <a href="/privacidad">Política de privacidad</a>. Para cualquier duda,
        escríbenos a{' '}
        <a href="mailto:privacidad@plati.es">privacidad@plati.es</a>.
      </p>
    ),
  },
]

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de cookies"
      updatedAt={UPDATED_AT}
      intro="Usamos las cookies justas: las que hacen que el sitio funcione y, con tu permiso, las que nos ayudan a mejorarlo."
      sections={SECTIONS}
    />
  )
}
