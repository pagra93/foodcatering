# Migraciones parked (no aplicadas aún)

Aquí viven migraciones preparadas pero que **no deben ejecutarse todavía**.
Prisma no las ve porque están fuera de `prisma/migrations/`, así que
`prisma migrate deploy` las ignora.

## Contenido actual

### `20260419000000_enable_rls_multi_tenant/`

Activa Row Level Security en todas las tablas multi-tenant. Requiere que
las queries críticas de la app usen el wrapper `withTenantContext` de
`lib/db/prisma.ts` (setea las variables de sesión `app.tenant_id` y
`app.role` que las policies consumen). Si se aplica antes de migrar las
queries, las policies bloquean TODAS las filas y la app devuelve
"vacío" en todas partes.

**Para activarla en el futuro**:

1. Migrar progresivamente las queries multi-tenant a `withTenantContext`
   (empezar por las más críticas: orders, employees, invoices).
2. Verificar con tests E2E de aislamiento tenant.
3. Mover la migración de vuelta: `mv prisma/migrations-parked/20260419000000_enable_rls_multi_tenant prisma/migrations/`.
4. Commit + push → Coolify aplica automáticamente via `migrate deploy`.

Antes de moverla de vuelta, aplicarla primero en `comidas_dev` para probar.
