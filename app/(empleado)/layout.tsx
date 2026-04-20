/**
 * Root layout para el portal del empleado
 */

// Portal multi-tenant con datos por sesión: nunca se prerenderiza en build.
export const dynamic = 'force-dynamic'

export default function EmpleadoRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

