/**
 * Sirve versiones markdown de cada página clave para LLM crawlers que no
 * ejecutan JavaScript.
 *
 * Accede en /md/compliance, /md/precios, /md/calculadora, /md/producto,
 * /md/caterings, /md/home.
 *
 * Fuente de contenido: lib/landing/content.ts (mismo source of truth que JSX).
 */

import type { NextRequest } from 'next/server'

import {
  CANONICAL_DESCRIPTION,
  cateringFeatures,
  cateringMetrics,
  companyFeatures,
  companyMetrics,
  complianceEvidence,
  faqsCatering,
  faqsCompany,
  faqsPricing,
  howItWorksCatering,
  howItWorksCompany,
  pricingTiers,
  comparisonMatrix,
} from '@/lib/landing/content'
import type { FAQ, Feature, PricingTier, Step, ValueMetric } from '@/lib/landing/types'

const baseUrl =
  process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://plati.es'

type PageKey =
  | 'home'
  | 'caterings'
  | 'compliance'
  | 'precios'
  | 'calculadora'
  | 'producto'

const CANONICAL_PATHS: Record<PageKey, string> = {
  home: '/',
  caterings: '/caterings',
  compliance: '/compliance',
  precios: '/precios',
  calculadora: '/calculadora',
  producto: '/producto',
}

function renderFeatures(features: Feature[]): string {
  return features.map((f) => `- **${f.title}** — ${f.description}`).join('\n')
}

function renderSteps(steps: Step[]): string {
  return steps
    .map((s) => `${s.number}. **${s.title}** — ${s.description}`)
    .join('\n')
}

function renderFaqs(faqs: FAQ[]): string {
  return faqs
    .map((f) => `### ${f.question}\n\n${f.answer}\n`)
    .join('\n')
}

function renderMetrics(metrics: ValueMetric[]): string {
  return metrics
    .map(
      (m) =>
        `- **${m.value}** · ${m.label}${m.sublabel ? ` (${m.sublabel})` : ''}`,
    )
    .join('\n')
}

function renderPricing(tiers: PricingTier[]): string {
  return tiers
    .map((t) => {
      const price =
        t.priceMonthly === 'custom'
          ? 'Precio a medida'
          : `${t.priceMonthly} € / ${t.unit}`
      return [
        `### ${t.name}`,
        `${t.description}`,
        `Precio: ${price}`,
        'Incluye:',
        ...t.features.map((f) => `- ${f}`),
      ].join('\n')
    })
    .join('\n\n')
}

