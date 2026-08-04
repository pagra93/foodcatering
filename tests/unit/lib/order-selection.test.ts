import { describe, it, expect } from 'vitest'
import {
  parseOrderSelection,
  selectionDishIds,
} from '@/lib/orders/selection'
import { dishesFromSelection } from '@/lib/ratings/selection'

/**
 * Contrato de `Order.selection` (B1): las TRES formas históricas deben
 * resolverse a los mismos ids. La divergencia entre escritor (canónica),
 * facturación (leía firstId/secondId) y valoraciones (leía first.dishId)
 * facturaba casi 0 € y rompía el rating — estos tests fijan el contrato.
 */
describe('parseOrderSelection', () => {
  it('lee la forma canónica { starterId, mainId, dessertId }', () => {
    expect(
      parseOrderSelection({ starterId: 'a', mainId: 'b', dessertId: 'c' })
    ).toEqual({ starterId: 'a', mainId: 'b', dessertId: 'c' })
    expect(parseOrderSelection({ mainId: 'b' })).toEqual({
      starterId: undefined,
      mainId: 'b',
      dessertId: undefined,
    })
  })

  it('lee la forma legacy de seeds { first: { dishId }, … }', () => {
    expect(
      parseOrderSelection({
        first: { dishId: 'a', name: 'Gazpacho' },
        second: { dishId: 'b', name: 'Pollo' },
        dessert: { dishId: 'c', name: 'Fruta' },
      })
    ).toEqual({ starterId: 'a', mainId: 'b', dessertId: 'c' })
  })

  it('lee la forma legacy de lector { firstId, secondId, dessertId }', () => {
    expect(
      parseOrderSelection({ firstId: 'a', secondId: 'b', dessertId: 'c' })
    ).toEqual({ starterId: 'a', mainId: 'b', dessertId: 'c' })
  })

  it('tolera basura sin lanzar', () => {
    expect(parseOrderSelection(null)).toEqual({})
    expect(parseOrderSelection('x')).toEqual({})
    expect(parseOrderSelection([])).toEqual({})
    expect(parseOrderSelection({ otra: 'cosa' })).toEqual({})
    expect(parseOrderSelection({ first: null, second: 42 })).toEqual({
      starterId: undefined,
      mainId: undefined,
      dessertId: undefined,
    })
  })
})

describe('selectionDishIds', () => {
  it('devuelve los ids presentes de cualquier forma', () => {
    expect(selectionDishIds({ starterId: 'a', mainId: 'b' })).toEqual(['a', 'b'])
    expect(
      selectionDishIds({ first: { dishId: 'a' }, dessert: { dishId: 'c' } })
    ).toEqual(['a', 'c'])
    expect(selectionDishIds({})).toEqual([])
  })
})

describe('dishesFromSelection (valoraciones)', () => {
  it('con forma canónica usa los nombres hidratados', () => {
    const names = new Map([
      ['a', 'Gazpacho'],
      ['b', 'Pollo asado'],
    ])
    expect(
      dishesFromSelection({ starterId: 'a', mainId: 'b' }, names)
    ).toEqual([
      { dishId: 'a', name: 'Gazpacho', course: 'FIRST' },
      { dishId: 'b', name: 'Pollo asado', course: 'SECOND' },
    ])
  })

  it('con forma legacy conserva el nombre embebido', () => {
    expect(
      dishesFromSelection({ second: { dishId: 'b', name: 'Pollo' } })
    ).toEqual([{ dishId: 'b', name: 'Pollo', course: 'SECOND' }])
  })

  it('sin nombre disponible cae a "Plato"', () => {
    expect(dishesFromSelection({ mainId: 'b' })).toEqual([
      { dishId: 'b', name: 'Plato', course: 'SECOND' },
    ])
  })
})
