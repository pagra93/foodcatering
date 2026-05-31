import { Wrench } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getActiveMaintenanceWindow } from '@/lib/db/queries/admin-operations'

export default async function MaintenancePage() {
  const active = await getActiveMaintenanceWindow()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-lg rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yema-soft">
          <Wrench className="h-6 w-6 text-tinta" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Estamos en mantenimiento
        </h1>
        {active ? (
          <>
            <p className="mt-3 text-base text-foreground">{active.message}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Ventana programada hasta el{' '}
              <strong>
                {format(active.endsAt, "d 'de' MMMM 'a las' HH:mm", {
                  locale: es,
                })}
              </strong>
              .
            </p>
          </>
        ) : (
          <p className="mt-3 text-base text-foreground">
            La plataforma volverá a estar disponible en breve.
          </p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Si este mensaje persiste tras el horario indicado, escríbenos a
          soporte@plati.es.
        </p>
      </div>
    </div>
  )
}
