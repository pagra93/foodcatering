/**
 * Configuración del Empleado
 * Solo cambio de contraseña (simple)
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type ProfileSettingsProps = {
  employeeId: string
}

export function ProfileSettings({ employeeId: _employeeId }: ProfileSettingsProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validar contraseña
  const passwordValidations = {
    length: newPassword.length >= 8,
    hasNumber: /\d/.test(newPassword),
    hasLetter: /[a-zA-Z]/.test(newPassword),
  }

  const isPasswordValid =
    passwordValidations.length &&
    passwordValidations.hasNumber &&
    passwordValidations.hasLetter

  const canSubmit =
    currentPassword.length > 0 &&
    isPasswordValid &&
    newPassword === confirmPassword

  const handleChangePassword = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/empleado/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al cambiar la contraseña')
      }

      toast.success('Contraseña actualizada correctamente')

      // Resetear formulario
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar la contraseña')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cambiar contraseña */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Cambiar Contraseña
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Actualiza tu contraseña de acceso
            </p>
          </div>
          {!isChangingPassword && (
            <Button onClick={() => setIsChangingPassword(true)}>
              Cambiar
            </Button>
          )}
        </div>

        {isChangingPassword && (
          <div className="space-y-4 mt-6">
            {/* Contraseña actual */}
            <div>
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Introduce tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Introduce tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Validaciones */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div
                    className={`flex items-center gap-2 text-xs ${
                      passwordValidations.length
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {passwordValidations.length ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    Mínimo 8 caracteres
                  </div>
                  <div
                    className={`flex items-center gap-2 text-xs ${
                      passwordValidations.hasNumber
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {passwordValidations.hasNumber ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    Contiene números
                  </div>
                  <div
                    className={`flex items-center gap-2 text-xs ${
                      passwordValidations.hasLetter
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {passwordValidations.hasLetter ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    Contiene letras
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                className="mt-1"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">
                  Las contraseñas no coinciden
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleChangePassword}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsChangingPassword(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Información adicional */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Seguridad:</strong> Tu contraseña se almacena de forma segura
          utilizando encriptación. Nunca compartas tu contraseña con nadie.
        </p>
      </Card>
    </div>
  )
}

