'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type MenuPublishButtonProps = {
  startDate: Date
  endDate: Date
  onSuccess?: () => void
  disabled?: boolean
  validationErrors?: string[]
}

export function MenuPublishButton({
  startDate,
  endDate,
  onSuccess,
  disabled,
  validationErrors = [],
}: MenuPublishButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const hasErrors = validationErrors.length > 0

  const handlePublish = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/catering/menus/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al publicar')
      }

      toast({
        title: 'Menús publicados',
        description: data.message,
      })

      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error publishing menus:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al publicar menús',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={disabled || hasErrors}
        className="bg-green-600 hover:bg-green-700"
      >
        <Upload className="h-4 w-4 mr-2" />
        Publicar Semana
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Publicar menús de la semana?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se publicarán los menús desde el{' '}
                  <span className="font-medium">
                    {format(startDate, "dd 'de' MMMM", { locale: es })}
                  </span>{' '}
                  hasta el{' '}
                  <span className="font-medium">
                    {format(endDate, "dd 'de' MMMM", { locale: es })}
                  </span>
                  .
                </p>

                {hasErrors ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-900 mb-2">
                      No se puede publicar:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                      {validationErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      <p className="text-sm font-medium">
                        Los empleados podrán ver y seleccionar estos menús
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={loading || hasErrors}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

