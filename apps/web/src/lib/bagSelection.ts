type SaleGear = { id: string; equipped: boolean; held: boolean; saleValue: number }

/** Realtime gear changes must not leave invisible selections occupying the limit. */
export function retainSellableSelection(selected: Set<string>, gear: readonly SaleGear[]): Set<string> {
  const available = new Set(gear.filter((item) => !item.equipped && !item.held).map((item) => item.id))
  const next = new Set([...selected].filter((id) => available.has(id)))
  return next.size === selected.size ? selected : next
}

/** Confirm only the same available items and prices the player reviewed. */
export function saleIsCurrent(review: readonly SaleGear[], gear: readonly SaleGear[]): boolean {
  if (review.length === 0 || review.length > 30 || new Set(review.map((item) => item.id)).size !== review.length) return false
  const available = new Map(gear.filter((item) => !item.equipped && !item.held).map((item) => [item.id, item]))
  return review.every((item) => available.get(item.id)?.saleValue === item.saleValue)
}
