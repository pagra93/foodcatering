/**
 * Componente LabelTemplate
 * 
 * Template para etiquetas térmicas 100x50mm
 * Contenido: Empresa, Plato, Nombre Empleado
 * 
 * Nota: Este componente se puede usar con jsPDF o puppeteer para generar PDFs
 */

type LabelTemplateProps = {
  company: string
  site: string
  dishName: string
  dishCourse: 'FIRST' | 'SECOND' | 'DESSERT'
  employeeName: string
  logoUrl?: string | null
}

const COURSE_LABELS = {
  FIRST: 'PRIMERO',
  SECOND: 'SEGUNDO',
  DESSERT: 'POSTRE',
}

const COURSE_COLORS = {
  FIRST: '#FEF3C7', // yellow-100
  SECOND: '#DBEAFE', // blue-100
  DESSERT: '#FCE7F3', // pink-100
}

const COURSE_TEXT_COLORS = {
  FIRST: '#92400E', // yellow-800
  SECOND: '#1E40AF', // blue-800
  DESSERT: '#9F1239', // pink-800
}

const COURSE_EMOJIS = {
  FIRST: '🥘',
  SECOND: '🍗',
  DESSERT: '🍰',
}

export function LabelTemplate({
  company,
  site,
  dishName,
  dishCourse,
  employeeName,
  logoUrl,
}: LabelTemplateProps) {
  // Formato: 100mm x 50mm = 377px x 189px (72 DPI) = 946px x 472px (180 DPI para impresión)
  // Usamos 946x472 para mejor calidad de impresión

  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{
        width: '946px',
        height: '472px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header con empresa */}
      <div
        className="flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '4px solid #000' }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={company}
            style={{ height: '60px', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{company}</div>
        )}
        <div style={{ fontSize: '22px', color: '#666', textAlign: 'right' }}>
          {site}
        </div>
      </div>

      {/* Badge de tipo de plato */}
      <div
        className="mx-8 mt-6 inline-block rounded-lg px-6 py-2"
        style={{
          backgroundColor: COURSE_COLORS[dishCourse],
          color: COURSE_TEXT_COLORS[dishCourse],
          fontSize: '24px',
          fontWeight: 'bold',
        }}
      >
        {COURSE_EMOJIS[dishCourse]} {COURSE_LABELS[dishCourse]}
      </div>

      {/* Nombre del plato - Principal */}
      <div className="px-8 py-6">
        <div
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            lineHeight: '1.2',
            textTransform: 'uppercase',
            color: '#000',
          }}
        >
          {dishName}
        </div>
      </div>

      {/* Nombre del empleado */}
      <div
        className="absolute bottom-0 left-0 right-0 px-8 py-6"
        style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #d1d5db' }}
      >
        <div style={{ fontSize: '18px', color: '#666', marginBottom: '4px' }}>
          Para:
        </div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#000' }}>
          {employeeName}
        </div>
      </div>
    </div>
  )
}

/**
 * Variante para impresión (sin estilos Tailwind, CSS inline puro)
 */
export function LabelTemplatePrint({
  company,
  site,
  dishName,
  dishCourse,
  employeeName,
  logoUrl,
}: LabelTemplateProps) {
  return (
    <div
      style={{
        width: '100mm',
        height: '50mm',
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        pageBreakAfter: 'always',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '3px solid black',
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={company}
            style={{ height: '40px', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{company}</div>
        )}
        <div style={{ fontSize: '14px', color: '#666', textAlign: 'right' }}>
          {site}
        </div>
      </div>

      {/* Badge */}
      <div
        style={{
          display: 'inline-block',
          margin: '8px 12px',
          padding: '4px 12px',
          backgroundColor: COURSE_COLORS[dishCourse],
          color: COURSE_TEXT_COLORS[dishCourse],
          fontSize: '16px',
          fontWeight: 'bold',
          borderRadius: '6px',
        }}
      >
        {COURSE_EMOJIS[dishCourse]} {COURSE_LABELS[dishCourse]}
      </div>

      {/* Plato */}
      <div style={{ padding: '8px 12px' }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            lineHeight: '1.2',
            textTransform: 'uppercase',
          }}
        >
          {dishName}
        </div>
      </div>

      {/* Empleado */}
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '8px 12px',
          backgroundColor: '#f3f4f6',
          borderTop: '2px solid #d1d5db',
        }}
      >
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
          Para:
        </div>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
          {employeeName}
        </div>
      </div>
    </div>
  )
}

