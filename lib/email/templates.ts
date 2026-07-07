/**
 * Plantillas de email (HTML + texto plano). Layout base reutilizable para que
 * todos los correos de Plati tengan el mismo aspecto. Añade aquí nuevas
 * plantillas conforme se necesiten más emails.
 */

const BRAND = 'Plati'
const ACCENT = '#4f46e5'

/** Layout base: cabecera con marca + cuerpo + pie. Todo inline (email-safe). */
function layout(opts: { title: string; body: string; footnote?: string }): string {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:${ACCENT};padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">${BRAND}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${opts.title}</h1>
          ${opts.body}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #eef0f4;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            ${opts.footnote ?? `Este es un mensaje automático de ${BRAND}. Si no esperabas este correo, puedes ignorarlo.`}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">${label}</a>`
}

export type EmailContent = { subject: string; html: string; text: string }

/**
 * Email de restablecimiento de contraseña. `byAdmin` cambia el copy para el
 * caso en que un administrador dispara el reset desde el panel.
 */
export function passwordResetEmail(opts: {
  resetUrl: string
  name?: string | null
  byAdmin?: boolean
  expiresMinutes?: number
}): EmailContent {
  const hello = opts.name ? `Hola ${opts.name},` : 'Hola,'
  const mins = opts.expiresMinutes ?? 60
  const intro = opts.byAdmin
    ? 'Un administrador ha solicitado el restablecimiento de tu contraseña.'
    : 'Has solicitado restablecer tu contraseña.'

  const body = `
    <p style="margin:0 0 12px;font-size:14px;">${hello}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;">${intro} Pulsa el botón para crear una nueva contraseña. El enlace caduca en ${mins} minutos y solo puede usarse una vez.</p>
    <p style="margin:0 0 20px;">${button(opts.resetUrl, 'Restablecer contraseña')}</p>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">Si el botón no funciona, copia y pega esta dirección en tu navegador:<br><span style="color:${ACCENT};word-break:break-all;">${opts.resetUrl}</span></p>`

  const text = `${hello}\n\n${intro}\nAbre este enlace para crear una nueva contraseña (caduca en ${mins} minutos, un solo uso):\n${opts.resetUrl}\n\nSi no esperabas este correo, puedes ignorarlo.`

  return { subject: `Restablece tu contraseña de ${BRAND}`, html: layout({ title: 'Restablecer contraseña', body }), text }
}

/** Bienvenida al crear una cuenta. */
export function welcomeEmail(opts: {
  name?: string | null
  loginUrl: string
}): EmailContent {
  const hello = opts.name ? `Hola ${opts.name},` : 'Hola,'
  const body = `
    <p style="margin:0 0 12px;font-size:14px;">${hello}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;">Tu cuenta en ${BRAND} ya está activa. Desde tu portal podrás gestionar tu día a día según tu rol.</p>
    <p style="margin:0 0 20px;">${button(opts.loginUrl, 'Entrar en Plati')}</p>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">Si no reconoces esta cuenta, ignora este mensaje o contacta con tu administrador.</p>`
  const text = `${hello}\n\nTu cuenta en ${BRAND} ya está activa.\nEntra aquí: ${opts.loginUrl}`
  return { subject: `Bienvenido a ${BRAND}`, html: layout({ title: `Bienvenido a ${BRAND}`, body }), text }
}

/** Invitación a un empleado para unirse a un tenant. */
export function employeeInvitationEmail(opts: {
  name?: string | null
  companyName: string
  inviteUrl: string
  expiresDays?: number
}): EmailContent {
  const hello = opts.name ? `Hola ${opts.name},` : 'Hola,'
  const days = opts.expiresDays ?? 7
  const body = `
    <p style="margin:0 0 12px;font-size:14px;">${hello}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;"><strong>${opts.companyName}</strong> te ha invitado a usar ${BRAND} para gestionar tu comida diaria. Acepta la invitación para crear tu contraseña y empezar.</p>
    <p style="margin:0 0 20px;">${button(opts.inviteUrl, 'Aceptar invitación')}</p>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">La invitación caduca en ${days} días. Si el botón no funciona, copia esta dirección:<br><span style="color:${ACCENT};word-break:break-all;">${opts.inviteUrl}</span></p>`
  const text = `${hello}\n\n${opts.companyName} te ha invitado a ${BRAND}.\nAcepta la invitación (caduca en ${days} días):\n${opts.inviteUrl}`
  return { subject: `${opts.companyName} te invita a ${BRAND}`, html: layout({ title: 'Te han invitado a Plati', body }), text }
}

/** Aviso de factura emitida. */
export function invoiceIssuedEmail(opts: {
  number: string
  period: string
  amount: number
  dueDate: string
  url?: string
}): EmailContent {
  const amountStr = `${opts.amount.toFixed(2)} €`
  const cta = opts.url
    ? `<p style="margin:0 0 20px;">${button(opts.url, 'Ver factura')}</p>`
    : ''
  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Se ha emitido una nueva factura en ${BRAND}.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Número</td><td style="padding:6px 0;text-align:right;font-weight:600;">${opts.number}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Periodo</td><td style="padding:6px 0;text-align:right;">${opts.period}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Importe</td><td style="padding:6px 0;text-align:right;font-weight:600;">${amountStr}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Vencimiento</td><td style="padding:6px 0;text-align:right;">${opts.dueDate}</td></tr>
    </table>
    ${cta}`
  const text = `Nueva factura ${opts.number} (${opts.period})\nImporte: ${amountStr}\nVencimiento: ${opts.dueDate}${opts.url ? `\nVer: ${opts.url}` : ''}`
  return { subject: `Factura ${opts.number} · ${BRAND}`, html: layout({ title: 'Nueva factura emitida', body }), text }
}

/** Aviso de incidencia registrada en un pedido. */
export function incidentReportedEmail(opts: {
  orderRef: string
  description: string
  url?: string
}): EmailContent {
  const cta = opts.url
    ? `<p style="margin:0 0 20px;">${button(opts.url, 'Ver incidencia')}</p>`
    : ''
  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Se ha registrado una incidencia en el pedido <strong>${opts.orderRef}</strong>.</p>
    <p style="margin:0 0 20px;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:14px;color:#9a3412;">${opts.description}</p>
    ${cta}`
  const text = `Incidencia en el pedido ${opts.orderRef}\n${opts.description}${opts.url ? `\nVer: ${opts.url}` : ''}`
  return { subject: `Incidencia en el pedido ${opts.orderRef} · ${BRAND}`, html: layout({ title: 'Incidencia registrada', body }), text }
}

/** Notificación genérica (título + mensaje + botón opcional). Reutilizable. */
export function genericNotificationEmail(opts: {
  title: string
  message: string
  ctaLabel?: string
  ctaUrl?: string
}): EmailContent {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:0 0 20px;">${button(opts.ctaUrl, opts.ctaLabel)}</p>`
      : ''
  const body = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;">${opts.message}</p>
    ${cta}`
  const text = `${opts.title}\n\n${opts.message}${opts.ctaUrl ? `\n\n${opts.ctaUrl}` : ''}`
  return { subject: `${opts.title} · ${BRAND}`, html: layout({ title: opts.title, body }), text }
}
