'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, ShieldAlert, Copy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  startMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
} from '@/app/cuenta/seguridad/actions'

type Stage = 'idle' | 'enrolling' | 'showingBackup'

export function MfaSettings({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [stage, setStage] = useState<Stage>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string>('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const begin = () =>
    startTransition(async () => {
      try {
        const { qrDataUrl, secret } = await startMfaEnrollment()
        setQr(qrDataUrl)
        setSecret(secret)
        setCode('')
        setStage('enrolling')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error')
      }
    })

  const confirm = () =>
    startTransition(async () => {
      try {
        const { backupCodes } = await confirmMfaEnrollment(code)
        setBackupCodes(backupCodes)
        setEnabled(true)
        setStage('showingBackup')
        toast.success('Verificación en dos pasos activada')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error')
      }
    })

  const turnOff = () =>
    startTransition(async () => {
      try {
        await disableMfa(code)
        setEnabled(false)
        setCode('')
        setStage('idle')
        toast.success('Verificación en dos pasos desactivada')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error')
      }
    })

  // Códigos de recuperación recién generados (mostrar una sola vez).
  if (stage === 'showingBackup') {
    return (
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-base font-semibold">MFA activado</h2>
        </div>
        <p className="text-sm text-gray-600">
          Guarda estos <strong>códigos de recuperación</strong> en un lugar
          seguro. Cada uno sirve una sola vez para entrar si pierdes el móvil.
          <strong> No se volverán a mostrar.</strong>
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-4 font-mono text-sm">
          {backupCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(backupCodes.join('\n'))
              toast.success('Códigos copiados')
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
          <Button size="sm" onClick={() => setStage('idle')}>
            He guardado los códigos
          </Button>
        </div>
      </Card>
    )
  }

  // Enrolamiento en curso: QR + código de confirmación.
  if (stage === 'enrolling') {
    return (
      <Card className="space-y-4 p-6">
        <h2 className="text-base font-semibold text-gray-900">
          Configura tu app de autenticación
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
          <li>Abre Google Authenticator, Authy, 1Password…</li>
          <li>Escanea este código QR (o introduce la clave a mano).</li>
          <li>Escribe el código de 6 dígitos que muestra la app.</li>
        </ol>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Código QR MFA" className="h-44 w-44 rounded border" />
        )}
        <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
          Clave manual: <span className="font-mono">{secret}</span>
        </div>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="mfa-code">Código de verificación</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="tracking-widest"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={confirm} disabled={isPending || code.length < 6}>
            Activar
          </Button>
          <Button variant="ghost" onClick={() => setStage('idle')} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </Card>
    )
  }

  // Estado base: activado (con opción de desactivar) o desactivado (con activar).
  return (
    <Card className="space-y-4 p-6">
      {enabled ? (
        <>
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-base font-semibold">
              Verificación en dos pasos activada
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Para desactivarla, introduce un código de tu app (o de recuperación).
          </p>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="mfa-off">Código de verificación</Label>
            <Input
              id="mfa-off"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="tracking-widest"
            />
          </div>
          <Button
            variant="outline"
            onClick={turnOff}
            disabled={isPending || code.length < 6}
            className="text-red-600 hover:bg-red-50"
          >
            Desactivar MFA
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-gray-500">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-base font-semibold text-gray-900">
              Verificación en dos pasos (MFA)
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Añade una capa extra de seguridad: además de tu contraseña, al entrar
            se pedirá un código temporal de tu móvil.
          </p>
          <Button onClick={begin} disabled={isPending}>
            Activar MFA
          </Button>
        </>
      )}
    </Card>
  )
}
