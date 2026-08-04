-- Fase B (B1) — Normaliza `Order.selection` a la forma CANÓNICA
-- { starterId, mainId, dessertId } (lib/orders/selection.ts).
--
-- Convivían tres formas y el desajuste hacía que las facturas catering→empresa
-- salieran casi a 0 € y que las valoraciones no encontraran platos:
--   1. Canónica (la escribe el portal empleado): { starterId, mainId, dessertId }
--   2. Seeds legacy: { first: { dishId, name }, second: …, dessert: … }
--   3. Solo-lector legacy: { firstId, secondId, dessertId }
-- Idempotente: los WHERE solo matchean formas legacy.

-- Forma 2 → canónica (jsonb_strip_nulls descarta cursos ausentes).
UPDATE orders
SET selection = jsonb_strip_nulls(jsonb_build_object(
  'starterId', selection->'first'->>'dishId',
  'mainId',    selection->'second'->>'dishId',
  'dessertId', selection->'dessert'->>'dishId'
))
WHERE selection ?| array['first', 'second', 'dessert'];

-- Forma 3 → canónica.
UPDATE orders
SET selection = jsonb_strip_nulls(jsonb_build_object(
  'starterId', selection->>'firstId',
  'mainId',    selection->>'secondId',
  'dessertId', selection->>'dessertId'
))
WHERE selection ?| array['firstId', 'secondId'];
