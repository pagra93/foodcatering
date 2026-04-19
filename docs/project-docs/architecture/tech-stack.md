# Stack técnico

Las versiones están fijadas intencionalmente. Los upgrades que rompen
están aparcados en ramas dedicadas — ver "Upgrades pendientes" al final.

## Frontend

| Pieza | Versión | Por qué |
|---|---|---|
| **Next.js** | 15.5.15 | App Router maduro, Server Components estable, Server Actions GA, edge runtime. Actualizar a 16 requiere migrar Turbopack + renombrar `middleware.ts → proxy.ts` — aparcado. |
| **React** | 19 | Viene con Next 15. Hooks server/client claros. |
| **TypeScript** | 5.x estricto | `strict: true`. Todo flag activo. Build rompe si hay errores (no `ignoreBuildErrors`). |
| **Tailwind CSS** | 3.x | Configurado en `tailwind.config.ts`. `tailwind-merge` + `clsx` para clases condicionales. |
| **shadcn/ui** | última | 26 primitivos copiados a `components/ui/`. Radix UI por debajo. |
| **Radix UI** | última | Primitives accesibles sin estilo. |
| **Lucide React** | última | Set de iconos consistente. |
| **Framer Motion** | última | Animaciones en landing y transiciones de portal. |

## Formularios y validaciones

| Pieza | Versión | Por qué |
|---|---|---|
| **React Hook Form** | última | Menos re-renders que Formik. |
| **Zod** | 3.x | Validaciones compartidas entre cliente y servidor, inferencia de tipos. |
| **@hookform/resolvers** | **3.x fijado** | v5 requiere Zod 4 con breaking changes en tipos de `useForm` cuando el schema usa `.default()` o `.transform()`. Aparcado. |

## Backend / API

| Pieza | Versión | Por qué |
|---|---|---|
| **Next.js API Routes** | 15 | Para callers externos. |
| **Server Actions** | 15 | Para mutaciones desde la UI. |
| **NextAuth** | v5 (beta) | Se llama "Auth.js" en su nueva identidad. Soporte JWT + impersonación + edge split. |
| **bcryptjs** | última | Hash de contraseñas. Se importa dinámicamente en `authorize()` para que no rompa el edge runtime. |

## Base de datos

| Pieza | Versión | Por qué |
|---|---|---|
| **PostgreSQL** | 15+ | El que viene con Coolify. Soporta JSONB, RLS, partial indexes. |
| **Prisma** | **5.22.0 fijado** | ORM con buen DX, migraciones versionadas, generación de tipos. Prisma 7 mueve `datasource.url` fuera del schema → requiere `prisma.config.ts` + adapter. Aparcado. |

## Estado / data fetching

| Pieza | Versión | Por qué |
|---|---|---|
| **React Query (TanStack Query)** | 5.x | Se aprovecha en tablas con paginación cliente y filtros interactivos. La mayoría del state vive en Server Components, así que no hay global store. |
| **Zustand** | **DESINSTALADO** | Había 0 usos productivos. Quitado en 2026-04. |

## Testing

| Pieza | Versión | Por qué |
|---|---|---|
| **Vitest** | última | Rápido, compatible con ESM, jsdom. 6 suites / 51 tests verdes. |
| **@testing-library/react** | última | Tests de UI enfocados al usuario, no a la implementación. |
| **Playwright** | última | E2E. Configurado en `playwright.config.ts`, scripts en `e2e/`. |
| **MSW** | no se usa | Se prefiere mockear queries Prisma directamente. |

## Linting y formato

| Pieza | Versión | Por qué |
|---|---|---|
| **ESLint** | **8.x fijado** | v9+ exige migración a flat config. Aparcado. |
| **eslint-config-next** | 15 | Reglas recomendadas Next.js. |
| **eslint-plugin-tailwindcss** | última | Ordena clases Tailwind. |
| **Prettier** | última | Formato consistente. Prettier plugin Tailwind para ordenar clases. |

## Build y deploy

| Pieza | Versión | Por qué |
|---|---|---|
| **pnpm** | 9.x | Más rápido y menos disco que npm. Lockfile en repo. |
| **Docker** | multi-stage | Dockerfile productivo: `deps → builder → runner`. Imagen final ~250MB con Alpine. |
| **Coolify** | última | PaaS self-hosted sobre Hetzner. Detecta push a `main`, rebuild y reinicia contenedor. |
| **Hetzner Cloud** | CX31 | 2 vCPU / 8GB RAM. Aloja Coolify + PostgreSQL + la app. Backups diarios automáticos. |

## Seguridad

| Pieza | Versión | Por qué |
|---|---|---|
| **CSP headers** | custom | Content-Security-Policy restrictivo en `next.config.ts`. |
| **HSTS** | custom | HTTPS obligatorio en prod. |
| **AES-256-GCM** | Node crypto | PII cifrada (`User.nameEnc`, `phoneEnc`). `lib/crypto/pii.ts`. |
| **rate-limiter in-memory** | custom | `lib/ratelimit.ts`. Interfaz preparada para swap a Upstash Redis. |
| **audit_logs SHA-256** | Node crypto | Tamper-evident (`lib/auth/audit.ts`). |

## Observabilidad

Hoy: logs en consola y output de Coolify. No hay APM.

Pendiente (cuando haya tráfico real):
- Sentry para errores en cliente y servidor.
- Logs estructurados con pino (hoy `console.log/error/warn`).
- Grafana/Loki para dashboards de negocio.

## Versiones críticas (resumen)

```json
{
  "next": "15.5.15",
  "react": "19.x",
  "typescript": "5.x (strict)",
  "prisma": "5.22.0",              // no subir a 7
  "next-auth": "5.0.0-beta.x",
  "@hookform/resolvers": "3.x",    // no subir a 5
  "eslint": "8.x",                 // no subir a 9+
  "zod": "3.x"                     // subir junto con resolvers
}
```

## Upgrades pendientes (aparcados en ramas dedicadas)

| Upgrade | Por qué se aparcó | Esfuerzo |
|---|---|---|
| **Next 15 → 16** | Turbopack default + `middleware.ts` renombrar a `proxy.ts` + ajustes `experimental`. | 1-2 días. |
| **Prisma 5 → 7** | `datasource.url` sale del schema, va a `prisma.config.ts` con adapter explícito. Regenerar cliente. | 1-2 días. |
| **@hookform/resolvers 3 → 5 (+ Zod 4)** | Zod v4 cambia inferencia de tipos con `.default()`, `.transform()`, `.optional()`. Toca todos los forms. | 3-5 días. |
| **ESLint 8 → 10 (flat config)** | Reescribir toda la config, adaptar plugins. | 1 día. |
| **Tailwind 3 → 4** | Cierra un CVE transitivo de `yaml`. Cambios de sintaxis `@layer`, `@apply`. | 2-3 días. |

Cada uno irá a una rama `chore/upgrade-<pieza>` independiente y se
mergean de uno en uno para aislar regresiones.
