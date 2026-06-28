import type { Metadata } from 'next'
import { Archivo, Bricolage_Grotesque, DM_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { JsonLd } from '@/components/marketing/JsonLd'
import { organizationSchema, websiteSchema } from '@/lib/landing/jsonld'

// Tipografía de marca Plati (dirección «Diario»).
const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700', '800'],
  variable: '--font-display',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-mono',
})

const isProduction = process.env.NODE_ENV === 'production'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://plati.es',
  ),
  title: {
    default: 'Plati — El menú del día, en tu oficina',
    template: '%s · Plati',
  },
  description:
    'Plati conecta tu empresa con caterings locales para llevar el menú del día, cocinado hoy, a la oficina. Comer juntos es cultura — y está exento de IRPF hasta 11€/día.',
  keywords: [
    'menús corporativos',
    'comida de oficina',
    'catering local',
    'beneficio social',
    'comida cocinada hoy',
    'comer juntos en la oficina',
  ],
  authors: [{ name: 'Plati' }],
  robots: isProduction ? 'index, follow' : 'noindex, nofollow',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'Plati',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${bricolage.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <JsonLd
          id="ld-organization"
          data={[organizationSchema(), websiteSchema()]}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

