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
  title: 'Verifica tu Email | Comidas',
  description: 'Revisa tu correo para verificar tu cuenta',
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const email = searchParams.email || 'tu correo'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        {/* Card con shadcn */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Verifica tu email</CardTitle>
              <CardDescription className="mt-2">
                Hemos enviado un enlace de verificación a:
              </CardDescription>
              <p className="mt-1 text-sm font-semibold text-gray-900">{email}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Instructions con shadcn Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <p className="font-semibold mb-2">Pasos siguientes:</p>
                <ol className="ml-4 list-decimal space-y-2 text-sm text-blue-800">
                  <li>Revisa tu bandeja de entrada</li>
                  <li>Haz clic en el enlace de verificación</li>
                  <li>Inicia sesión con tus credenciales</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Info */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                ¿No recibiste el email?
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-500"
              >
                Reenviar email de verificación
              </Button>
            </div>

            {/* Divider con shadcn Separator */}
            <div className="relative">
              <Separator />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                <span className="text-sm text-gray-500">O</span>
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
        <p className="mt-6 text-center text-sm text-gray-600">
          Si el problema persiste,{' '}
          <Link
            href="/contact"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            contacta con soporte
          </Link>
        </p>
      </div>
    </div>
  )
}
