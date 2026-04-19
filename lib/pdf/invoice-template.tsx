/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Templates PDF comunes para facturas (catering→empresa), liquidaciones
 * (catering→SinTupper) y facturas SaaS (SinTupper→empresa).
 *
 * React-PDF: se renderizan en servidor con renderToBuffer.
 */

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1f2937',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1f2937',
    textAlign: 'right',
  },
  docNumber: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 2,
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  parties: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  partyBlock: { flex: 1, paddingRight: 20 },
  partyLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 3,
  },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  partyDetail: { fontSize: 9, color: '#4b5563' },
  table: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  th: { fontSize: 9, fontWeight: 700, color: '#374151' },
  td: { fontSize: 9, color: '#111827' },
  totalsBox: {
    marginTop: 16,
    marginLeft: 'auto',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#111827',
    paddingTop: 6,
    marginTop: 4,
  },
  totalGrandLabel: { fontSize: 11, fontWeight: 700 },
  totalGrandValue: { fontSize: 13, fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
})

function formatEuro(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount
  return `${n.toFixed(2).replace('.', ',')} €`
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ─── InvoicePdf (catering → empresa) ─────────────────────────────────

export type InvoicePdfProps = {
  invoice: {
    number: string
    period: string
    issueDate: Date
    dueDate: Date
    subtotal: string | number
    taxRate: string | number
    taxAmount: string | number
    total: string | number
    notes?: string | null
  }
  catering: { name: string; cif?: string; billingAddress?: string }
  empresa: { name: string; cif?: string; billingAddress?: string }
  lines: Array<{
    date: Date
    concept: string
    amount: string | number
  }>
}

export function InvoicePdf({ invoice, catering, empresa, lines }: InvoicePdfProps): ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{catering.name}</Text>
            <Text style={styles.partyDetail}>via SinTupper</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>FACTURA</Text>
            <Text style={styles.docNumber}>Nº {invoice.number}</Text>
            <Text style={styles.docNumber}>Período {invoice.period}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Emisor</Text>
            <Text style={styles.partyName}>{catering.name}</Text>
            {catering.cif && <Text style={styles.partyDetail}>CIF: {catering.cif}</Text>}
            {catering.billingAddress && (
              <Text style={styles.partyDetail}>{catering.billingAddress}</Text>
            )}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Cliente</Text>
            <Text style={styles.partyName}>{empresa.name}</Text>
            {empresa.cif && <Text style={styles.partyDetail}>CIF: {empresa.cif}</Text>}
            {empresa.billingAddress && (
              <Text style={styles.partyDetail}>{empresa.billingAddress}</Text>
            )}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.partyDetail}>Fecha emisión: {formatDate(invoice.issueDate)}</Text>
          <Text style={styles.partyDetail}>Vencimiento: {formatDate(invoice.dueDate)}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '18%' }]}>Fecha</Text>
            <Text style={[styles.th, { width: '62%' }]}>Concepto</Text>
            <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Importe</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.td, { width: '18%' }]}>{formatDate(l.date)}</Text>
              <Text style={[styles.td, { width: '62%' }]}>{l.concept}</Text>
              <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>
                {formatEuro(l.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatEuro(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA ({Number(invoice.taxRate).toFixed(0)}%)</Text>
            <Text>{formatEuro(invoice.taxAmount)}</Text>
          </View>
          <View style={styles.totalGrand}>
            <Text style={styles.totalGrandLabel}>TOTAL</Text>
            <Text style={styles.totalGrandValue}>{formatEuro(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.partyDetail}>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Factura generada por la plataforma SinTupper · Cumple con los
          requisitos de facturación electrónica españoles (Art. 164 LIVA).
        </Text>
      </Page>
    </Document>
  )
}

// ─── SettlementPdf (catering → SinTupper) ────────────────────────────

export type SettlementPdfProps = {
  settlement: {
    period: string
    grossAmount: string | number
    commissionRate: string | number
    commissionAmount: string | number
    penalties: string | number
    netOwed: string | number
    issuedAt: Date | null
    dueBy: Date | null
    notes?: string | null
  }
  catering: { name: string; cif?: string }
}

export function SettlementPdf({ settlement, catering }: SettlementPdfProps): ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>SinTupper</Text>
            <Text style={styles.partyDetail}>Plataforma SaaS</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>LIQUIDACIÓN DE COMISIÓN</Text>
            <Text style={styles.docNumber}>Período {settlement.period}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Emisor</Text>
            <Text style={styles.partyName}>SinTupper</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Catering liquidado</Text>
            <Text style={styles.partyName}>{catering.name}</Text>
            {catering.cif && <Text style={styles.partyDetail}>CIF: {catering.cif}</Text>}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.partyDetail}>
            Emisión: {formatDate(settlement.issuedAt)}
          </Text>
          <Text style={styles.partyDetail}>
            Vencimiento: {formatDate(settlement.dueBy)}
          </Text>
        </View>

        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Cálculo</Text>
          <View style={styles.totalRow}>
            <Text>Bruto facturado por el catering</Text>
            <Text>{formatEuro(settlement.grossAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>
              Comisión SinTupper ({(Number(settlement.commissionRate) * 100).toFixed(2)}%)
            </Text>
            <Text>{formatEuro(settlement.commissionAmount)}</Text>
          </View>
          {Number(settlement.penalties) > 0 && (
            <View style={styles.totalRow}>
              <Text>− Penalizaciones aplicadas</Text>
              <Text>-{formatEuro(settlement.penalties)}</Text>
            </View>
          )}
          <View style={styles.totalGrand}>
            <Text style={styles.totalGrandLabel}>NETO A TRANSFERIR</Text>
            <Text style={styles.totalGrandValue}>{formatEuro(settlement.netOwed)}</Text>
          </View>
        </View>

        {settlement.notes && (
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.partyDetail}>{settlement.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Documento generado automáticamente por la plataforma SinTupper.
          Transfiere el neto a la cuenta bancaria facilitada y marca la
          liquidación como pagada en /catering/facturacion.
        </Text>
      </Page>
    </Document>
  )
}

// ─── SaasInvoicePdf (SinTupper → empresa) ────────────────────────────

export type SaasInvoicePdfProps = {
  invoice: {
    number: string
    period: string
    planName: string
    subtotal: string | number
    taxRate: string | number
    taxAmount: string | number
    total: string | number
    issuedAt: Date | null
    dueBy: Date | null
  }
  empresa: { name: string; cif?: string; billingAddress?: string }
}

export function SaasInvoicePdf({ invoice, empresa }: SaasInvoicePdfProps): ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>SinTupper</Text>
            <Text style={styles.partyDetail}>Plataforma SaaS</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>FACTURA SaaS</Text>
            <Text style={styles.docNumber}>Nº {invoice.number}</Text>
            <Text style={styles.docNumber}>Período {invoice.period}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Emisor</Text>
            <Text style={styles.partyName}>SinTupper</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Cliente</Text>
            <Text style={styles.partyName}>{empresa.name}</Text>
            {empresa.cif && <Text style={styles.partyDetail}>CIF: {empresa.cif}</Text>}
            {empresa.billingAddress && (
              <Text style={styles.partyDetail}>{empresa.billingAddress}</Text>
            )}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.partyDetail}>Fecha emisión: {formatDate(invoice.issuedAt)}</Text>
          <Text style={styles.partyDetail}>Vencimiento: {formatDate(invoice.dueBy)}</Text>
        </View>

        <View style={[styles.table, { marginTop: 16 }]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '80%' }]}>Concepto</Text>
            <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Importe</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.td, { width: '80%' }]}>
              Plan {invoice.planName} · Suscripción mensual {invoice.period}
            </Text>
            <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>
              {formatEuro(invoice.subtotal)}
            </Text>
          </View>
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatEuro(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA ({Number(invoice.taxRate).toFixed(0)}%)</Text>
            <Text>{formatEuro(invoice.taxAmount)}</Text>
          </View>
          <View style={styles.totalGrand}>
            <Text style={styles.totalGrandLabel}>TOTAL</Text>
            <Text style={styles.totalGrandValue}>{formatEuro(invoice.total)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Factura SaaS emitida por SinTupper a {empresa.name}. La factura por
          los pedidos del catering es un documento aparte, emitido por el
          propio catering.
        </Text>
      </Page>
    </Document>
  )
}
