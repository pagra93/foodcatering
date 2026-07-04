import { z } from 'zod'

export const announcementSeverityEnum = z.enum(['INFO', 'WARNING', 'CRITICAL'])
export const announcementAudienceEnum = z.enum([
  'ALL',
  'EMPRESA',
  'CATERING',
  'EMPLEADO',
])

export const upsertAnnouncementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, 'El título es obligatorio').max(200),
  body: z.string().min(3, 'El cuerpo es obligatorio').max(2000),
  severity: announcementSeverityEnum.default('INFO'),
  audience: announcementAudienceEnum.default('ALL'),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  dismissible: z.boolean().default(true),
  active: z.boolean().default(true),
})

export type UpsertAnnouncementInput = z.infer<typeof upsertAnnouncementSchema>