function buildMarkdown(key: PageKey): string {
  const header = `---
title: ${titleFor(key)}
canonical: ${baseUrl}${CANONICAL_PATHS[key]}
---

`
  switch (key) {
    case 'home':
      return (
        header +
        `# Plati — Menús corporativos con compliance fiscal

> ${CANONICAL_DESCRIPTION}

## Cifras clave

${renderMetrics(companyMetrics)}

## Qué incluye

${renderFeatures(companyFeatures)}

## Cómo funciona

${renderSteps(howItWorksCompany)}

## Preguntas frecuentes

${renderFaqs(faqsCompany)}
`
      )
    case 'caterings':
      return (
        header +
        `# Plati para caterings

> Acceso a una red B2B de empresas con pedidos cerrados cada día a las 11:05.

## Cifras clave

${renderMetrics(cateringMetrics)}

## Qué incluye

${renderFeatures(cateringFeatures)}

## Cómo funciona

${renderSteps(howItWorksCatering)}

## Preguntas frecuentes

${renderFaqs(faqsCatering)}
`
      )
    case 'compliance':
      return (
        header +
        `# Compliance fiscal Art. 42.3 LIRPF

> ${CANONICAL_DESCRIPTION}

El Art. 42.3 de la Ley 35/2006 del IRPF exime las entregas en especie de comida en el puesto de trabajo hasta **11 € por día laborable y empleado**. Para aplicar la exención, Hacienda exige evidencia de que la comida se entregó efectivamente al empleado durante la jornada laboral.

## Piezas de evidencia que produce Plati

${complianceEvidence.map((c) => `- **${c.title}** — ${c.description}`).join('\n')}

## Protección de datos (RGPD)

- Cifrado AES-256-GCM de PII en reposo.
- DPA firmado como encargado de tratamiento.
- Servidores en la UE, backups cifrados y rotados diariamente.
- Auditoría de accesos a PII.
- Snapshot SHA-256 separado de los datos personales.
`
      )
    case 'precios':
      return (
        header +
        `# Precios de Plati

> Tarifa plana por empleado activo al mes. Sin setup fee. Sin permanencia.

## Planes

${renderPricing(pricingTiers)}

## Comparativa vs competidores

${comparisonMatrix
  .map(
    (row) =>
      `- **${row.feature}**: Plati=${fmt(row.plati)} · Cobee=${fmt(row.cobee)} · Edenred=${fmt(row.edenred)} · Ticket Restaurant=${fmt(row.ticketkey)}`,
  )
  .join('\n')}

## Preguntas frecuentes

${renderFaqs(faqsPricing)}
`
      )
    case 'calculadora':
      return (
        header +
        `# Calculadora de ahorro IRPF

> Estimación orientativa del ahorro fiscal anual basada en el Art. 42.3 LIRPF.

## Fórmulas

- **Coste anual de empresa** = empleados × días/mes × aportación empresa/día × 11 meses efectivos.
- **Base imponible ahorrada** = min(aportación/día, 11 €) × días/mes × 11 × empleados.
- **Ahorro fiscal del empleado** = base imponible × tipo marginal IRPF.

## Supuestos por defecto

- 11 meses efectivos al año (descontando 1 mes de vacaciones).
- Tipo marginal IRPF medio España 2024: ~30 %.
- Límite exento 11 €/día laborable (Art. 42.3 LIRPF).

## Disclaimer

Los cálculos son estimaciones orientativas. No constituyen asesoramiento fiscal. Consulta con tu asesor antes de diseñar la política.
`
      )
    case 'producto':
      return (
        header +
        `# Producto: un SaaS, tres portales

> ${CANONICAL_DESCRIPTION}

## Portal empresa (RRHH/CFO)

- Dashboard con KPIs de pedidos, gasto y adopción.
- Importador CSV con validación y preview.
- Auditoría fiscal con snapshot SHA-256 y dossier mensual.
- Conciliación pedidos ↔ factura línea por línea.
- Export CSV a SAP, Sage, A3.
- Permisos por rol: ADMIN_EMPRESA, RRHH, FINANZAS, MANAGER_SEDE.

## Portal empleado

- Selector semanal de menús con 5 días × 3 opciones.
- Alérgenos codificados por color.
- Rating post-comida y reporte de incidencias.
- Historial de gasto y plato favorito.

## Portal catering

- Kitchen Display System (KDS) con consolidación automática.
- Packing nominativo por empleado con alérgenos.
- Rutas optimizadas con Google Maps y prueba de entrega.
- Facturación mensual automática el día 1.
- Platos y menús semanales con 14 alérgenos UE.

## Integraciones

- Export CSV a SAP, Sage, A3.
- SSO SAML/OIDC (Enterprise).
- SCIM provisioning (Enterprise).
- Cifrado PII AES-256-GCM. Servidores UE.
`
      )
  }
}

function fmt(v: boolean | string): string {
  if (v === true) return 'Sí'
  if (v === false) return 'No'
  return v
}

function titleFor(key: PageKey): string {
  switch (key) {
    case 'home':
      return 'Plati — Menús corporativos con compliance fiscal'
    case 'caterings':
      return 'Plati para caterings'
    case 'compliance':
      return 'Compliance fiscal Art. 42.3 LIRPF'
    case 'precios':
      return 'Precios de Plati'
    case 'calculadora':
      return 'Calculadora de ahorro IRPF'
    case 'producto':
      return 'Producto: un SaaS, tres portales'
  }
}

function isPageKey(slug: string): slug is PageKey {
  return [
    'home',
    'caterings',
    'compliance',
    'precios',
    'calculadora',
    'producto',
  ].includes(slug)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isPageKey(slug)) {
    return new Response('Not found', { status: 404 })
  }
  const markdown = buildMarkdown(slug)
  const canonical = `${baseUrl}${CANONICAL_PATHS[slug]}`
  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      Link: `<${canonical}>; rel="canonical"`,
      'X-Robots-Tag': 'all',
    },
  })
}
