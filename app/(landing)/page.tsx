import Link from 'next/link'
import { ArrowRight, CheckCircle2, Shield, TrendingUp, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-lg font-bold text-white">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Comidas</span>
          </div>
          
          <nav className="hidden gap-6 md:flex">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Características
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Cómo funciona
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Precios
            </Link>
          </nav>

          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Acceder
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">
            Gestión de Menús Corporativos
            <br />
            <span className="text-blue-600">Simple. Compliant. Eficiente.</span>
          </h1>
          
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            La plataforma definitiva para gestionar el beneficio de comida diaria entre empresas, 
            empleados y caterings. Con compliance fiscal automático (exención IRPF España).
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
            >
              Empezar ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Ver demo
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span>Cumplimiento RGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Exención IRPF ≤11€/día</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>Multi-tenant seguro</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Todo lo que necesitas para gestionar menús corporativos
            </h2>
            <p className="text-lg text-gray-600">
              Una única plataforma para empresas, empleados y caterings
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Para Empresas
              </h3>
              <p className="text-gray-600">
                Gestiona empleados, políticas de copago, exporta a tu ERP y descarga facturas mensuales con trazabilidad completa.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Para Caterings
              </h3>
              <p className="text-gray-600">
                Recibe pedidos consolidados, gestiona producción con hojas de cocina y marca entregas en tiempo real.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Para Empleados
              </h3>
              <p className="text-gray-600">
                Elige tus platos semanalmente, cancela hasta las 11:00 y consulta tu historial de consumo en segundos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Cómo funciona
            </h2>
            <p className="text-lg text-gray-600">
              Simple, automático y con cumplimiento fiscal garantizado
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                1
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  El empleado selecciona
                </h3>
                <p className="text-gray-600">
                  Elige sus platos para la semana (lunes-jueves). Todo queda registrado con límite de 11€/día.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                2
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  Cierre automático a las 11:00
                </h3>
                <p className="text-gray-600">
                  El sistema consolida pedidos y genera hojas de cocina y empaquetado para el catering.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                3
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  Entrega y trazabilidad
                </h3>
                <p className="text-gray-600">
                  El catering entrega entre 12:00-13:30 y marca cada pedido como entregado. Todo queda auditado.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                4
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  Facturación mensual automática
                </h3>
                <p className="text-gray-600">
                  Genera facturas, CSV para ERP y archivo de copagos para nómina. Todo listo para Hacienda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            ¿Listo para simplificar tu gestión de menús?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Únete a empresas que ya confían en nuestra plataforma
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            Empezar gratis
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>© 2025 Comidas Platform. Todos los derechos reservados.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-gray-900">
              Términos
            </Link>
            <Link href="/contact" className="hover:text-gray-900">
              Contacto
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

