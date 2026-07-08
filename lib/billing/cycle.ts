/**
 * Lógica del ciclo de cobro SaaS (F3).
 *
 * Un plan anual (YEARLY) se factura UNA vez al año, en el mes de aniversario del
 * alta de la suscripción (`subscriptionStartedAt`). El resto de meses no se
 * emite factura para esa empresa.
 */

/** Mes 0-based de un periodo "YYYY-MM". */
export function periodMonthIndex(period: string): number {
  return parseInt(period.slice(5, 7), 10) - 1
}

/**
 * ¿Toca facturar un plan ANUAL en este periodo? True si el mes del periodo
 * coincide con el mes de aniversario del alta (comparado en UTC).
 */
export function isAnnualBillingDue(
  period: string,
  subscriptionStartedAt: Date | null | undefined
): boolean {
  if (!subscriptionStartedAt) return false
  return subscriptionStartedAt.getUTCMonth() === periodMonthIndex(period)
}
