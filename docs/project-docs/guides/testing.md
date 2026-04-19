# Guía de testing

## Pila

- **Vitest** para unit/integration.
- **@testing-library/react** para componentes UI.
- **Playwright** para E2E.

## Estructura

```
tests/
├── setup.ts                  Setup global Vitest (mocks, globals)
├── unit/
│   ├── auth/                 Auth, audit, permissions, scoped tenant
│   ├── lib/                  Crypto PII, rate limit, diet-prefs
│   └── queries/              Lógica de queries (order cutoff, fiscal)
└── e2e/                      Playwright E2E

e2e/                           Tests E2E adicionales (raíz)
```

## Estado actual

**51 unit tests verdes** en 6 suites:

- `tests/unit/auth/audit.test.ts` — el hash de audit incluye timestamp
  (propiedad crítica).
- `tests/unit/auth/permissions.test.ts` — wildcards y matriz por rol.
- `tests/unit/auth/scoped-tenant.test.ts` — `getScopedTenantId`
  rechaza headers spoofeados.
- `tests/unit/lib/pii-crypto.test.ts` — encrypt/decrypt roundtrip,
  authTag detecta manipulación.
- `tests/unit/lib/ratelimit.test.ts` — ventanas deslizantes, reset tras
  expiración.
- `tests/unit/lib/diet-prefs.test.ts` — parser robusto frente a JSON
  malformado.
- `tests/unit/queries/order-cutoff.test.ts` — lógica de cutoff previene
  cambios post-11:00.

**E2E**: infraestructura preparada (`playwright.config.ts`) pero sin
tests escritos todavía. Primero tests a añadir cuando haya tráfico:
- Login flow completo.
- Selección de menú empleado con alergia bloqueada.
- Confirmación de entrega por repartidor.

**Coverage objetivo**: 70% (aspiracional, no bloquea CI).

## Cómo correr

```bash
pnpm exec vitest run           # Una pasada (CI)
pnpm test                       # Watch mode en dev
pnpm test:ui                    # UI interactiva
pnpm test:e2e                   # Playwright (requiere browsers)
pnpm exec vitest run --coverage # Con coverage report
```

Coverage HTML se genera en `coverage/index.html`.

## Testing Trophy (estrategia)

Seguimos la "Testing Trophy" de Kent C. Dodds (invertida respecto a la
pirámide clásica):

```
      E2E        ▲  pocos, críticos, lentos
    Integration  ▲  algunos, cubren flujos
      Unit       ▲▲  muchos, rápidos, enfocados
     Static      ▲▲  TypeScript + ESLint (el grueso)
```

- **Static** (TypeScript + ESLint): el check más barato. Captura el 60%
  de errores antes de ejecutar nada.
- **Unit**: para lógica pura (validaciones, cálculos, hashing,
  helpers). Mockea poco o nada.
- **Integration**: Server Components + queries + Prisma real contra BD
  de test (pendiente — hoy unit sirve).
- **E2E**: flujos críticos completos (login, pedido, entrega,
  facturación). Pocos pero definitorios.

## Patrones

### Unit test de función pura

```ts
// tests/unit/auth/permissions.test.ts
import { describe, it, expect } from 'vitest'
import { hasPermission } from '@/lib/auth/permissions'

describe('hasPermission', () => {
  it('super admin tiene todo con wildcard', () => {
    expect(hasPermission('SUPER_ADMIN', 'tenants:create')).toBe(true)
    expect(hasPermission('SUPER_ADMIN', 'random:nonsense')).toBe(true)
  })

  it('empleado no puede crear empleados', () => {
    expect(hasPermission('EMPLEADO', 'employees:create')).toBe(false)
  })

  it('wildcard por entidad', () => {
    // AUDITOR tiene *:read
    expect(hasPermission('AUDITOR', 'orders:read')).toBe(true)
    expect(hasPermission('AUDITOR', 'orders:create')).toBe(false)
  })
})
```

### Test de propiedad crítica

```ts
// tests/unit/auth/audit.test.ts
it('dos llamadas consecutivas con mismos args dan hashes distintos', async () => {
  const args = { actorId: 'u1', action: 'UPDATE', entity: 'Order', entityId: 'o1' }
  const h1 = await computeAuditHash(args)
  await new Promise(r => setTimeout(r, 10))
  const h2 = await computeAuditHash(args)
  expect(h1).not.toBe(h2)  // timestamp debe entrar al hash
})
```

### Test de query con mock Prisma

```ts
// tests/unit/queries/order-cutoff.test.ts
import { vi } from 'vitest'
vi.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    companyPolicy: { findFirst: vi.fn() },
  },
}))

import { prisma } from '@/lib/db'
import { saveOrder } from '@/lib/db/queries/empresa-pedidos'

describe('saveOrder cutoff', () => {
  it('rechaza si la hora actual es > cutoff', async () => {
    vi.mocked(prisma.companyPolicy.findFirst).mockResolvedValue({
      cutoffTime: '11:00',
      daysActive: ['monday'],
    } as any)

    // fijamos la hora del test a las 11:30
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-28T11:30:00'))

    await expect(saveOrder({...})).rejects.toThrow('cutoff')
  })
})
```

### Test de componente UI

```tsx
// ejemplo — no hay muchos todavía porque 95% son Server Components
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AllergenSelector } from '@/components/empleado/perfil/AllergenSelector'

it('al clicar un alérgeno, se añade a selección', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<AllergenSelector selected={[]} onChange={onChange} />)

  await user.click(screen.getByLabelText('Lactosa'))
  expect(onChange).toHaveBeenCalledWith(['lactose'])
})
```

## Mocking strategy

- **No mockear la BD** si puedes testear la lógica pura.
- Si necesitas Prisma: mockea el método concreto, no el cliente entero.
- **No mockear NextAuth**: testea la lógica de permissions por separado.
- Fechas: `vi.useFakeTimers()` + `vi.setSystemTime(…)`.

## CI

El workflow corre:

```yaml
- pnpm type-check    # verifica tipos
- pnpm lint           # ESLint
- pnpm exec vitest run  # unit tests (51)
- pnpm build         # build productivo (captura errores RSC)
```

Todo debe pasar green para mergear a main.

## Playwright E2E (setup base)

```bash
pnpm exec playwright install  # descarga browsers (Chromium, Firefox, WebKit)
pnpm test:e2e                  # corre todos los tests en e2e/
pnpm test:e2e --ui             # modo UI interactivo
pnpm test:e2e --debug          # modo debug con inspector
```

Config en `playwright.config.ts`:
- `baseURL: http://localhost:3000`.
- 3 browsers (Chromium / Firefox / WebKit).
- Screenshots en fallos.
- Video para E2E largos.

Pendiente: tests E2E.

## Reglas

1. **No hay feature sin test si la lógica tiene branches**. Si es una
   query plana `findMany(where: {...})`, puede pasarse. Si hay cálculo,
   cutoff, validación cruzada: test obligatorio.
2. **Tests verdes al mergear**. Main protegido por CI.
3. **Un test por comportamiento**, no por implementación. Los tests
   frágiles que rompen al refactorizar son un olor a acoplamiento.
4. **No tests de mocks** — si el test solo verifica que un mock se
   llamó, no aporta valor; reformula.
5. **Fixtures deterministas**. Usar `vi.setSystemTime` para fechas,
   UUIDs fijos, seeds reproducibles.
