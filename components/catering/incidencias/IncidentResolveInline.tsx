'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResolveIncidentDialog } from './ResolveIncidentDialog'

type IncidentProp = React.ComponentProps<typeof ResolveIncidentDialog>['incident']

/** Botón + modal de resolver, con estado propio (para páginas de detalle). */
export function IncidentResolveInline({ incident }: { incident: IncidentProp }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <MessageCircle className="mr-2 h-4 w-4" />
        Responder incidencia
      </Button>
      <ResolveIncidentDialog
        incident={incident}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
