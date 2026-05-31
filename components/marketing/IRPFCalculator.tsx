'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Info,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebounce } from '@/hooks/use-debounce'
import {
  DEFAULT_CALCULATOR_INPUT,
  DEFAULT_MARGINAL_RATE,
  IRPF_LIMIT_PER_DAY,
  type IrpfCalculatorInput,
  calculateIrpfSavings,
  decodeCalculatorUrlParams,
  encodeCalculatorUrlParams,
} from '@/lib/landing/irpf'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = {
  variant?: 'compact' | 'full'
  className?: string
  /** Si true, sincroniza con la URL; usar solo en /calculadora. */
  syncWithUrl?: boolean
  id?: string
}

export function IRPFCalculator({
  variant = 'compact',
  className,
  syncWithUrl = false,
  id,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduced = useReducedMotion()

  // Estado inicial: defaults + overrides desde URL si aplica
  const [input, setInput] = useState<IrpfCalculatorInput>(() => {
    if (!syncWithUrl) return DEFAULT_CALCULATOR_INPUT
    const fromUrl = decodeCalculatorUrlParams(searchParams)
    return { ...DEFAULT_CALCULATOR_INPUT, ...fromUrl }
  })

  const debouncedInput = useDebounce(input, 300)

  // Sincroniza URL cuando los inputs cambian (sólo en /calculadora)
  useEffect(() => {
    if (!syncWithUrl) return
    const params = encodeCalculatorUrlParams(debouncedInput)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [debouncedInput, router, syncWithUrl])

  const result = useMemo(() => calculateIrpfSavings(input), [input])

  const update = <K extends keyof IrpfCalculatorInput>(
    key: K,
    value: IrpfCalculatorInput[K],
  ) => {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  const [copied, setCopied] = useState(false)
  const copyShareLink = async () => {
    if (typeof window === 'undefined') return
    const params = encodeCalculatorUrlParams(input)
    const url = `${window.location.origin}/calculadora?${params.toString()}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // noop
    }
  }

  const showFull = variant === 'full'

  return (
    <section
      id={id}
      className={cn(
        'mx-auto w-full overflow-hidden rounded-3xl border border-border bg-card',
        'shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.25)]',
        className,
      )}
      aria-labelledby="irpf-calc-heading"
    >
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        <div className="border-b border-border p-6 md:p-10 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Calculadora Art. 42.3 LIRPF
            </span>
          </div>
          <h2
            id="irpf-calc-heading"
            className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl text-balance"
          >
            ¿Cuánto puedes ahorrar con comida como beneficio en especie?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base text-pretty">
            Ajusta los valores y verás en tiempo real el coste anual para la
            empresa y el ahorro fiscal estimado para tus empleados.
          </p>

          <div className="mt-8 space-y-6">
            <Field
              id="calc-employees"
              label="Número de empleados"
              hint="Empleados que usarán el beneficio."
            >
              <Input
                id="calc-employees"
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                value={input.employees}
                onChange={(e) =>
                  update('employees', Number(e.target.value) || 0)
                }
              />
            </Field>

            <Field
              id="calc-days"
              label="Días de uso por empleado al mes"
              hint="Días laborables que se espera que cada empleado use el beneficio."
            >
              <Input
                id="calc-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={23}
                value={input.daysUsedPerEmployee}
                onChange={(e) =>
                  update('daysUsedPerEmployee', Number(e.target.value) || 0)
                }
              />
            </Field>

            <Field
              id="calc-copay-e"
              label="Aportación empresa por día (€)"
              hint={`El Art. 42.3 LIRPF exime hasta ${IRPF_LIMIT_PER_DAY}€/día. El exceso tributa.`}
            >
              <Input
                id="calc-copay-e"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0.5}
                max={30}
                value={input.companyContributionPerDay}
                onChange={(e) =>
                  update(
                    'companyContributionPerDay',
                    Number(e.target.value) || 0,
                  )
                }
              />
            </Field>

            {showFull ? (
              <>
                <Field
                  id="calc-copay-w"
                  label="Aportación empleado por día (€)"
                  hint="Copay que paga el empleado (normalmente por nómina)."
                >
                  <Input
                    id="calc-copay-w"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    max={30}
                    value={input.employeeContributionPerDay}
                    onChange={(e) =>
                      update(
                        'employeeContributionPerDay',
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </Field>

                <Field
                  id="calc-tmi"
                  label={`Tipo marginal IRPF medio (${Math.round(
                    input.marginalTaxRate * 100,
                  )}%)`}
                  hint="Tipo marginal estimado de los empleados. Ajusta al perfil salarial real."
                >
                  <input
                    id="calc-tmi"
                    type="range"
                    min={19}
                    max={47}
                    step={1}
                    value={Math.round(input.marginalTaxRate * 100)}
                    onChange={(e) =>
                      update('marginalTaxRate', Number(e.target.value) / 100)
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                    aria-valuemin={19}
                    aria-valuemax={47}
                    aria-valuenow={Math.round(input.marginalTaxRate * 100)}
                    aria-valuetext={`${Math.round(
                      input.marginalTaxRate * 100,
                    )}%`}
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>19%</span>
                    <span>Media España ~30%</span>
                    <span>47%</span>
                  </div>
                </Field>
              </>
            ) : null}
          </div>

          {result.exceedsIrpfLimit ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 flex-none text-warning"
                aria-hidden="true"
              />
              <p className="text-muted-foreground leading-relaxed">
                Superas el límite del Art. 42.3 en{' '}
                <strong className="text-foreground">
                  {formatPrice(result.excessPerDay)}
                </strong>
                /día. El exceso tributa como rendimiento en especie.
              </p>
            </div>
          ) : null}
        </div>

        <div className="relative bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10">
          <div className="flex flex-col gap-6">
            <Result
              label="Ahorro fiscal anual estimado (empleados)"
              value={result.annualEmployeeTaxSaving}
              highlight
              reduced={reduced ?? false}
            />
            <Result
              label="Coste anual para la empresa"
              value={result.annualCompanyCost}
              reduced={reduced ?? false}
            />
            <Result
              label="Coste mensual para la empresa"
              value={result.monthlyCompanyCost}
              reduced={reduced ?? false}
            />
            <Result
              label="Gasto medio por empleado al mes"
              value={result.avgMonthlyPerEmployee}
              reduced={reduced ?? false}
            />
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link
                href={
                  showFull
                    ? `/demo?${encodeCalculatorUrlParams(input).toString()}`
                    : '/demo'
                }
              >
                Solicitar propuesta con este caso
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            {showFull ? (
              <Button
                type="button"
                variant="outline"
                onClick={copyShareLink}
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                    Copiar enlace
                  </>
                )}
              </Button>
            ) : (
              <Button asChild variant="outline" className="flex-1">
                <Link href="/calculadora">Ver calculadora completa</Link>
              </Button>
            )}
          </div>

          <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
            <span>
              Estimación orientativa basada en Art. 42.3 LIRPF (límite{' '}
              {IRPF_LIMIT_PER_DAY}€/día laborable). Asume 11 meses efectivos de
              uso. No constituye asesoramiento fiscal; consulta con tu asesor.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
      {hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function Result({
  label,
  value,
  highlight = false,
  reduced,
}: {
  label: string
  value: number
  highlight?: boolean
  reduced: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-background/80 p-5 backdrop-blur-sm',
        highlight && 'border-primary/40 bg-primary/5',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <motion.p
        key={value}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'mt-2 font-semibold tracking-tight tabular-nums',
          highlight
            ? 'text-3xl text-primary md:text-4xl'
            : 'text-2xl text-foreground md:text-3xl',
        )}
      >
        {formatPrice(value)}
      </motion.p>
    </div>
  )
}

// Default export accidental-safe
IRPFCalculator.displayName = 'IRPFCalculator'

// Re-export defaults for convenience from non-compact variant
export { DEFAULT_CALCULATOR_INPUT, DEFAULT_MARGINAL_RATE }
