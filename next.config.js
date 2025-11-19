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
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
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

  // Deshabilitar linting durante el build (temporalmente)
  // TODO: Corregir errores de ESLint y habilitar de nuevo
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permitir errores de TypeScript durante el build (temporalmente)
    // TODO: Corregir errores de TypeScript y habilitar de nuevo
    ignoreBuildErrors: true,
  },
}

export default nextConfig

