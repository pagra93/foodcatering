import { Check, Minus } from 'lucide-react'

import type { ComparisonRow } from '@/lib/landing/types'
import { cn } from '@/lib/utils'

type Props = {
  rows: ComparisonRow[]
  className?: string
}

type Column = {
  key: keyof ComparisonRow
  label: string
  highlight?: boolean
}

const columns: Column[] = [
  { key: 'feature', label: 'Funcionalidad' },
  { key: 'sintupper', label: 'Plati', highlight: true },
  { key: 'cobee', label: 'Cobee' },
  { key: 'edenred', label: 'Edenred' },
  { key: 'ticketkey', label: 'Ticket Restaurant' },
]

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-primary">
        <Check className="h-5 w-5" aria-label="Sí" />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-muted-foreground/60">
        <Minus className="h-5 w-5" aria-label="No" />
      </span>
    )
  }
  return <span className="text-sm text-foreground">{value}</span>
}

export function ComparisonTable({ rows, className }: Props) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[720px] border-collapse text-left">
        <caption className="sr-only">
          Comparativa de Plati con Cobee, Edenred y Ticket Restaurant
        </caption>
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-4 text-sm font-semibold',
                  col.highlight
                    ? 'text-primary'
                    : col.key === 'feature'
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.feature}
              className={cn(
                'border-b border-border/60',
                idx % 2 === 0 ? 'bg-background' : 'bg-muted/30',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-4',
                    col.key === 'feature'
                      ? 'text-sm font-medium text-foreground'
                      : 'text-center',
                    col.highlight && 'bg-primary/5',
                  )}
                  scope={col.key === 'feature' ? 'row' : undefined}
                >
                  {col.key === 'feature' ? (
                    (row[col.key] as string)
                  ) : (
                    <CellValue value={row[col.key]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
