import { z } from 'zod'

export const calculatorInputSchema = z.object({
  employees: z
    .number({ invalid_type_error: 'El número de empleados debe ser un número.' })
    .int('El número de empleados debe ser entero.')
    .min(1, 'Mínimo 1 empleado.')
    .max(10000, 'Máximo 10 000 empleados en la simulación.'),
  daysUsedPerEmployee: z
    .number({ invalid_type_error: 'Los días deben ser un número.' })
    .min(1, 'Mínimo 1 día al mes.')
    .max(23, 'Máximo 23 días laborables al mes.'),
  companyContributionPerDay: z
    .number({ invalid_type_error: 'La aportación debe ser un número.' })
    .min(0.5, 'Mínimo 0,50 € por día.')
    .max(30, 'Máximo 30 € por día.'),
  employeeContributionPerDay: z
    .number({ invalid_type_error: 'La aportación debe ser un número.' })
    .min(0, 'No puede ser negativo.')
    .max(30, 'Máximo 30 € por día.'),
  marginalTaxRate: z
    .number({ invalid_type_error: 'El tipo marginal debe ser un número.' })
    .min(0.19, 'Tipo marginal mínimo 19 %.')
    .max(0.47, 'Tipo marginal máximo 47 %.'),
})

export type CalculatorInput = z.infer<typeof calculatorInputSchema>

export const demoRequestSchema = z.object({
  name: z
    .string()
    .min(2, 'Introduce tu nombre.')
    .max(100, 'Nombre demasiado largo.'),
  email: z
    .string()
    .email('Email no válido.')
    .refine((e) => {
      const personalDomains = [
        'gmail.com',
        'hotmail.com',
        'outlook.com',
        'yahoo.com',
        'icloud.com',
      ]
      const domain = e.split('@')[1]?.toLowerCase()
      return domain ? !personalDomains.includes(domain) : false
    }, 'Utiliza tu email corporativo, no uno personal.'),
  company: z
    .string()
    .min(2, 'Introduce el nombre de tu empresa.')
    .max(200, 'Nombre de empresa demasiado largo.'),
  employees: z
    .number({ invalid_type_error: 'Introduce un número válido.' })
    .int()
    .min(1)
    .max(100000),
  role: z.enum(['empresa', 'catering']),
  message: z.string().max(1000).optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el tratamiento de datos.' }),
  }),
})

export type DemoRequest = z.infer<typeof demoRequestSchema>
