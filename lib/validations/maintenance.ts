import { z } from 'zod'

export const scheduleMaintenanceSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    reason: z.string().min(5).max(200),
    message: z.string().min(10).max(1000),
    allowedRoles: z.array(z.string()).default(['SUPER_ADMIN']),
  })
  .refine((d) => d.endsAt.getTime() > d.startsAt.getTime(), {
    message: 'endsAt debe ser posterior a startsAt',
    path: ['endsAt'],
  })

export const cancelMaintenanceSchema = z.object({
  id: z.string().uuid(),
})
