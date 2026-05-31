import type { MetadataRoute } from 'next'

const baseUrl =
  process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://plati.es'

const routes: Array<{
  path: string
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]['changeFrequency']
  >
  priority: number
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/caterings', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/compliance', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/precios', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/calculadora', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/producto', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/demo', changeFrequency: 'yearly', priority: 0.7 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return routes.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
