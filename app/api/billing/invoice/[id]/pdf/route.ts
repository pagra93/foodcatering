import { createElement } from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { InvoicePdf } from '@/lib/pdf/invoice-template'
import { apiError, apiErrorFrom, requestIdFrom } from '@/lib/api/respond'

/**
 * Descarga PDF de Invoice (factura catering → empresa).
 * Acceso: SUPER_ADMIN/AUDITOR global; ADMIN_EMPRESA/FINANZAS si es factura
 * de SU tenant; ADMIN_CATERING/FINANZAS_CATERING si es factura QUE emite.
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lines: { orderBy: { date: 'asc' } } },
    })
    if (!invoice) return apiError(404, 'Factura no encontrada')

    // Autorización
    const role = session.user.role
    const userTenant = session.user.tenantId
    const allowed =
      role === 'SUPER_ADMIN' ||
      role === 'AUDITOR' ||
      (userTenant === invoice.tenantEmpresa &&
        ['ADMIN_EMPRESA', 'RRHH', 'FINANZAS'].includes(role)) ||
      (userTenant === invoice.tenantCatering &&
        ['ADMIN_CATERING', 'FINANZAS_CATERING'].includes(role))
    if (!allowed) return apiError(403, 'No tienes acceso a este recurso')

    const [catering, empresa] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: invoice.tenantCatering },
        include: { restaurants: { select: { cif: true, billingAddress: true, legalName: true } } },
      }),
      prisma.tenant.findUnique({
        where: { id: invoice.tenantEmpresa },
        include: { companies: { select: { cif: true, billingAddress: true, legalName: true } } },
      }),
    ])

    const cateringRestaurant = catering?.restaurants[0]
    const empresaCompany = empresa?.companies[0]

    // Tipado estricto de @react-pdf/renderer 4.x exige ReactElement<DocumentProps>.
    // Nuestras funciones retornan <Document>, seguro a nivel runtime.
    const element = createElement(InvoicePdf, {
        invoice: {
          number: invoice.number,
          period: invoice.period,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal.toString(),
          taxRate: invoice.taxRate.toString(),
          taxAmount: invoice.taxAmount.toString(),
          total: invoice.total.toString(),
          notes: invoice.notes,
        },
        catering: {
          name: cateringRestaurant?.legalName ?? catering?.name ?? 'Catering',
          cif: cateringRestaurant?.cif,
          billingAddress: cateringRestaurant?.billingAddress,
        },
        empresa: {
          name: empresaCompany?.legalName ?? empresa?.name ?? 'Empresa',
          cif: empresaCompany?.cif,
          billingAddress: empresaCompany?.billingAddress,
        },
        lines: invoice.lines.map((l) => ({
          date: l.date,
          concept: l.concept,
          amount: l.amount.toString(),
        })),
      } as Parameters<typeof InvoicePdf>[0])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${invoice.number}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return apiErrorFrom(error, {
      route: 'GET /api/billing/invoice/[id]/pdf',
      requestId: requestIdFrom(req),
      fallback: 'Error al generar el PDF de la factura',
    })
  }
}
