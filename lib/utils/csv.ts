/**
 * Utilidades CSV seguras para los exports.
 */

/**
 * Celda CSV segura:
 * - entrecomilla y escapa comillas dobles;
 * - neutraliza la inyección de fórmulas (`=`, `+`, `-`, `@`, tab, CR al inicio)
 *   anteponiendo una comilla simple, que Excel/Sheets tratan como texto plano.
 *   Sin esto, un nombre de empleado como `=cmd|'/c ...'!A1` se ejecutaría al
 *   abrir el CSV en el Excel de Finanzas.
 */
export function csvCell(value: unknown): string {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/**
 * Construye el contenido CSV completo con BOM UTF-8 (para que Excel detecte
 * tildes/ñ correctamente) y todas las celdas pasadas por `csvCell`.
 */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  return (
    '﻿' +
    [
      headers.map((h) => csvCell(h)).join(','),
      ...rows.map((row) => row.map((cell) => csvCell(cell)).join(',')),
    ].join('\n')
  )
}
