# Lessons Learned — comidas-plataforma

Lecciones destiladas del diagnóstico 2026-04 y los 8 sprints de estabilización.
Consultar al empezar sesión; añadir nuevas con `/learned`.

## Patterns to Follow

### Diagnóstico
- **Antes de diagnosticar un proyecto Next.js, correr `pnpm type-check` sin el flag `ignoreBuildErrors`.** El build productivo tapa drift schema↔código. Lo que se ve con `next build` puede estar escondiendo cientos de errores reales.
- **Grep Prisma queries contra `prisma/schema.prisma`** para detectar drift: `grep -rE "prisma\.[a-z]+\.[a-z]+" --include="*.ts"` y cruzar con los modelos del schema.
- **Preguntar al usuario si comparten pantalla/screenshot** el `.env` antes de considerarlo limpio, aunque esté en `.gitignore`.

### Código
- **El schema Prisma es la fuente de verdad.** Si una query usa un campo que no existe, el arreglo es leer el schema y alinear — nunca inventar campos o hacer `as any`.
- **Al ampliar el schema**, ejecutar `pnpm prisma generate` de inmediato para que los tipos TS propaguen al IDE y el type-check detecte callers rotos.
- **Server Components por defecto; cliente solo cuando haga falta interactividad.** Mutaciones → Server Actions. `fetch('/api/...')` desde el cliente solo si el endpoint existe para terceros (mobile, integraciones).

### Multi-tenancy
- **Nunca confiar en headers del cliente para `tenantId`.** Siempre `session.user.tenantId` (o `getScopedTenantId(req)` si se quiere permitir impersonación de super admin). Los headers son manipulables y pueden bypasear el aislamiento.
- **Test de hash de auditoría:** verificar que dos llamadas con los mismos args producen hashes DISTINTOS (el timestamp entra al hash). Si salen iguales, el algoritmo no está protegiendo contra replays.

### Entornos
- **Separar dev/prod con usuarios Postgres distintos + GRANT estricto.** Password separada no basta: un copy-paste malo la pega. Con GRANT estricto, el error se corta en Postgres con "permission denied" en lugar de ejecutar un UPDATE silencioso en la BD equivocada.
- **Guardia por nombre de BD en scripts destructivos.** Leer el nombre del `DATABASE_URL` con `sed` y abortar si contiene `prod`. Complementa al `NODE_ENV=production`.
- **Backups automáticos con retención.** 30 días es un buen default. Se borran los viejos con `find -mtime +30 -delete`.

### Deploys
- **Migrations aditivas son seguras, destructivas necesitan 2 pasos.** ADD COLUMN es idempotente y seguro. DROP COLUMN o RENAME requiere una release intermedia que marque la columna deprecated.
- **`prisma migrate deploy` en el entrypoint del contenedor.** No hace falta operar prod manualmente; cada push aplica automáticamente las migraciones pendientes.

## Mistakes to Avoid

### Code quality
- **No ignorar errores de TS "temporalmente" con `ignoreBuildErrors:true`.** Se quedan meses, se acumulan cientos, destapar duele. El pull diario es destapar inmediatamente.
- **No escribir código contra un schema imaginado.** Siempre leer `schema.prisma` primero antes de escribir una query nueva.
- **No hacer `as any` para "que compile".** Es una bomba que estalla después. Mejor arreglar el tipo de verdad, aunque lleve 10 minutos más.
- **No stubear features rotas con `throw new Error('...')` esperando volver.** O reescribes bien, o borras. Nunca dejes limbo "temporal" que se queda para siempre.

### Operaciones
- **No usar `prisma db push --accept-data-loss` en producción.** Está diseñado para ser destructivo. En prod solo `prisma migrate deploy`.
- **No apuntar `.env` de dev a la BD `postgres` por defecto** cuando comparte instancia con prod. Crear BD dedicada con nombre explícito (`comidas_dev`).
- **No commitear `.env`.** Aunque esté en `.gitignore`, verificar con `git ls-files .env` y `git log --all -- .env` al auditar.
- **No ejecutar `pnpm db:seed` contra prod.** Nunca. El seed es para dev.
- **No amendar commits ya pusheados** sin permiso explícito del usuario. Mejor un commit nuevo que reescribir historia.

### Upgrades
- **Los upgrades mayores de Prisma, Next, hookform/resolvers, eslint van en rama propia.** Aplicados directos a main rompen la base sin previo aviso.
- **`@vitejs/plugin-react 6` requiere Vite 8**, que a su vez requiere Vitest 3+. Si el upgrade de plugin falla con errores `ERR_PACKAGE_PATH_NOT_EXPORTED`, rollback.
- **Next 16 trae Turbopack por defecto + rename `middleware.ts` → `proxy.ts`.** No es un minor, es un major disfrazado. Migrar en branch.

## Por qué estas lecciones (contexto)

Durante el diagnóstico 2026-04 se descubrió que el proyecto había acumulado:
- 600+ errores de TS ocultos por `ignoreBuildErrors:true` durante meses.
- 5 rutas API con cross-tenant bypass (headers manipulables).
- 16 CVEs (1 crítico en Next.js).
- 3 archivos zombi escritos contra un schema imaginario.
- Migraciones Prisma en formato no estándar que caían a `db push --accept-data-loss`.
- `.env` del laptop apuntando a una BD de otro proyecto (mezclando datos).

Todo eso pasó por no seguir los patrones de arriba. Cerramos todo en 8 sprints pero las heridas son caras. Mantener la disciplina evita repetirlo.
