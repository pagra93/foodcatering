import { type Metadata } from 'next'

import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'

// NOTA: contenido base de partida. Debe revisarlo un asesor legal antes de
// publicar y completar los datos entre [corchetes] con los de la sociedad.
export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description:
    'Condiciones de uso del sitio y del servicio Plati: objeto, cuentas, planes y pago, obligaciones, responsabilidad y ley aplicable.',
  alternates: { canonical: '/terminos' },
  robots: 'noindex, follow',
}

const UPDATED_AT = '27 de junio de 2026'

const SECTIONS: LegalSection[] = [
  {
    heading: 'Identificación y objeto',
    body: (
      <>
        <p>
          Este sitio y el servicio Plati son titularidad de{' '}
          <strong>[RAZÓN SOCIAL, S.L.]</strong>, NIF <strong>[NIF]</strong>,
          domicilio en <strong>[DOMICILIO]</strong>, contacto{' '}
          <a href="mailto:hola@plati.es">hola@plati.es</a>.
        </p>
        <p>
          Estos términos regulan el acceso y uso del sitio <strong>plati.es</strong>{' '}
          y de la plataforma que conecta empresas, empleados y caterings para el
          beneficio de comida en el trabajo. El uso del servicio por parte de
          empresas y caterings se rige, además, por el contrato de servicio
          firmado entre las partes, que prevalece sobre estos términos en caso de
          conflicto.
        </p>
      </>
    ),
  },
  {
    heading: 'Cuentas y acceso',
    body: (
      <p>
        Para usar la plataforma debes crear una cuenta con datos veraces y
        mantener la confidencialidad de tus credenciales. Eres responsable de la
        actividad realizada bajo tu cuenta. Podemos suspender el acceso ante un
        uso indebido, fraudulento o contrario a estos términos.
      </p>
    ),
  },
  {
    heading: 'Planes, precios y pago',
    body: (
      <>
        <p>
          Los planes y precios vigentes se publican en{' '}
          <a href="/precios">la página de precios</a>. Salvo indicación en
          contrario, la facturación es <strong>mensual por empleado activo</strong>{' '}
          (aquel que ha realizado al menos un pedido en el mes), sin cuota de alta
          ni permanencia más allá del mes en curso.
        </p>
        <p>
          Los importes no incluyen impuestos indirectos, que se aplicarán cuando
          correspondan. Las estimaciones fiscales del sitio (calculadora,
          referencias al Art. 42.3 LIRPF) son orientativas y no constituyen
          asesoramiento fiscal.
        </p>
      </>
    ),
  },
  {
    heading: 'Obligaciones de uso',
    body: (
      <p>
        Te comprometes a usar el sitio y el servicio conforme a la ley y a estos
        términos, sin interferir en su funcionamiento, sin acceder a áreas no
        autorizadas y sin vulnerar derechos de terceros. El contenido y las marcas
        del sitio pertenecen a Plati o a sus licenciantes.
      </p>
    ),
  },
  {
    heading: 'Disponibilidad y responsabilidad',
    body: (
      <p>
        Trabajamos para mantener el servicio disponible y seguro, pero no
        garantizamos ausencia total de interrupciones. En la medida permitida por
        la ley, Plati no será responsable de daños indirectos o lucro cesante. Los
        niveles de servicio (SLA) aplicables, si los hay, se detallan en el
        contrato de servicio.
      </p>
    ),
  },
  {
    heading: 'Modificaciones',
    body: (
      <p>
        Podemos actualizar estos términos. Publicaremos la versión vigente con su
        fecha de actualización y, cuando el cambio sea sustancial, lo
        comunicaremos por los medios habituales.
      </p>
    ),
  },
  {
    heading: 'Ley aplicable y jurisdicción',
    body: (
      <p>
        Estos términos se rigen por la legislación española. Para la resolución de
        controversias, las partes se someten a los juzgados y tribunales de{' '}
        <strong>[CIUDAD]</strong>, salvo que la normativa de consumo establezca
        otro fuero imperativo.
      </p>
    ),
  },
]

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      updatedAt={UPDATED_AT}
      intro="Las reglas del juego para usar plati.es y la plataforma. En claro, sin sorpresas."
      sections={SECTIONS}
    />
  )
}
