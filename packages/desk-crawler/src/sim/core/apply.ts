import type { HeroState, ItemChange, ItemSnapshot } from './types'

/**
 * Apply core item directives to an in-memory inventory. Used by output
 * validation, tests and the balance harness; the Convex adapter performs the
 * same operations as database writes and allocates real IDs.
 */
export function applyItemChanges(
  hero: HeroState,
  inventory: readonly ItemSnapshot[],
  changes: readonly ItemChange[],
  allocateId: () => string,
): { hero: HeroState; inventory: ItemSnapshot[] } {
  let items = [...inventory]
  let nextHero = hero
  for (const change of changes) {
    switch (change.type) {
      case 'potion_decrement': {
        items = items.flatMap((item) => {
          if (item.id !== change.itemId) return [item]
          const quantity = item.quantity - 1
          if (quantity < 0 || (quantity === 0) !== change.deleteRow) throw new Error('inconsistent potion decrement')
          return quantity === 0 ? [] : [{ ...item, quantity }]
        })
        break
      }
      case 'potion_increment':
        items = items.map((item) => (item.id === change.itemId ? { ...item, quantity: item.quantity + 1 } : item))
        break
      case 'create': {
        const id = allocateId()
        items.push({ ...change.item, id })
        if (change.destination === 'held') nextHero = { ...nextHero, heldItemId: id }
        if (change.destination === 'drawer') nextHero = { ...nextHero, drawer: [...(nextHero.drawer ?? []), id] }
        break
      }
    }
  }
  items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { hero: nextHero, inventory: items }
}
