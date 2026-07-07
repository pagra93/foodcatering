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

/**
 * Estado de cada plantilla:
 * - 'active'  → cableada: el sistema la envía sola en su evento.
 * - 'pending' → el diseño existe (se puede previsualizar/probar) pero AÚN no se
 *               dispara sola en ningún evento (falta cablearla).
 * - 'manual'  → utilidad reutilizable, sin un evento fijo.
 */
export type EmailTemplateStatus = 'active' | 'pending' | 'manual'

export type EmailTemplateMeta = {
  id: string
  name: string
  description: string
  status: EmailTemplateStatus
  /** Cuándo se envía / dónde está cableada, informativo para el admin. */
  trigger: string
}

/** Metadatos de las plantillas (para la lista del admin). */
export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    id: 'password-reset',
    name: 'Restablecer contraseña',
    description: 'Enlace de un solo uso para fijar una nueva contraseña.',
    status: 'active',
    trigger: '"Olvidé mi contraseña" y reset de contraseña desde el panel.',
  },
  {
    id: 'welcome',
    name: 'Bienvenida',
    description: 'Se envía al crear una cuenta nueva.',
    status: 'active',
    trigger: 'Alta de usuario en admin, empresa y catering.',
  },
  {
    id: 'employee-invitation',
    name: 'Invitación de empleado',
    description: 'Invita a un empleado a unirse a su empresa.',
    status: 'pending',
    trigger:
      'Bloqueada: falta la página de aceptación de invitación (consumir el token y fijar contraseña). El diseño está listo.',
  },
  {
    id: 'invoice-issued',
    name: 'Factura emitida',
    description: 'Avisa de una nueva factura con importe y vencimiento.',
    status: 'active',
    trigger:
      'Al marcar una factura como "enviada". Va al email de contacto de la empresa.',
  },
  {
    id: 'incident-reported',
    name: 'Incidencia registrada',
    description: 'Avisa de una incidencia abierta en un pedido.',
    status: 'active',
    trigger:
      'Al reportar una incidencia de entrega. Va al email de contacto de la empresa.',
  },
  {
    id: 'generic-notification',
    name: 'Notificación genérica',
    description: 'Aviso flexible (título + mensaje + botón opcional).',
    status: 'manual',
    trigger: 'Utilidad reutilizable para avisos puntuales.',
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
