/**
 * Página de "Verificación de Email"
 * Se muestra después del registro (si se implementa email verification)
 */

import { type Metadata } from 'next'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = {
  title: 'Verifica tu Email · Plati',
  description: 'Revisa tu correo para verificar tu cuenta',
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const email = searchParams.email || 'tu correo'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Card con shadcn */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Verifica tu email</CardTitle>
              <CardDescription className="mt-2">
                Hemos enviado un enlace de verificación a:
              </CardDescription>
              <p className="mt-1 text-sm font-semibold text-foreground">{email}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Instructions con shadcn Alert */}
            <Alert className="bg-primary/10 border-primary/30">
              <AlertDescription className="text-primary">
                <p className="font-semibold mb-2">Pasos siguientes:</p>
                <ol className="ml-4 list-decimal space-y-2 text-sm text-primary">
                  <li>Revisa tu bandeja de entrada</li>
                  <li>Haz clic en el enlace de verificación</li>
                  <li>Inicia sesión con tus credenciales</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Info */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                ¿No recibiste el email?
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
              >
                Reenviar email de verificación
              </Button>
            </div>

            {/* Divider con shadcn Separator */}
            <div className="relative">
              <Separator />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2">
                <span className="text-sm text-muted-foreground">O</span>
              </div>
            </div>

            {/* Actions con shadcn Button */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link href="/login">
                Volver al inicio de sesión
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Si el problema persiste,{' '}
          <Link
            href="/contact"
            className="font-medium text-primary hover:text-primary transition-colors"
          >
            contacta con soporte
          </Link>
        </p>
      </div>
    </div>
  )
}
