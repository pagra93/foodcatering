/**
 * Panel de acciones rápidas del dashboard
 */

'use client'

import Link from 'next/link'
import { Building2, ChefHat, FileText, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function QuickActionsPanel() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300">
            <Link href="/admin/empresas/new">
              <Building2 className="mr-2 h-4 w-4 text-primary" />
              Crear Empresa
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300">
            <Link href="/admin/caterings/new">
              <ChefHat className="mr-2 h-4 w-4 text-primary" />
              Crear Catering
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300">
            <Link href="/admin/operations/impersonation">
              <Users className="mr-2 h-4 w-4 text-green-600" />
              Impersonar Usuario
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300">
            <Link href="/admin/compliance/fiscal-audit">
              <FileText className="mr-2 h-4 w-4 text-orange-600" />
              Auditoría Fiscal
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

