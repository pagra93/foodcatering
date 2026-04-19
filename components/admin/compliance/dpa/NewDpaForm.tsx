'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDpaAgreementAction } from './actions'

type TenantOption = {
  id: string
  name: string
  subdomain: string
  type: 'EMPRESA' | 'CATERING'
}

export function NewDpaForm({ tenants }: { tenants: TenantOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? '')
  const [version, setVersion] = useState('1.0')
  const [pdfUrl, setPdfUrl] = useState('')
  const [signedAt, setSignedAt] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [signedByName, setSignedByName] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [effectiveTo, setEffectiveTo] = useState('')
  const [notes, setNotes] = useState('')

  const reset = () => {
    setTenantId(tenants[0]?.id ?? '')
    setVersion('1.0')
    setPdfUrl('')
    setSignedAt(new Date().toISOString().slice(0, 10))
    setSignedByName('')
    setEffectiveFrom(new Date().toISOString().slice(0, 10))
    setEffectiveTo('')
    setNotes('')
    setOpen(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createDpaAgreementAction({
          tenantId,
          version,
          pdfUrl,
          signedAt: new Date(signedAt),
          signedByName,
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
          notes: notes || undefined,
        })
        toast.success('DPA registrado')
        reset()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ Registrar DPA</Button>
      </div>
    )
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-base font-semibold">Registrar DPA firmado</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="tenantId">Tenant</Label>
            <select
              id="tenantId"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              required
            >
              <optgroup label="Empresas">
                {tenants
                  .filter((t) => t.type === 'EMPRESA')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subdomain})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Caterings">
                {tenants
                  .filter((t) => t.type === 'CATERING')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subdomain})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
          <div>
            <Label htmlFor="version">Versión</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
              placeholder="1.0 o 2026-04-19"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="pdfUrl">URL del PDF firmado</Label>
            <Input
              id="pdfUrl"
              type="url"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              required
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div>
            <Label htmlFor="signedByName">Firmado por (nombre)</Label>
            <Input
              id="signedByName"
              value={signedByName}
              onChange={(e) => setSignedByName(e.target.value)}
              required
              placeholder="Laura García (ADMIN_EMPRESA de ACME)"
            />
          </div>
          <div>
            <Label htmlFor="signedAt">Fecha de firma</Label>
            <Input
              id="signedAt"
              type="date"
              value={signedAt}
              onChange={(e) => setSignedAt(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Vigente desde</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="effectiveTo">Vigente hasta (opcional)</Label>
            <Input
              id="effectiveTo"
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              placeholder="Sin expiración si está vacío"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="ghost" onClick={reset}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
