import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

// Imagen Open Graph por defecto de Plati. Se sirve en /opengraph-image y la
// usan WhatsApp, LinkedIn, X, Slack, etc. al compartir cualquier enlace que no
// defina su propia OG image. Reutilizada como Twitter card (summary_large_image).
export const runtime = 'nodejs'

export const alt = 'Plati — El menú del día, cocinado hoy, en tu oficina'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Colores de marca (ver app/globals.css).
const HUESO = '#FBF6EC'
const TINTA = '#1D1813'
const TOMATE = '#E0492A'

export default function OpengraphImage() {
  const logo = readFileSync(
    join(
      process.cwd(),
      'public/brand/png/plati-logo-horizontal-transparent.png',
    ),
  )
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: HUESO,
          position: 'relative',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={560} height={213} alt="Plati" />
        <div
          style={{
            marginTop: 56,
            maxWidth: 880,
            textAlign: 'center',
            fontSize: 46,
            fontWeight: 700,
            lineHeight: 1.15,
            color: TINTA,
          }}
        >
          El menú del día, cocinado hoy, en tu oficina.
        </div>
        {/* Barra inferior tomate de marca */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 16,
            backgroundColor: TOMATE,
          }}
        />
      </div>
    ),
    { ...size },
  )
}
