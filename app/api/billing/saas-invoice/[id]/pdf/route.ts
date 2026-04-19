import { createElement } from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { SaasInvoicePdf } from '@/lib/pdf/invoice-template'

/**
 * PDF de factura SaaS (SinTupper → empresa).
 * SUPER_ADMIN/AUDITOR; ADMIN_EMPRESA/FINANZAS de su tenant.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invoice = await prisma.saasInvoice.findUnique({ where: { id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = session.user.role
  const userTenant = session.user.tenantId
  const allowed =
    role === 'SUPER_ADMIN' ||
    role === 'AUDITOR' ||
    (userTenant === invoice.tenantEmpresa &&
      ['ADMIN_EMPRESA', 'FINANZAS'].includes(role))
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const empresa = await prisma.tenant.findUnique({
    where: { id: invoice.tenantEmpresa },
    include: { companies: { select: { cif: true, billingAddress: true, legalName: true } } },
  })

  const element = createElement(SaasInvoicePdf, {
      invoice: {
        number: invoice.number,
        period: invoice.period,
        planName: invoice.planName,
        subtotal: invoice.subtotal.toString(),
        taxRate: invoice.taxRate.toString(),
        taxAmount: invoice.taxAmount.toString(),
        total: invoice.total.toString(),
        issuedAt: invoice.issuedAt,
        dueBy: invoice.dueBy,
      },
      empresa: {
        name: empresa?.companies[0]?.legalName ?? empresa?.name ?? 'Empresa',
        cif: empresa?.companies[0]?.cif,
        billingAddress: empresa?.companies[0]?.billingAddress,
      },
    } as Parameters<typeof SaasInvoicePdf>[0])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
