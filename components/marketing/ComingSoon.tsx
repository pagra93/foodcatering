import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Props = {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: Props) {
  return (
    <section className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
        Próximamente
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-6xl text-balance">
        {title}
      </h1>
      {description ? (
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/demo">Solicitar demo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </section>
  )
}
