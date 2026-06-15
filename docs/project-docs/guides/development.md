# Guía de desarrollo

Cómo arrancar el proyecto en local y trabajar en él día a día.

## Requisitos

- **Node.js** 20 LTS o superior.
- **pnpm** 9.x (no uses npm ni yarn — el lockfile es `pnpm-lock.yaml`).
- Acceso a la BD `comidas_dev` en Hetzner (credenciales en `.env`).
- Git.

Opcional pero recomendado:
- **Prisma Studio** para inspeccionar la BD visualmente.
- Extensiones VS Code: Prisma, Tailwind CSS IntelliSense, ESLint, Prettier.

## Primera vez (setup)

```bash
# 1. Clonar
git clone https://github.com/pagra93/comidas.git
cd comidas

# 2. Instalar deps
pnpm install

# 3. Crear .env (copiar del ejemplo y ajustar)
cp env.example .env
#    - DATABASE_URL="postgresql://comidas_dev_user:...@5.78.124.107:5432/comidas_dev?schema=public"
#    - NEXTAUTH_SECRET="..."  (mínimo 32 chars)
#    - NEXTAUTH_URL="http://localhost:3000"
#    - WILDCARD_DOMAIN=".localhost:3000"

# 4. Generar cliente Prisma (los tipos)
pnpm db:generate

# 5. Aplicar schema a comidas_dev (primera vez o si se ha reseteado)
pnpm prisma db push
pnpm prisma migrate resolve --applied <cada migración existente>

# 6. Seed con datos de prueba
pnpm db:seed

# 7. Arrancar
pnpm dev
```

Abrir `http://localhost:3000`. Para entrar a un portal concreto:

- Landing: `http://localhost:3000/`
- Login: `http://localhost:3000/login`
- Portal admin (tras login con SUPER_ADMIN): `http://admin.localhost:3000/admin`
- Portal empresa: `http://acme.localhost:3000/empresa/dashboard`
- Portal catering: `http://deliciasexpress.localhost:3000/catering/dashboard`
- Portal empleado: `http://acme.localhost:3000/empleado/menus`

> **Nota**: los subdominios `.localhost` funcionan automáticamente en
> macOS y en la mayoría de Linux modernos. Si tu navegador no los
> resuelve, añade a `/etc/hosts`:
> `127.0.0.1 admin.localhost acme.localhost deliciasexpress.localhost`.

## Credenciales de seed (usar en dev)

| Portal | Email | Password |
|---|---|---|
| Super Admin | `admin@plati.es` | `Admin123!` |
| Empresa (RRHH ACME) | `rrhh@acme.com` | `Rrhh123!` |
| Empresa (Finanzas ACME) | `finanzas@acme.com` | `Finanzas123!` |
| Empleado | `laura.gomez@acme.com` | `Empleado123!` |
| Catering (Chef) | `chef@deliciasexpress.com` | `Chef123!` |
| Catering (Repartidor) | `reparto@deliciasexpress.com` | `Reparto123!` |

Más empleados en el seed con patrón `nombre.apellido@acme.com` /
`Empleado123!` (ver `prisma/seed.ts`).

## Comandos habituales

```bash
# Dev server
pnpm dev                  # Hot reload en :3000

# Build y producción local
pnpm build                # Build optimizado
pnpm start                # Sirve el build en :3000

# TypeScript
pnpm type-check           # Verifica tipos sin emitir

# Lint y formato
pnpm lint                 # ESLint
pnpm lint:fix             # ESLint con auto-fix
pnpm format               # Prettier

# Tests
pnpm exec vitest run      # Unit tests una pasada (CI-like)
pnpm test                 # Unit tests en watch mode
pnpm test:ui              # Vitest UI interactiva
pnpm test:e2e             # Playwright E2E

# Prisma
pnpm db:generate          # Regenerar cliente Prisma tras cambio de schema
pnpm db:migrate:dev       # Crear nueva migración en dev
pnpm db:migrate           # Aplicar migraciones pendientes (migrate deploy)
pnpm db:reset             # Reset dev completo (con guardia anti-prod)
pnpm db:studio            # Prisma Studio (GUI para la BD)
pnpm db:seed              # Ejecutar seed

# Seguridad
pnpm audit --prod         # Auditoría de CVEs
```

