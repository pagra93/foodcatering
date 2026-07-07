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
import { Alert, AlertDescription } from '@/components/ui/alert'

export const metadata: Metadata = {
  title: 'Restablecer Contraseña · Plati',
  description: 'Crea una nueva contraseña para tu cuenta',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string }
}) {
  const token = searchParams.token
  const error = searchParams.error

  // Si no hay token, redirigir a forgot-password
  if (!token) {
    redirect('/forgot-password')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Card con shadcn */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <CardTitle className="text-2xl">Crear nueva contraseña</CardTitle>
              <CardDescription className="mt-2">
                Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
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
                <p className="text-xs text-muted-foreground">
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
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary transition-colors"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
