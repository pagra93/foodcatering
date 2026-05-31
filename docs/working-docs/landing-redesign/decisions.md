# Landing redesign — decisiones

## Contexto
Landing actual (`app/(landing)/page.tsx`, 256 líneas inline) habla a empresas, caterings y empleados a la vez → mensajes diluidos. Ninguna subpágina, ni navbar/footer global, ni calculadora, ni compliance page. `robots: noindex, nofollow` en root layout bloquea SEO.

## Alcance v1 (aprobado por PM 2026-04-20)
- **Pack completo 7 páginas** desde día 1 (no MVP mínimo)
- `/` enfocada 100% empresa, banner final → `/caterings`
- **Calculadora IRPF interactiva** en home + página dedicada
- Tono **SaaS moderno limpio** (Linear / Stripe / Cobee)
- Optimización **SEO (Google) + GEO (LLMs)** desde día 1
- Uso de skills `impeccable:*` en momentos específicos del pipeline

## Sitemap final (7 rutas)
1. `/` — home empresa (RRHH/CFO)
2. `/caterings` — home catering
3. `/compliance` — evidencia Art. 42.3 LIRPF (gancho CFO)
4. `/precios` — tiers + comparativa
5. `/calculadora` — calculadora IRPF completa, compartible por URL
6. `/producto` — tour 3 portales con Tabs
7. `/demo` — formulario

## Decisiones visuales
- **Paleta**: reutilizar HSL vars `globals.css`. Primary `221.2 83.2% 53.3%`. Sin marca nueva.
- **Tipografía**: Inter (ya cargada via `next/font`).
- **Escala**: h1 `text-5xl md:text-7xl`, h2 `text-3xl md:text-5xl`, body `text-base md:text-lg`, `text-balance` en headlines.
- **Layout**: `py-20 md:py-28`, `container mx-auto px-4`.
- **Motion**: Framer Motion (ya instalado) solo en `AnimatedOnView`, respeta `prefers-reduced-motion`.
- **A11y**: WCAG AA.

## Decisiones técnicas
- **Arquitectura**: Server components por defecto, `'use client'` solo en calculadora, demo form, navbar mobile, AnimatedOnView.
- **Contenido separado del JSX**: `lib/landing/content.ts` con arrays tipados para facilitar mantenimiento y futura i18n.
- **GEO**: `public/llms.txt`, `public/llms-full.txt`, ruta dinámica `app/[slug]/route.ts` sirve markdown alternativo para LLMs sin JS.
- **FAQ Accordion** con contenido en DOM (no lazy) — crítico para GEO.
- **Calculadora**: client puro, sin backend. URL params compartibles con `useSearchParams` + `router.replace` debounced 300ms.

## Decisiones pendientes
- **Form demo backend**: Resend / HubSpot / tabla Prisma Lead. Recomendación v1: Resend.
- **Analítica**: Plausible / PostHog / ninguna. Recomendación: Plausible.
- **i18n**: solo ES v1 (pero estructura preparada).
- **Cookie banner**: Fase 5 si se añade tracker.

## Skills Impeccable — mapping por fase
| Fase | Skills a invocar |
|---|---|
| 0 | `teach-impeccable` (opcional, una vez) |
| 1 | `frontend-design` para cada componente, `critique` al final |
| 3 | `frontend-design` + `clarify` para calculadora |
| 4 | `normalize` + `extract` |
| 5 | `polish` + `harden` + `audit` + `adapt` |