## Flujo de trabajo de una feature

### 1. Leer el contexto

```
docs/PROJECT_KNOWLEDGE.md   ← estado actual
tasks/todo.md                ← sprint activo
tasks/lessons.md             ← patrones/errores a evitar
docs/project-docs/           ← referencia detallada (lo que estás leyendo)
```

### 2. Si hay cambios de datos, empieza por el schema

```bash
# Editar prisma/schema.prisma (añadir/modificar modelos)
# Generar cliente con los nuevos tipos
pnpm db:generate

# Crear migración
pnpm db:migrate:dev --name add_delivery_photo_support
#    → genera prisma/migrations/YYYYMMDD_add_delivery_photo_support/migration.sql
#    → aplica al dev
```

### 3. Añadir queries en `lib/db/queries/<dominio>.ts`

Una función por operación. Siempre con filtro de tenant.

### 4. Añadir validación en `lib/validations/<dominio>.ts`

Zod schema + tipo inferido.

### 5. Implementar la página en `app/(portal)/<ruta>/page.tsx`

Server Component async. Llamar a la query. Pasar datos al componente.

### 6. Implementar componentes en `components/<portal>/<feature>/`

Client component para interactividad. Server Action en `actions.ts`
para mutaciones.

### 7. Test unitario en `tests/unit/<dominio>/`

Cubrir lógica crítica: validaciones, cálculo de precios, cutoffs, etc.

### 8. Verificar todo pasa

```bash
pnpm type-check && pnpm lint && pnpm exec vitest run && pnpm build
```

### 9. Commit y push

```bash
git add .
git commit -m "feat(catering): permitir subida de foto en DeliveryProof"
git push origin main
```

CI (`.github/workflows/ci.yml`) repite los 4 checks. Coolify detecta el
push y redeploya.

## Reglas que sigo siempre

1. **Nunca `@ts-ignore`, `as any`, `eslint-disable`** salvo justificación
   explícita con comentario.
2. **Siempre filtro por tenant** en queries sobre modelos multi-tenant.
3. **Mutaciones desde pages → Server Actions**, no `fetch('/api/...')`.
4. **Verificar `DATABASE_URL`** antes de cualquier comando que escriba.
   Si contiene `prod`, parar y pensar dos veces.
5. **No commitear `.env`** (está en `.gitignore` pero verificar:
   `git ls-files .env`).
6. **Una feature por commit** (o una unidad lógica pequeña). Evitar
   commits gigantes tipo "updates".

## Depurar queries lentas

Activar logging en `lib/db/prisma.ts`:

```ts
new PrismaClient({ log: ['query', 'error', 'warn'] })
```

Ver en consola qué SQL se genera. Si falta un índice, añadirlo al schema:

```prisma
model Order {
  // ...
  @@index([tenantEmpresa, serviceDate])
}
```

Y crear migración.

## Trabajar con Prisma Studio

```bash
pnpm db:studio
```

Abre una GUI en `http://localhost:5555`. Útil para:
- Ver datos sin escribir SQL.
- Editar campos puntualmente (cuidado — Studio no respeta triggers ni
  validaciones de app).
- Verificar resultados de un seed o migración.

**Nunca** usar Studio contra `comidas_prod`.

## Editores

### VS Code recomendado extensions

```json
{
  "recommendations": [
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "unifiedjs.vscode-mdx"
  ]
}
```

### `.vscode/settings.json` sugerido

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Troubleshooting frecuente

Ver [troubleshooting.md](./troubleshooting.md).
