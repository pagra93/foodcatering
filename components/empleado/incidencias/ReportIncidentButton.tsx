'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Plus } from 'lucide-react'
import { ReportIncidentDialog } from './ReportIncidentDialog'

type Order = {
  id: string
  serviceDate: Date
  selection: any
  price: number
  status: string
}

type ReportIncidentButtonProps = {
  orders: Order[]
}

export function ReportIncidentButton({ orders }: ReportIncidentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (orders.length === 0) {
    return (
      <Button variant="outline" disabled>
        <AlertCircle className="h-4 w-4 mr-2" />
        No hay pedidos recientes
      </Button>
    )
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Reportar Incidencia
      </Button>

      <ReportIncidentDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        orders={orders}
      />
    </>
  )
}

