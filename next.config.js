/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Output mode para Docker
  output: 'standalone',
  
  // Experimental features
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Imagen optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.sintupper.com',
      },
    ],
  },

  // Headers de seguridad
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    // CSP básica: self + inline para styles (Tailwind/shadcn necesita inline en dev).
    // En prod se puede endurecer con nonces a futuro.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (isProd ? '' : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'" + (isProd ? '' : ' ws: wss:'),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isProd ? ['upgrade-insecure-requests'] : []),
    ].join('; ')

    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: csp },
    ]

    if (isProd) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }

    return [{ source: '/(.*)', headers: securityHeaders }]
  },

  // Webpack config
  webpack: (config, { isServer }) => {
    // Optimizaciones
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },

}

export default nextConfig

