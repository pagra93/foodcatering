# 🍽️ Plataforma de Gestión de Menús Corporativos

Plataforma SaaS multi-tenant para gestionar el beneficio de comida diaria entre empresas, empleados y caterings, con **compliance fiscal automático** (exención IRPF España).

## 🎯 Características Principales

- **Multi-tenancy**: Una única plataforma con subdominios personalizados por empresa y catering
- **Compliance Fiscal**: Trazabilidad nominativa, diaria y ≤11€/día para exención IRPF
- **Workflow Automatizado**: Desde selección de menú hasta factura y export ERP
- **Modelo Modular**: Los empleados eligen platos (1º+2º+postre) en lugar de menú cerrado
- **Trazabilidad Total**: Versionado de pedidos y snapshots diarios firmados

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend**: Next.js 15 (App Router) + React 19
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth v5
- **State**: React Query + Zustand
- **Validación**: Zod

### Estructura del Proyecto

```
.
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (tenant)/          # Rutas multi-tenant
│   ├── api/               # API Routes
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   ├── features/         # Componentes por feature
│   └── layouts/          # Layouts
├── lib/                  # Librerías y utilidades
│   ├── db/              # Prisma client
│   ├── auth/            # NextAuth config
│   ├── validations/     # Schemas Zod
│   └── utils.ts         # Utilidades generales
├── prisma/              # Prisma schema y migraciones
├── types/               # TypeScript types
└── hooks/               # Custom hooks
```

## 🚀 Getting Started

### Prerrequisitos

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL >= 14

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd comidas
```

2. **Instalar dependencias**
```bash
pnpm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
```

Edita `.env.local` con tus valores:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/comidas_dev"
NEXTAUTH_SECRET="<genera-con-openssl-rand-base64-32>"
NEXTAUTH_URL="http://localhost:3000"
WILDCARD_DOMAIN=".comida.localhost"
```

4. **Configurar base de datos**
```bash
pnpm db:push
```

5. **Iniciar servidor de desarrollo**
```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🗄️ Base de Datos

### Modelo Multi-Tenant

Todas las tablas incluyen `tenant_id` para aislamiento de datos:

- **Tenants**: `ROOT` (admin), `EMPRESA`, `CATERING`
- **Roles**: Super Admin, RRHH, Finanzas, Empleado, Chef, Repartidor, etc.
- **Trazabilidad**: `AuditLog` inmutable para todas las acciones

### Comandos Útiles

```bash
# Generar Prisma Client
pnpm db:generate

# Push schema (dev)
pnpm db:push

# Abrir Prisma Studio
pnpm db:studio

# Seed inicial (TODO)
pnpm db:seed
```

## 🔐 Seguridad

### Multi-Tenancy

- ✅ Middleware inyecta `tenant_id` en contexto
- ✅ Validación en cada query
- ✅ Tests E2E de aislamiento
- ✅ Cifrado columnar para PII

### Compliance

- ✅ Logs inmutables (append-only)
- ✅ Hash de integridad en pedidos
- ✅ Snapshots diarios firmados
- ✅ Retención 4 años (fiscal)

## 🧪 Testing

```bash
# Tests unitarios
pnpm test

# Tests con UI
pnpm test:ui

# Tests E2E
pnpm test:e2e
```

## 📦 Scripts Disponibles

```bash
pnpm dev          # Servidor desarrollo
pnpm build        # Build producción
pnpm start        # Servidor producción
pnpm lint         # Lint
pnpm lint:fix     # Lint + fix
pnpm format       # Prettier
pnpm type-check   # TypeScript check
```

## 🔄 Workflow del Sistema

### Ciclo Diario

```
08:00 → Recordatorio semanal
10:30 → Último aviso
11:00 → CUTOFF (cierre pedidos)
11:05 → Consolidación automática
13:00 → Ventana de entrega
23:59 → Snapshot diario
```

### Estados del Pedido

```
DRAFT → CONFIRMED → LOCKED_AFTER_CUTOFF → DELIVERED
```

## 📝 Convenciones

### TypeScript

- ✅ Modo estricto siempre
- ✅ Preferir `type` sobre `interface`
- ✅ Zod para validación runtime
- ❌ Nunca `any`

### Naming

- **DB**: `snake_case` (`tenant_id`)
- **TypeScript**: `camelCase` (variables), `PascalCase` (tipos)
- **Componentes**: `PascalCase` (`OrderCard.tsx`)
- **Hooks**: prefijo `use` (`useTenantContext`)

### Git

```bash
# Commits convencionales
feat: nueva funcionalidad
fix: corrección de bug
refactor: refactorización
docs: documentación
test: tests
```

## 🗺️ Estado del proyecto

Estado vivo detallado → [`docs/general/ESTADO.md`](./docs/general/ESTADO.md).
Diagnóstico técnico y plan de sprints → [`docs/general/diagnostico/DIAGNOSTICO-EXHAUSTIVO-2026-04.md`](./docs/general/diagnostico/DIAGNOSTICO-EXHAUSTIVO-2026-04.md).

Resumen rápido:
- **Fase 0 · Base**: ✅ 100% (TS estricto, schema Prisma con 34 modelos, auth, guards, RBAC, impersonación auditada)
- **Fase 1 · Súper Admin**: 🟡 portales funcionales, estabilización en curso
- **Fase 2 · Catering**: 🟡 platos, menús, rutas, facturación reescritos contra schema real
- **Fase 3 · Empresa**: 🟡 dashboard, empleados, facturación, incidencias, auditoría
- **Fase 4 · Empleado**: 🟡 selector semanal, historial, perfil, incidencias

Trabajo en curso: sprints 0-3 (estabilización + seguridad + infra) tras un diagnóstico que destapó drift grande entre código y schema.

## 📚 Documentación

Todo el índice en [`docs/general/README.md`](./docs/general/README.md).

## 📄 Licencia

Privado - Todos los derechos reservados

---

**Versión**: 0.1.0 (MVP en estabilización)
**Última actualización**: 2026-04-18

