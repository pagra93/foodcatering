# Arquitectura de entornos

**Fuente de verdad operativa.** Si este documento dice A y la memoria de
alguien dice B, gana este documento.

## Resumen

Dos entornos, una sola instancia Postgres, dos bases de datos con usuarios
distintos.

```
┌─ Laptop (dev) ────────────────────────────────────────────────┐
│  pnpm dev  →  .env  →  comidas_dev (usuario comidas_dev_user) │
└───────────────────────────────────────────────────────────────┘
                           │  TCP/TLS pública
                           ▼
┌─ Servidor Hetzner 5.78.124.107 ───────────────────────────────┐
│                                                               │
│  Docker container: fws4wwks04kwkg8ss0sk004c (Postgres 16)     │
│                                                               │
│   ┌─ comidas_dev ─────┐     ┌─ comidas_prod ────┐             │
│   │ owner: postgres   │     │ owner: postgres   │             │
│   │ acceso de:        │     │ acceso de:        │             │
│   │   comidas_dev_user│     │   comidas_prod_user│            │
│   └───────────────────┘     └───────────────────┘             │
│                                       ▲                       │
│  Coolify service "comidas"            │                       │
│  plati.es ───► env vars panel ───┘                       │
└───────────────────────────────────────────────────────────────┘
```

## Tabla de entornos

| Entorno | BD | Usuario Postgres | Host | Dónde se configura |
|---|---|---|---|---|
| **Dev** (laptop) | `comidas_dev` | `comidas_dev_user` | `5.78.124.107:5432` | `.env` local del dev (gitignored) |
| **Prod** (Coolify) | `comidas_prod` | `comidas_prod_user` | interno del servidor | Panel Coolify → service "comidas" → Env Variables |

## Defensa anti-accidente

El principal riesgo cuando dev y prod comparten instancia es el copy-paste
de una `DATABASE_URL` mal apuntada. Tres capas de defensa:

1. **Usuarios Postgres separados con GRANT estricto**. `comidas_dev_user`
   tiene permisos *solo* en `comidas_dev`; `comidas_prod_user` solo en
   `comidas_prod`. Un `.env` con el usuario dev apuntando al nombre de BD
   prod responde `permission denied`.

2. **Guardia por nombre en scripts destructivos**. `scripts/reset-db.sh` y
   `scripts/seed-staging.sh` leen el nombre de BD de `DATABASE_URL` y
   abortan si contiene `prod`.

3. **Guardia por `NODE_ENV`**. Los mismos scripts abortan si
   `NODE_ENV=production`.

## Env vars críticas

### Dev local (`.env`, gitignored)

```
DATABASE_URL="postgresql://comidas_dev_user:***@5.78.124.107:5432/comidas_dev?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generado con openssl rand -base64 32>"
WILDCARD_DOMAIN=".localhost:3000"
NODE_ENV="development"
# PII_ENCRYPTION_KEY="<opcional hasta Sprint 4 PII>"
```

### Prod Coolify (panel → Env Variables, nunca en repo)

```
DATABASE_URL=postgresql://comidas_prod_user:***@<internal-host>:5432/comidas_prod?schema=public
NEXTAUTH_URL=https://plati.es
NEXTAUTH_SECRET=<otro distinto al de dev>
WILDCARD_DOMAIN=.plati.es
NODE_ENV=production
PII_ENCRYPTION_KEY=<32 bytes hex, rotable>
```

`docs/general/diagnostico/INFORME-PROBLEMAS-PRODUCCION-PLATI.md` es la guía
detallada de cómo fijar estas env vars en Coolify + DNS wildcard.

## Qué NO tiene cada entorno

- **Dev** no tiene datos reales. Solo fixtures del `pnpm db:seed` (usuarios
  de prueba con credenciales fijas — ver `docs/general/desarrollo/CREDENCIALES-PRUEBA.md`).
- **Prod** no tiene seeds de desarrollo. Cuando se despliegue,
  `comidas_prod` parte vacía y los datos los crean los clientes reales vía
  el panel de super admin.
- **Ninguno de los dos** tiene acceso a la BD del otro.

## Próxima capa — staging (aplazado)

Cuando el primer cliente real firme contrato, se añade un tercer entorno:

- `staging.plati.es` + BD `comidas_staging` + usuario
  `comidas_staging_user`.
- Nuevo servicio en Coolify apuntando a rama `main`.
- Prod pasa a deplogarse solo desde rama `release` (merge manual desde
  `main` cuando staging esté verde).

No hacerlo antes: no se justifica la gestión adicional hasta que haya
datos reales que perder.

## Fuente de verdad

- **Schema BD**: `prisma/schema.prisma`. Cambios van por `prisma migrate`.
- **Env vars dev**: `.env` local del developer.
- **Env vars prod**: panel Coolify.
- **Comandos operativos**: `docs/general/despliegue/RUNBOOK.md`.
- **Histórico y contexto**: `docs/general/PROJECT_KNOWLEDGE.md`.
