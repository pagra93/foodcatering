import type { LucideIcon } from 'lucide-react'

export type Feature = {
  id: string
  icon: LucideIcon
  title: string
  description: string
}

export type Step = {
  id: string
  number: number
  title: string
  description: string
}

export type TrustBadge = {
  id: string
  icon: LucideIcon
  label: string
}

export type ValueMetric = {
  id: string
  value: string
  label: string
  sublabel?: string
}

export type PricingTier = {
  id: string
  name: string
  priceMonthly: number | 'custom'
  currency: 'EUR'
  unit: string
  highlight?: boolean
  description: string
  features: string[]
  ctaLabel: string
  ctaHref: string
}

export type ComparisonRow = {
  feature: string
  plati: boolean | string
  cobee: boolean | string
  edenred: boolean | string
  ticketkey: boolean | string
}

export type FAQ = {
  id: string
  question: string
  answer: string
}

export type ComplianceEvidencePiece = {
  id: string
  icon: LucideIcon
  title: string
  description: string
}

export type Screenshot = {
  id: string
  src: string
  alt: string
  role: 'empresa' | 'empleado' | 'catering'
  caption?: string
}

export type CTAConfig = {
  label: string
  href: string
}
