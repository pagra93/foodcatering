# Catálogos · Alérgenos — auditoría + refactor relacional

**Fecha:** 2026-06-30 · **EPIC:** EPIC-003 (Auditoría de lanzamiento Panel Súper Admin)

## Pregunta de origen
"Los alérgenos que el admin crea en `/admin/catalogs/allergens`, ¿los puede seleccionar el catering al crear un plato?"

## Veredicto inicial: ❌ DESCONECTADOS
- Admin guardaba en tabla `Allergen` (BD) — **catálogo huérfano**, nadie lo leía.
- Catering elegía de una **lista hardcodeada** (`lib/validations/dish.ts`) y guardaba strings en `Dish.labels`.
- Tabla `allergens` con **28 filas duplicadas** (mayúsculas ES + inglés).
- Empleado con **otra** lista hardcodeada (`lacteos` vs `lactosa`).

## Solución: modelo relacional (tabla join)
- **`DishAllergen`** (FK `dishes`↔`allergens`, cascade). `Dish.labels` pasa a guardar solo tags nutricionales.
- Catálogo normalizado a **14 canónicos** (`code` = slug español).
- `dish.ts`: alérgenos como **IDs** (`AllergenOption`), `parseDishTags` solo tags.
- Catering: selector + páginas leen catálogo de BD (`getActiveAllergenOptions`), queries usan la relación.
- **Flujo conectado**: admin crea alérgeno → aparece en el selector del catering → se guarda como vínculo → se muestra en el listado.

## Bonus: cadena del empleado (estaba 100% rota) — ARREGLADA
1. API `/api/empleado/alergenos` escribía `allergens` pero se leía `allergies` → corregido.
2. Query del menú no incluía la relación → `dish.allergens` siempre undefined → corregido (+ enriquece isVegetarian/isVegan/kcal).
3. Selector del perfil hardcodeado → lee catálogo de BD, guarda códigos.
4. `DaySelector` empareja por código y muestra nombre. **Validado**: plato con `huevos` se bloquea para empleado alérgico a `huevos`.

## Vocabulario canónico
- Tags inglés del seed (`vegan`, `contains_egg`) → español canónico.
- Helper compartido `prisma/seed-allergens.ts` (`CANONICAL_ALLERGENS`, `splitEtiquetas`, `normalizeAllergyCodes`) en `seed.ts` y `seed-demo.ts`.

## Datos migrados (BD dev, one-shot)
14 catálogo · 19 `DishAllergen` (16 platos) · 203 empleados normalizados · 40 platos con tags traducidos.

## Verificación
`pnpm type-check` ✅ · `eslint` 0 errores ✅ · match alérgeno↔plato confirmado en BD ✅.

## Archivos clave
- `prisma/schema.prisma` (DishAllergen), `prisma/migrations/20260630160000_add_dish_allergen/`
- `prisma/seed-allergens.ts`, `seed.ts`, `seed-demo.ts`
- `lib/validations/dish.ts`, `lib/db/queries/catering-dishes.ts`, `lib/db/queries/catalogs.ts`
- `components/catering/platos/*`, `components/empleado/perfil/AllergenSelector.tsx`, `components/empleado/menus/DaySelector.tsx`
- `lib/db/queries/empleado-menus.ts`, `app/api/empleado/alergenos/route.ts`
