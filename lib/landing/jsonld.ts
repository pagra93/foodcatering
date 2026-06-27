/**
 * JSON-LD helpers para SEO y GEO (LLMs).
 * Las funciones devuelven objetos serializables que se renderizan dentro de
 * un <script type="application/ld+json"> server-side.
 */

import type { FAQ, PricingTier, Step } from './types'

const baseUrl =
  process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://plati.es'

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Plati',
    url: baseUrl,
    logo: `${baseUrl}/brand/png/plati-logo-horizontal-transparent.png`,
    description:
      'Plataforma B2B de menús corporativos con compliance fiscal IRPF Art. 42.3.',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'hola@plati.es',
        availableLanguage: ['es'],
        areaServed: 'ES',
      },
    ],
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Plati',
    url: baseUrl,
    inLanguage: 'es-ES',
  }
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Plati',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: baseUrl,
    description:
      'Plataforma SaaS multi-tenant para gestión de menús corporativos con compliance fiscal Art. 42.3 LIRPF.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: '2.5',
      highPrice: '3',
      offerCount: 3,
    },
  }
}

export function productSchema(tiers: PricingTier[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Plati',
    description:
      'Plataforma B2B de menús corporativos con compliance fiscal IRPF.',
    brand: { '@type': 'Brand', name: 'Plati' },
    offers: tiers
      .filter((t) => typeof t.priceMonthly === 'number')
      .map((t) => ({
        '@type': 'Offer',
        name: t.name,
        price: t.priceMonthly as number,
        priceCurrency: t.currency,
        description: t.description,
        url: `${baseUrl}/precios`,
        availability: 'https://schema.org/InStock',
      })),
  }
}

export function faqSchema(faqs: FAQ[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}

export function howToSchema({
  name,
  steps,
}: {
  name: string
  steps: Step[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      position: s.number,
      name: s.title,
      text: s.description,
    })),
  }
}

export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  }
}

/**
 * Helper de renderizado. Uso en páginas:
 *   <JsonLd data={organizationSchema()} />
 */
export function jsonLdScript(
  data: unknown | unknown[],
): { __html: string } {
  const payload = Array.isArray(data) ? data : [data]
  return {
    __html: payload.map((d) => JSON.stringify(d)).join('\n'),
  }
}
