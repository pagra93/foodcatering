/**
 * Historial e integridad de pedidos (L11).
 *
 * Cada cambio relevante de un pedido (alta, edición, cancelación, entrega)
 * queda versionado en `OrderHistory` con un hash de integridad real. El hash
 * del pedido (`Order.integrityHash`) es un SHA-256 del contenido canónico del
 * pedido; el de cada fila de historial encadena ese hash con el diff, de modo
 * que cualquier manipulación posterior sea detectable.
 */

import { createHash } from 'node:crypto'
import { Prisma, type ChangeReason } from '@prisma/client'

/** Serializa un valor a JSON con claves ordenadas → salida determinista. */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined || typeof value !== 'object') {
    return JSON.stringify(value ?? null)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
    .join(',')}}`
}

/** Campos del pedido que definen su contenido (excluye timestamps y el id). */
export type OrderContent = {
  tenantEmpresa: string
  tenantCatering: string
  employeeId: string
  siteId: string
  serviceDate: Date
  selection: Prisma.JsonValue
  price: Prisma.Decimal | number | string
  menuType: string
  status: string
  version: number
}

/** SHA-256 del contenido canónico del pedido (integridad real, no aleatoria). */
export function computeOrderIntegrityHash(order: OrderContent): string {
  const content = canonicalize({
    tenantEmpresa: order.tenantEmpresa,
    tenantCatering: order.tenantCatering,
    employeeId: order.employeeId,
    siteId: order.siteId,
    serviceDate: order.serviceDate.toISOString().slice(0, 10),
    selection: order.selection,
    price: String(order.price),
    menuType: order.menuType,
    status: order.status,
    version: order.version,
  })
  return createHash('sha256').update(content).digest('hex')
}

type RecordHistoryParams = {
  orderId: string
  version: number
  changedBy: string
  changeReason: ChangeReason
  prevValues?: Prisma.InputJsonValue | null
  newValues: Prisma.InputJsonValue
}

/**
 * Escribe una fila de `OrderHistory` dentro de una transacción. `orderHash` es
 * el `integrityHash` del pedido tras el cambio; se encadena con el diff para
 * que el historial sea a prueba de manipulación.
 */
export async function recordOrderHistory(
  tx: Prisma.TransactionClient,
  params: RecordHistoryParams,
  orderHash: string
): Promise<void> {
  const content = canonicalize({
    orderId: params.orderId,
    version: params.version,
    changedBy: params.changedBy,
    changeReason: params.changeReason,
    prevValues: params.prevValues ?? null,
    newValues: params.newValues,
    orderHash,
  })
  const integrityHash = createHash('sha256').update(content).digest('hex')

  await tx.orderHistory.create({
    data: {
      orderId: params.orderId,
      version: params.version,
      changedBy: params.changedBy,
      changeReason: params.changeReason,
      prevValues:
        params.prevValues == null ? Prisma.DbNull : params.prevValues,
      newValues: params.newValues,
      integrityHash,
    },
  })
}
