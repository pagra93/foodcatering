import type { MetadataRoute } from 'next'

const baseUrl =
  process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://plati.es'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Permitido por defecto a todos los user-agents, incluyendo
        // LLM crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot,
        // ClaudeBot, Google-Extended, anthropic-ai, Bingbot, etc.).
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/empresa/',
          '/empleado/',
          '/catering/',
          '/auth/',
          '/login',
          '/reset-password',
          '/verify',
          '/forgot-password',
          '/unauthorized',
          '/error',
          '/mantenimiento',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
