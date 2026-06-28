# Documentación del Proyecto — Plati (comidas-plataforma)

> Esta carpeta es la **referencia completa para humanos**: explica qué hace
> el proyecto, cómo está construido y cómo operarlo. Cuando vuelvas tras una
> pausa, empieza aquí.
>
> Para la referencia ágil que siempre lee Claude (concisa, no narrativa),
> ver [`docs/general/PROJECT_KNOWLEDGE.md`](../PROJECT_KNOWLEDGE.md).

Última actualización: 2026-04-18

---

## Cómo leer esta documentación

Hay tres formas de usar estos documentos:

1. **Te acabas de incorporar / vuelves tras meses**: lee en orden
   `overview/` → `architecture/` → el portal que te interese en `features/`.
2. **Buscas algo operativo** (cómo desplegar, cómo hacer backup): ve a
   `guides/` y a [`../despliegue/RUNBOOK.md`](../despliegue/RUNBOOK.md).
3. **Buscas un detalle técnico** (una tabla, un endpoint, un hook): usa
   `architecture/data-model.md`, `api/` y [`../project-registry.md`](../project-registry.md).

---

## Estructura

```
docs/general/exportable/
├── index.md                         Este archivo
├── overview/
│   ├── what-it-does.md              Qué hace, para quién, por qué existe
│   ├── users.md                     Los 4 tipos de usuario y sus jobs
│   └── business-model.md            Modelo de negocio y compliance fiscal IRPF
├── architecture/
│   ├── overview.md                  Diagrama y capas de la arquitectura
│   ├── tech-stack.md                Stack completo (versiones, decisiones)
│   ├── multi-tenant.md              Cómo funciona la aislación entre tenants
│   ├── data-model.md                Los 35 modelos Prisma explicados
│   ├── auth.md                      Autenticación, sesiones, RBAC, impersonación
│   ├── folder-structure.md          Mapa del repositorio
│   └── security.md                  Capas de seguridad (PII, RLS, rate limit, audit)
├── features/
│   ├── _index.md                    Índice por portal + feature
│   ├── portal-admin.md              Portal Súper Admin (16 páginas)
│   ├── portal-empresa.md            Portal Empresa (11 páginas)
│   ├── portal-catering.md           Portal Catering (14 páginas)
│   └── portal-empleado.md           Portal Empleado (5 páginas)
├── api/
│   ├── _index.md                    Índice de los 67 endpoints
│   ├── admin.md                     Endpoints de /api/admin/*
│   ├── catering.md                  Endpoints de /api/catering/*
│   ├── empresa.md                   Endpoints de /api/empresa/*
│   └── empleado.md                  Endpoints de /api/empleado/*
├── guides/
│   ├── development.md               Arrancar en local, comandos habituales
│   ├── deployment.md                Flujo dev → prod, CI/CD
│   ├── testing.md                   Vitest (unit) + Playwright (E2E)
│   └── troubleshooting.md           Problemas frecuentes y sus soluciones
└── changelog.md                     Historial de cambios relevantes
```

---

## Referencias rápidas

| Pregunta | Documento |
|---|---|
| ¿Qué hace el proyecto? | [overview/what-it-does.md](./overview/what-it-does.md) |
| ¿Quién lo usa? | [overview/users.md](./overview/users.md) |
| ¿Cómo está construido? | [architecture/overview.md](./architecture/overview.md) |
| ¿Qué tablas hay en la BD? | [architecture/data-model.md](./architecture/data-model.md) |
| ¿Cómo funciona el login? | [architecture/auth.md](./architecture/auth.md) |
| ¿Cómo arranco el proyecto en local? | [guides/development.md](./guides/development.md) |
| ¿Cómo despliego a producción? | [guides/deployment.md](./guides/deployment.md) + [RUNBOOK](../despliegue/RUNBOOK.md) |
| ¿Qué hace la página X? | [features/portal-*.md](./features/_index.md) |
| ¿Qué devuelve el endpoint Y? | [api/_index.md](./api/_index.md) |

---

## Estado del proyecto (resumen)

- **Stack**: Next.js 15 · React 19 · TypeScript estricto · Prisma 5 · PostgreSQL · NextAuth v5 · Tailwind · shadcn/ui.
- **Portales**: 4 (Súper Admin · Empresa · Catering · Empleado) + landing pública.
- **Modelos Prisma**: 35, 28 enums. Multi-tenant vía `tenantId` (+ doble en tablas que cruzan).
- **Endpoints API**: 67.
- **Páginas**: 56 (95% Server Components).
- **Componentes**: 180+ (26 primitivos shadcn + 154 de dominio).
- **Tests**: 6 suites Vitest con 51 unit tests. Playwright E2E configurado.
- **Entornos**: `comidas_dev` (Hetzner remoto) para desarrollo, `comidas_prod` (Coolify) para producción.
- **Estado funcional**: 75–90% según portal. Base técnica estabilizada (0 errores TS/lint, 0 CVEs críticos).
