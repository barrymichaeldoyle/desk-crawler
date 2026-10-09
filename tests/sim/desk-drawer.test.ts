import { describe, expect, it } from 'vitest'
import { catalogs } from '@trmnl-games/desk-crawler/content'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { bagUsed, hasRoomForFind } from '@trmnl-games/desk-crawler/sim/core/bag'
import { assertHeroInvariants } from '@trmnl-games/desk-crawler/sim/core/invariants'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import type { ContentCatalog, HeroState, ItemSnapshot, SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'
import { maxHp } from '@trmnl-games/desk-crawler/sim/core/stats'
import { createRng } from '@trmnl-games/desk-crawler/sim/core/rng'
import { seeds, withId } from './helpers'

const v7 = catalogs.v7
const v8 = catalogs.v8

/** A level-3 hero (so the Tote Bag milestone is not pending) with a full 10-slot bag and `drawer` drawer items. */
function fullBag(catalog: ContentCatalog, drawer = 0, overrides: Partial<HeroState> = {}): { hero: HeroState; inventory: ItemSnapshot[] } {
  const kit = starterKit(catalog)
  const base = starterHero('hero1', catalog, 0)
  const spares = Array.from({ length: 10 + drawer }, (_, i) => withId(kit.weapon, `i${String(i + 2).padStart(3, '0')}`))
  const inventory = [withId(kit.weapon, 'i000'), withId(kit.armor, 'i001'), ...spares, withId(kit.potions, 'i999')]
  const hero: HeroState = {
    ...base,
    level: 3,
    hp: maxHp(3),
    bagCapacity: 10,
    weaponId: 'i000',
    armorId: 'i001',
    counters: { ...base.counters, ticksExplored: 10 },
    ...(drawer > 0 ? { drawer: spares.slice(10).map((item) => item.id) } : {}),
    ...overrides,
  }
  return { hero, inventory }
}

const run = (hero: HeroState, inventory: readonly ItemSnapshot[], seed: number, catalog: ContentCatalog, tick = 10): SimulationResult =>
  simulateHero({ hero, inventory, tick, content: catalog, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })

const gearCreate = (result: SimulationResult) => result.itemChanges.find((change) => change.type === 'create' && change.item.kind !== 'potion')

function findGear(hero: HeroState, inventory: readonly ItemSnapshot[], catalog: ContentCatalog, predicate: (result: SimulationResult) => boolean = () => true): SimulationResult {
  for (let seed = 0; seed < 50_000; seed += 1) {
    const result = run(hero, inventory, seed, catalog)
    if (gearCreate(result) !== undefined && predicate(result)) return result
  }
  throw new Error('no seed found gear')
}

describe('desk drawer (P32)', () => {
  it('is a valid six-slot catalog, absent before v8', () => {
    expect(validateCatalog(v8)).toEqual([])
    expect(v8.deskDrawer?.capacity).toBe(6)
    expect(v7.deskDrawer).toBeUndefined()
    expect(validateCatalog({ ...v8, deskDrawer: { ...v8.deskDrawer!, capacity: 9 } })).toContain('desk drawer capacity must be 1 to 8')
    expect(validateCatalog({ ...v8, deskDrawer: { ...v8.deskDrawer!, firstUse: ['{rival} took the {item}.'] } })).toContain('desk drawer narrative uses {rival}: {rival} took the {item}.')
  })

  it('still holds an overflow find at once under v7', () => {
    const { hero, inventory } = fullBag(v7)
    const result = findGear(hero, inventory, v7)
    expect(result.disposition).toBe('inventory_sleep_started')
    expect(result.nextHero.counters.drawerFinds).toBe(0)
  })

  it('drops an overflow find in the drawer and keeps the hero adventuring', () => {
    const { hero, inventory } = fullBag(v8)
    const result = findGear(hero, inventory, v8, (r) => r.event?.detail.outcome.variant === 'loot')
    expect(gearCreate(result)).toMatchObject({ destination: 'drawer' })
    expect(result.disposition).toBe('advanced')
    expect(result.nextHero.status).toBe('exploring')
    expect(result.nextHero.counters.drawerFinds).toBe(1)
    expect(result.nextHero.counters.itemsFound).toBe(hero.counters.itemsFound + 1)
    expect(result.event?.detail).toMatchObject({ heldFind: false, drawerFind: true, outcome: { destination: 'drawer' } })
    expect(result.event?.summary).toMatch(/^Bag full, so the .+ went in the desk drawer\./)
    const applied = applyItemChanges(result.nextHero, inventory, result.itemChanges, () => 'n000')
    expect(applied.hero.drawer).toEqual(['n000'])
    expect(bagUsed(applied.hero, applied.inventory)).toBe(10)
  })

  it('says where a combat drop went the first time', () => {
    const { hero, inventory } = fullBag(v8)
    const result = findGear(hero, inventory, v8, (r) => r.event?.detail.outcome.variant === 'combat')
    expect(result.event?.summary).toContain('went in the desk drawer.')
    expect(result.event?.detail.drawerFind).toBe(true)
  })

  it('logs later drawer finds as ordinary finds', () => {
    const { hero, inventory } = fullBag(v8, 2)
    const seasoned = { ...hero, counters: { ...hero.counters, drawerFinds: 2 } }
    const result = findGear(seasoned, inventory, v8, (r) => r.event?.detail.outcome.variant === 'loot')
    expect(gearCreate(result)).toMatchObject({ destination: 'drawer' })
    expect(result.event?.summary).not.toContain('desk drawer')
    expect(result.event?.detail.drawerFind).toBe(true)
    expect(result.nextHero.counters.drawerFinds).toBe(3)
  })

  it('holds the find and sleeps only when the drawer is full too', () => {
    const { hero, inventory } = fullBag(v8, 6)
    const result = findGear(hero, inventory, v8)
    expect(gearCreate(result)).toMatchObject({ destination: 'held' })
    expect(result.disposition).toBe('inventory_sleep_started')
    expect(result.event?.detail.drawerFind).toBeUndefined()
    expect(result.nextHero.counters.drawerFinds).toBe(0)
  })

  it('never puts a find in the drawer while the bag has room', () => {
    const { hero, inventory } = fullBag(v8)
    const roomy = { ...hero, bagCapacity: 13 }
    const result = findGear(roomy, inventory, v8)
    expect(gearCreate(result)).toMatchObject({ destination: 'bag' })
    expect(result.event?.detail.drawerFind).toBeUndefined()
  })

  it('wakes a hero whose bag is full when the drawer has room', () => {
    const { hero, inventory } = fullBag(v8, 3, { status: 'sleeping', wakeAtTick: 10 })
    expect(hasRoomForFind(hero, inventory, v8)).toBe(true)
    expect(run(hero, inventory, 1, v8).metrics.wakes).toBe(1)
    const full = fullBag(v8, 6, { status: 'sleeping', wakeAtTick: 10 })
    expect(() => run(full.hero, full.inventory, 1, v8)).toThrow(/WAKE_PRECONDITION/)
    // The same hero under v7 has no drawer to wake into.
    const before = fullBag(v7, 0, { status: 'sleeping', wakeAtTick: 10 })
    expect(() => run(before.hero, before.inventory, 1, v7)).toThrow(/WAKE_PRECONDITION/)
  })

  it('rejects drawer references that are missing, equipped, held, repeated or over capacity', () => {
    const { hero, inventory } = fullBag(v8, 2)
    const check = (patch: Partial<HeroState>) => () => assertHeroInvariants({ ...hero, ...patch }, inventory, v8)
    expect(check({})).not.toThrow()
    expect(check({ drawer: ['nope'] })).toThrow(/DRAWER_REF/)
    expect(check({ drawer: ['i000'] })).toThrow(/DRAWER_ELSEWHERE/)
    expect(check({ drawer: ['i012', 'i012'] })).toThrow(/DRAWER_DUPLICATE/)
    expect(check({ drawer: ['i012'], heldItemId: 'i012', status: 'sleeping' })).toThrow(/DRAWER_ELSEWHERE/)
    expect(() => assertHeroInvariants(hero, inventory, v7)).toThrow(/DRAWER_FULL/)
  })

  it('loses no find over random runs: every find ends up equipped, in the bag, in the drawer, held or sold by an intent', { timeout: 30_000 }, () => {
    for (let heroIndex = 0; heroIndex < 40; heroIndex += 1) {
      const rng = createRng(heroIndex + 1)
      const kit = starterKit(v8)
      let inventory: ItemSnapshot[] = [withId(kit.weapon, 'i000'), withId(kit.armor, 'i001'), withId(kit.potions, 'i999')]
      let hero: HeroState = { ...starterHero(`hero${heroIndex}`, v8, 0), weaponId: 'i000', armorId: 'i001' }
      let n = 0
      const created = new Set<string>()
      const sold = new Set<string>()
      for (let tick = 1; tick <= 1_500; tick += 1) {
        // A player who drops by now and then: sells a few drawer or bag items, claims the held find and resumes.
        if (rng.next() < 0.004 && ['exploring', 'resting', 'sleeping'].includes(hero.status)) {
          const loose = inventory.filter((item) => item.kind !== 'potion' && item.id !== hero.weaponId && item.id !== hero.armorId && item.id !== hero.heldItemId)
          const sell = new Set(loose.filter(() => rng.next() < 0.5).map((item) => item.id))
          for (const id of sell) sold.add(id)
          inventory = inventory.filter((item) => !sell.has(item.id))
          const drawer = (hero.drawer ?? []).filter((id) => !sell.has(id))
          hero = { ...hero, drawer }
          if (drawer.length === 0) delete (hero as { drawer?: readonly string[] }).drawer
          if (hero.status === 'sleeping' && hero.heldItemId !== undefined) {
            // claimHeld: into the bag when it fits, else into the drawer when that has room.
            const held = hero.heldItemId
            const rest = { ...hero }
            delete (rest as { heldItemId?: string }).heldItemId
            if (bagUsed(rest, inventory) <= rest.bagCapacity) hero = rest
            else if ((rest.drawer?.length ?? 0) < 6) hero = { ...rest, drawer: [...(rest.drawer ?? []), held] }
          }
          if (hero.status === 'sleeping' && hero.heldItemId === undefined && hero.wakeAtTick === undefined && hasRoomForFind(hero, inventory, v8)) hero = { ...hero, wakeAtTick: tick }
        }
        const result = simulateHero({ hero, inventory, tick, content: v8, simulationVersion: SIMULATION_VERSION, streams: seeds(heroIndex * 10_000 + tick) })
        if (result.disposition === 'inventory_sleep_started') expect(result.nextHero.drawer?.length).toBe(6)
        ;({ hero, inventory } = applyItemChanges(result.nextHero, inventory, result.itemChanges, () => {
          const id = `n${String(n++).padStart(6, '0')}`
          created.add(id)
          return id
        }))
        const gear = new Set(inventory.filter((item) => item.kind !== 'potion').map((item) => item.id))
        for (const id of created) if (!sold.has(id) && (id.startsWith('n') && inventory.find((item) => item.id === id)?.kind !== 'potion')) expect(gear.has(id)).toBe(true)
        expect(bagUsed(hero, inventory)).toBeLessThanOrEqual(hero.bagCapacity)
      }
      expect(hero.counters.drawerFinds).toBeGreaterThan(0)
    }
  })
})
