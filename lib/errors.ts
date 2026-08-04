/**
 * Error de DOMINIO: su mensaje está pensado para el usuario final (validación
 * de negocio: cutoff pasado, límite superado, período ya facturado…).
 *
 * Contrato con la capa HTTP (lib/api/respond.ts#apiErrorFrom):
 * - `DomainError` → se devuelve su `status` + su `message` tal cual.
 * - Cualquier otro `Error` → 500 con mensaje genérico + log estructurado
 *   (nunca se filtra `error.message` interno de Prisma/infra al cliente).
 *
 * Módulo puro (sin dependencias de servidor): importable desde cualquier capa.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409 = 400
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}
