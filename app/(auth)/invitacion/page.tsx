/**
 * Página de "Aceptar invitación" (F1)
 * Se accede desde el enlace del email de invitación (con token). El empleado
 * fija su contraseña y activa su acceso. Reutiliza el patrón de reset-password.
 */

import { type Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const metadata: Metadata = {
  title: 'Aceptar invitación · Plati',
  description: 'Crea tu contraseña y activa tu cuenta',
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string }
}) {
  const token = searchParams.token
  const error = searchParams.error

  // Sin token no hay nada que aceptar → al login.
  if (!token) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Activa tu cuenta</CardTitle>
              <CardDescription className="mt-2">
                Te han invitado a Plati. Crea tu contraseña para entrar.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form
              action="/api/auth/aceptar-invitacion"
              method="POST"
              className="space-y-5"
            >
              <Input type="hidden" name="token" value={token} />

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres, incluye una mayúscula y un número
                </p>
              </div>

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

              <Button type="submit" className="w-full" size="lg">
                Activar mi cuenta
              </Button>
            </form>
          </CardContent>
        </Card>

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
