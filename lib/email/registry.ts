/**
 * Registro de plantillas de email para el panel de admin.
 *
 * La fuente de verdad de cada email son las funciones de `templates.ts`. Este
 * registro solo añade metadatos (id, nombre, descripción) y una MUESTRA con
 * datos de ejemplo, para que el admin pueda listar, previsualizar y enviarse un
 * test sin tocar código. No persiste nada (las plantillas viven en el código).
 *
 * Módulo puro (no importa el cliente de Resend) → seguro en cliente y servidor.
 */

import type { EmailContent } from '@/lib/email/templates'
import {
  passwordResetEmail,
  welcomeEmail,
  employeeInvitationEmail,
  invoiceIssuedEmail,
  incidentReportedEmail,
  genericNotificationEmail,
} from '@/lib/email/templates'

// Base de ejemplo para los enlaces de la previsualización (no se envía a nadie).
const SAMPLE_BASE = 'https://www.plati.es'

export type EmailTemplateMeta = {
  id: string
  name: string
  description: string
  /** Cuándo se envía / estado de cableado, informativo para el admin. */
  trigger: string
}

/** Metadatos de las plantillas (para la lista del admin). */
export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    id: 'password-reset',
    name: 'Restablecer contraseña',
    description: 'Enlace de un solo uso para fijar una nueva contraseña.',
    trigger: 'Activo · "Olvidé mi contraseña" y reset desde el panel',
  },
  {
    id: 'welcome',
    name: 'Bienvenida',
    description: 'Se envía al crear una cuenta nueva.',
    trigger: 'Plantilla lista · pendiente de cablear al alta de usuario',
  },
  {
    id: 'employee-invitation',
    name: 'Invitación de empleado',
    description: 'Invita a un empleado a unirse a su empresa.',
    trigger: 'Plantilla lista · pendiente de cablear a las invitaciones',
  },
  {
    id: 'invoice-issued',
    name: 'Factura emitida',
    description: 'Avisa de una nueva factura con importe y vencimiento.',
    trigger: 'Plantilla lista · pendiente de cablear a facturación',
  },
  {
    id: 'incident-reported',
    name: 'Incidencia registrada',
    description: 'Avisa de una incidencia abierta en un pedido.',
    trigger: 'Plantilla lista · pendiente de cablear a incidencias',
  },
  {
    id: 'generic-notification',
    name: 'Notificación genérica',
    description: 'Aviso flexible (título + mensaje + botón opcional).',
    trigger: 'Reutilizable para avisos varios',
  },
]

/** Renderiza la MUESTRA (datos de ejemplo) de una plantilla por su id. */
export function renderSampleEmail(id: string): EmailContent | null {
  switch (id) {
    case 'password-reset':
      return passwordResetEmail({
        resetUrl: `${SAMPLE_BASE}/reset-password?token=ejemplo-token`,
        name: 'María López',
        expiresMinutes: 60,
      })
    case 'welcome':
      return welcomeEmail({ name: 'María López', loginUrl: `${SAMPLE_BASE}/login` })
    case 'employee-invitation':
      return employeeInvitationEmail({
        name: 'María López',
        companyName: 'Grupo Cuerva',
        inviteUrl: `${SAMPLE_BASE}/verify?token=ejemplo-invitacion`,
        expiresDays: 7,
      })
    case 'invoice-issued':
      return invoiceIssuedEmail({
        number: 'FAC-2026-0142',
        period: 'Julio 2026',
        amount: 1234.56,
        dueDate: '31/07/2026',
        url: `${SAMPLE_BASE}/catering/facturacion`,
      })
    case 'incident-reported':
      return incidentReportedEmail({
        orderRef: 'PED-8842',
        description: 'Faltaba el postre en 3 de los 20 menús entregados.',
        url: `${SAMPLE_BASE}/catering/calidad`,
      })
    case 'generic-notification':
      return genericNotificationEmail({
        title: 'Aviso de ejemplo',
        message:
          'Este es un ejemplo de notificación genérica. Sirve para cualquier aviso puntual que no tenga plantilla propia.',
        ctaLabel: 'Ver detalle',
        ctaUrl: `${SAMPLE_BASE}/`,
      })
    default:
      return null
  }
}
