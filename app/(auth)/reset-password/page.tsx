/**
 * Página de "Restablecer contraseña"
 * Se accede desde el enlace del email (con token)
 */

import { type Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | Comidas',
  description: 'Crea una nueva contraseña para tu cuenta',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token

  // Si no hay token, redirigir a forgot-password
  if (!token) {
    redirect('/forgot-password')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        {/* Card con shadcn */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Crear nueva contraseña</CardTitle>
              <CardDescription className="mt-2">
                Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {/* Form con shadcn */}
            <form action="/api/auth/reset-password" method="POST" className="space-y-5">
              {/* Hidden token */}
              <Input type="hidden" name="token" value={token} />

              {/* Nueva contraseña con shadcn Input + Label */}
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500">
                  Mínimo 8 caracteres, incluye mayúsculas y números
                </p>
              </div>

              {/* Confirmar contraseña con shadcn Input + Label */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>

              {/* Submit Button con shadcn Button */}
              <Button type="submit" className="w-full" size="lg">
                Restablecer contraseña
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
