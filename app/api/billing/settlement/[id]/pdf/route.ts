import { createElement } from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { SettlementPdf } from '@/lib/pdf/invoice-template'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

/**
 * PDF de liquidación Settlement (catering → Plati).
 * SUPER_ADMIN/AUDITOR globales; ADMIN_CATERING/FINANZAS_CATERING de su tenant.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return apiError(401, 'No autenticado')
    }

    const settlement = await prisma.settlement.findUnique({ where: { id } })
    if (!settlement) return apiError(404, 'Liquidación no encontrada')

    const role = session.user.role
    const userTenant = session.user.tenantId
    const allowed =
      role === 'SUPER_ADMIN' ||
      role === 'AUDITOR' ||
      (userTenant === settlement.tenantCatering &&
        ['ADMIN_CATERING', 'FINANZAS_CATERING'].includes(role))
    if (!allowed) return apiError(403, 'No tienes acceso a este recurso')

    const catering = await prisma.tenant.findUnique({
      where: { id: settlement.tenantCatering },
      include: { restaurants: { select: { cif: true, legalName: true } } },
    })

    const element = createElement(SettlementPdf, {
        settlement: {
          period: settlement.period,
          grossAmount: settlement.grossAmount.toString(),
          commissionRate: settlement.commissionRate.toString(),
          commissionAmount: settlement.commissionAmount.toString(),
          penalties: settlement.penalties.toString(),
          netOwed: settlement.netOwed.toString(),
          issuedAt: settlement.issuedAt,
          dueBy: settlement.dueBy,
          notes: settlement.notes,
        },
        catering: {
          name: catering?.restaurants[0]?.legalName ?? catering?.name ?? 'Catering',
          cif: catering?.restaurants[0]?.cif,
        },
      } as Parameters<typeof SettlementPdf>[0])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="liquidacion-${settlement.period}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/billing/settlement/[id]/pdf',
      requestId: requestIdFrom(req),
      fallback: 'Error al generar el PDF de la liquidación',
    })
  }
}
