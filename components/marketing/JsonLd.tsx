import { jsonLdScript } from '@/lib/landing/jsonld'

type Props = {
  data: unknown | unknown[]
  id?: string
}

export function JsonLd({ data, id }: Props) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLdScript(data)}
    />
  )
}
