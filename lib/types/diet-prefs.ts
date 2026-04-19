import { z } from 'zod'

export const dietPrefsSchema = z
  .object({
    allergies: z.array(z.string()).default([]),
    restrictions: z.array(z.string()).default([]),
    preferences: z.array(z.string()).default([]),
    blockAllergensEnabled: z.boolean().default(false),
  })
  .default({})

export type DietPrefs = z.infer<typeof dietPrefsSchema>

export function parseDietPrefs(raw: unknown): DietPrefs {
  return dietPrefsSchema.parse(raw ?? {})
}
