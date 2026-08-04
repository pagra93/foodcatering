/**
 * Validación de variables de entorno con Zod
 * Falla rápido al inicio si falta algo crítico
 */

import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Tenant
  WILDCARD_DOMAIN: z.string().startsWith('.'),

  // Cifrado PII (32 bytes hex = 64 chars). Opcional hasta Sprint 4.
  PII_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'PII_ENCRYPTION_KEY debe ser 64 chars hex (32 bytes)')
    .optional(),

  // Feature Flags
  FEATURE_AI_NUTRITION: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  FEATURE_AUTO_SELECTION: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  FEATURE_GAMIFICATION: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Límites del Sistema
  DEFAULT_DAILY_LIMIT: z
    .string()
    .transform((val) => parseFloat(val))
    .default('11.00'),
  DEFAULT_CUTOFF_TIME: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:mm')
    .default('11:00'),
  DEFAULT_TAX_RATE_FOOD: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10'),
  DEFAULT_TAX_RATE_SERVICE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('21'),

  // Cron Jobs
  ENABLE_CRON_JOBS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Secreto de los endpoints /api/cron/* (los invoca el cron del host).
  // Sin él, los endpoints responden 503 y ningún job puede ejecutarse.
  CRON_SECRET: z.string().min(16).optional(),

  // Observabilidad (opt-in): DSN de Sentry para errores de servidor.
  SENTRY_DSN: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  // Node
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

type Env = z.infer<typeof envSchema>

// Validar solo en el servidor (no en el cliente/browser)
let env: Env

// En el servidor, validar todas las variables
if (typeof window === 'undefined') {
  try {
    env = envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Variables de entorno inválidas:')
    if (error instanceof z.ZodError) {
      console.error(error.errors)
    }
    throw new Error('Configuración de entorno inválida')
  }
} else {
  // En el cliente, crear un objeto vacío (no se usa)
  env = {} as Env
}

export { env }

