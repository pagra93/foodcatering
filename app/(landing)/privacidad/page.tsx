import { type Metadata } from 'next'

import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'

// NOTA: contenido base de partida. Debe revisarlo un asesor legal antes de
// publicar y completar los datos entre [corchetes] con los de la sociedad.
export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Cómo Plati trata tus datos personales: responsable, finalidades, base legal, conservación, encargados y derechos RGPD.',
  alternates: { canonical: '/privacidad' },
  robots: 'noindex, follow',
}

const UPDATED_AT = '27 de junio de 2026'

const SECTIONS: LegalSection[] = [
  {
    heading: 'Responsable del tratamiento',
    body: (
      <>
        <p>
          El responsable del tratamiento de tus datos es{' '}
          <strong>[RAZÓN SOCIAL, S.L.]</strong> (en adelante, «Plati»), con NIF{' '}
          <strong>[NIF]</strong> y domicilio en <strong>[DOMICILIO]</strong>.
        </p>
        <p>
          Para cualquier cuestión relativa a la protección de datos puedes
          escribirnos a{' '}
          <a href="mailto:privacidad@plati.es">privacidad@plati.es</a>.
        </p>
      </>
    ),
  },
  {
    heading: 'Qué datos tratamos',
    body: (
      <>
        <p>Según tu relación con Plati, tratamos:</p>
        <ul>
          <li>
            <strong>Solicitudes de demo y contacto:</strong> nombre, email
            corporativo, empresa, número de empleados y el mensaje que nos
            envíes.
          </li>
          <li>
            <strong>Uso de la plataforma:</strong> datos de cuenta, pedidos,
            preferencias alimentarias y alérgenos, e incidencias.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP, identificadores de
            dispositivo y datos de navegación (ver{' '}
            <a href="/cookies">Política de cookies</a>).
          </li>
        </ul>
        <p>
          Los datos de salud (alergias y preferencias dietéticas) se tratan con
          medidas reforzadas y cifrado AES-256-GCM en reposo.
        </p>
      </>
    ),
  },
  {
    heading: 'Finalidades y base legal',
    body: (
      <ul>
        <li>
          <strong>Atender tu solicitud de demo o contacto</strong> — base legal:
          consentimiento y medidas precontractuales (art. 6.1.a y 6.1.b RGPD).
        </li>
        <li>
          <strong>Prestar el servicio</strong> a empresas, empleados y caterings
          — base legal: ejecución del contrato (art. 6.1.b RGPD).
        </li>
        <li>
          <strong>Cumplir obligaciones legales y fiscales</strong> (facturación,
          evidencia de la exención del Art. 42.3 LIRPF) — base legal: obligación
          legal (art. 6.1.c RGPD).
        </li>
        <li>
          <strong>Mejorar el servicio y comunicaciones</strong> — base legal:
          interés legítimo o consentimiento (art. 6.1.a y 6.1.f RGPD).
        </li>
      </ul>
    ),
  },
  {
    heading: 'Conservación',
    body: (
      <p>
        Conservamos los datos mientras dure la relación y, después, durante los
        plazos legalmente exigibles (en particular, los plazos fiscales y
        mercantiles aplicables a la facturación y la evidencia de la exención).
        Las solicitudes de demo no convertidas se conservan un máximo de{' '}
        <strong>[12] meses</strong>.
      </p>
    ),
  },
  {
    heading: 'Destinatarios y encargados',
    body: (
      <>
        <p>
          No vendemos tus datos. Los compartimos únicamente con los caterings y
          empresas estrictamente necesarios para prestar el servicio, y con
          proveedores que actúan como <strong>encargados de tratamiento</strong>{' '}
          (hosting, email, analítica), con contrato de encargo (DPA) firmado.
        </p>
        <p>
          Nuestros servidores están en la <strong>Unión Europea</strong>. Si
          algún proveedor implicara transferencias internacionales, se ampararán
          en garantías adecuadas (cláusulas contractuales tipo de la UE).
        </p>
      </>
    ),
  },
  {
    heading: 'Tus derechos',
    body: (
      <>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión,
          oposición, limitación y portabilidad escribiendo a{' '}
          <a href="mailto:privacidad@plati.es">privacidad@plati.es</a>,
          acreditando tu identidad.
        </p>
        <p>
          Si consideras que no hemos atendido correctamente tu solicitud, puedes
          reclamar ante la Agencia Española de Protección de Datos (
          <a href="https://www.aepd.es" rel="noopener noreferrer" target="_blank">
            www.aepd.es
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    heading: 'Seguridad',
    body: (
      <p>
        Aplicamos medidas técnicas y organizativas apropiadas: cifrado de datos
        personales sensibles en reposo (AES-256-GCM), registro de accesos,
        backups cifrados y rotados, y minimización de datos. Ningún sistema es
        infalible, pero trabajamos para protegerlos con diligencia.
      </p>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      updatedAt={UPDATED_AT}
      intro="Tu confianza importa. Aquí explicamos, sin letra pequeña, qué datos tratamos, para qué y qué puedes hacer con ellos."
      sections={SECTIONS}
    />
  )
}
