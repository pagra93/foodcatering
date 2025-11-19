import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Comida - Plataforma de Gestión de Menús Corporativos',
  description:
    'Plataforma multi-tenant para gestión de beneficios de comida entre empresas, empleados y caterings con compliance fiscal automático.',
  keywords: [
    'menús corporativos',
    'gestión comidas',
    'catering empresarial',
    'beneficio social',
  ],
  authors: [{ name: 'Comida Platform' }],
  robots: 'noindex, nofollow', // Cambiar en producción
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

