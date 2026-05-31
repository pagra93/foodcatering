import { PlatiSymbol } from '@/components/marketing/PlatiLogo'

const SIDE_NAV = ['Hoy', 'Menú semanal', 'Pedidos', 'Facturas', 'Ajustes']

const STATS = [
  { num: '86', label: 'menús hoy' },
  { num: '4', label: 'empresas' },
  { num: '1.892 €', label: 'a facturar' },
]

const COOK = [
  { name: 'Crema de calabaza', pct: 72, q: 38 },
  { name: 'Pollo al curry', pct: 55, q: 29 },
  { name: 'Lasaña vegetal', pct: 36, q: 19 },
]

/**
 * Mockup presentacional del panel del catering (sin datos reales). Recreación
 * del dashboard de `Imagen de Marca/Plati - Web Caterings.html`.
 */
export function CateringDashboardMock() {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border/70 bg-card shadow-plati-2">
      {/* Barra de navegador */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-hueso-warm px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-tinta/15" />
        <span className="h-3 w-3 rounded-full bg-tinta/15" />
        <span className="h-3 w-3 rounded-full bg-tinta/15" />
        <span className="ml-3 font-mono text-[13px] text-muted-foreground">
          panel.plati.es/casa-lola
        </span>
      </div>

      <div className="grid md:grid-cols-[200px_1fr]">
        {/* Sidebar oscuro */}
        <aside className="hidden flex-col gap-1 bg-tinta p-5 md:flex">
          <div className="mb-6 flex items-center gap-2">
            <PlatiSymbol tone="hueso" className="h-6 w-6" />
            <span className="font-display text-[18px] font-extrabold text-hueso">
              Plati
            </span>
          </div>
          {SIDE_NAV.map((item, i) => (
            <span
              key={item}
              className={
                i === 0
                  ? 'rounded-md bg-hueso/10 px-3 py-2 text-sm font-semibold text-hueso'
                  : 'rounded-md px-3 py-2 text-sm text-hueso/60'
              }
            >
              {item}
            </span>
          ))}
        </aside>

        {/* Contenido */}
        <main className="p-6 md:p-8">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
                Pedido de hoy
              </h3>
              <span className="text-sm text-muted-foreground">
                Viernes, 31 enero
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-hierba-soft px-3 py-1 text-[11.5px] font-bold text-hierba-700">
              ● En vivo
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="rounded-[10px] border border-border/70 p-4"
              >
                <div
                  className={
                    i === 0
                      ? 'plati-tnum font-display text-3xl font-extrabold text-tomate'
                      : 'plati-tnum font-display text-3xl font-extrabold'
                  }
                >
                  {s.num}
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[10px] border border-border/70 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              A cocinar · por plato
            </div>
            <div className="mt-4 space-y-4">
              {COOK.map((c) => (
                <div key={c.name} className="flex items-center gap-4">
                  <span className="w-40 flex-none text-sm font-medium">
                    {c.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-pill bg-muted">
                    <div
                      className="h-full rounded-pill bg-tomate"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                  <span className="plati-tnum w-8 flex-none text-right font-display font-extrabold">
                    {c.q}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
