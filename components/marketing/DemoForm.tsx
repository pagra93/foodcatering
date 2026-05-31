'use client'

import { useSearchParams } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import {
  submitDemoRequest,
  type DemoActionState,
} from '@/app/(landing)/demo/actions'

const initialState: DemoActionState = { success: false }

export function DemoForm() {
  const searchParams = useSearchParams()
  const defaultRole =
    searchParams.get('role') === 'catering' ? 'catering' : 'empresa'

  const [state, formAction, pending] = useActionState(
    submitDemoRequest,
    initialState,
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Solicitud enviada')
      formRef.current?.reset()
    }
  }, [state])

  if (state.success) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          ¡Gracias!
        </h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          {state.message}
        </p>
      </div>
    )
  }

  const err = state.fieldErrors ?? {}

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Nombre"
          htmlFor="name"
          error={err.name?.[0]}
          required
        >
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            aria-invalid={Boolean(err.name)}
          />
        </Field>

        <Field
          label="Email corporativo"
          htmlFor="email"
          error={err.email?.[0]}
          required
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(err.email)}
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Empresa"
          htmlFor="company"
          error={err.company?.[0]}
          required
        >
          <Input
            id="company"
            name="company"
            autoComplete="organization"
            required
            aria-invalid={Boolean(err.company)}
          />
        </Field>

        <Field
          label="Nº empleados"
          htmlFor="employees"
          error={err.employees?.[0]}
          required
        >
          <Input
            id="employees"
            name="employees"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            required
            aria-invalid={Boolean(err.employees)}
          />
        </Field>
      </div>

      <Field label="Eres" htmlFor="role" error={err.role?.[0]} required>
        <RoleRadio name="role" defaultValue={defaultRole} />
      </Field>

      <Field label="Mensaje (opcional)" htmlFor="message" error={err.message?.[0]}>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Cuéntanos brevemente qué te gustaría ver en la demo."
        />
      </Field>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <input
          id="gdprConsent"
          name="gdprConsent"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 flex-none accent-primary"
          aria-invalid={Boolean(err.gdprConsent)}
        />
        <Label
          htmlFor="gdprConsent"
          className="text-sm font-normal text-muted-foreground leading-relaxed"
        >
          Acepto que Plati trate mis datos para contactarme sobre la demo
          solicitada, según la{' '}
          <a
            href="/privacidad"
            className="font-medium text-primary hover:underline"
          >
            política de privacidad
          </a>
          .
        </Label>
      </div>
      {err.gdprConsent ? (
        <p className="text-sm text-destructive">{err.gdprConsent[0]}</p>
      ) : null}

      {state.message && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Enviando…
          </>
        ) : (
          'Reservar demo'
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Te responderemos en menos de 24 horas laborables. Sin compromiso.
      </p>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1.5 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function RoleRadio({
  name,
  defaultValue,
}: {
  name: string
  defaultValue: 'empresa' | 'catering'
}) {
  const options: Array<{ value: 'empresa' | 'catering'; label: string; hint: string }> = [
    {
      value: 'empresa',
      label: 'Empresa',
      hint: 'Quiero ofrecer el beneficio a mi plantilla',
    },
    {
      value: 'catering',
      label: 'Catering',
      hint: 'Soy operador y quiero acceder a la red',
    },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            'relative cursor-pointer rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40',
            'has-[:checked]:border-primary has-[:checked]:bg-primary/5',
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={opt.value === defaultValue}
            className="sr-only"
          />
          <span className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {opt.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {opt.hint}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-border"
            >
              <span className="hidden h-2.5 w-2.5 rounded-full bg-primary [label:has(:checked)_&]:block" />
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}
