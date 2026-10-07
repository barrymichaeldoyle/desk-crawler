import { describe, expect, it } from 'vitest'
import { contentV5 } from '@trmnl-games/desk-crawler/content/v5'
import { contentV6 } from '@trmnl-games/desk-crawler/content/v6'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { activeModifiers, effectiveStats, withEffect } from '@trmnl-games/desk-crawler/sim/core/modifiers'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { deriveStats, maxHp } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, ItemSnapshot, SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'
import { baseState, seeds } from './helpers'

const tick = (hero: HeroState, inventory: ItemSnapshot[], content: ContentCatalog, seed = 1, at = 10) =>
  simulateHero({ hero, inventory, tick: at, content, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })
const first = (hero: HeroState, inventory: ItemSnapshot[], predicate: (r: SimulationResult) => boolean, content = contentV6) => {
  for (let seed = 0; seed < 6000; seed += 1) {
    const result = tick(hero, inventory, content, seed)
    if (predicate(result)) return { seed, result }
  }
  throw new Error('no seed matched')
}
const ready = (overrides: Partial<HeroState> = {}, potions = 3) => baseState({ level: 5, hp: maxHp(5), biomeId: 'server_room', potionCap: 20, bagCapacity: 13, ...overrides }, potions)
const fired = { id: 'fired_up', untilTick: 20 }
const bruised = { id: 'bruised', untilTick: 20 }

describe('affixes and epic gear (D81)', () => {
  it('validates v6, rolls an affix only on rare and epic gear, and never under v5', () => {
    expect(validateCatalog(contentV6)).toEqual([])
    const { hero, inventory } = ready()
    const found: Record<string, Set<string | undefined>> = {}
    for (let seed = 0; seed < 6000; seed += 1) {
      const result = tick(hero, inventory, contentV6, seed)
      const created = result.itemChanges.find((change) => change.type === 'create')
      if (created?.type !== 'create' || created.item.kind === 'potion') continue
      ;(found[created.item.rarity] ??= new Set()).add(created.item.affixId)
      if (created.item.rarity === 'epic') expect(created.item.attack + created.item.defense).toBeGreaterThan(7)
    }
    expect([...found.common!]).toEqual([undefined])
    expect([...found.uncommon!]).toEqual([undefined])
    expect([...found.rare!].every((id) => id !== undefined)).toBe(true)
    expect(found.epic).toBeDefined()
    for (let seed = 0; seed < 300; seed += 1) {
      const created = tick(hero, inventory, contentV5, seed).itemChanges.find((change) => change.type === 'create')
      if (created?.type === 'create') expect(created.item.affixId).toBeUndefined()
    }
  })

  it('names the affix in the find story and counts epic finds', () => {
    const { hero, inventory } = ready()
    const { result } = first(hero, inventory, (r) => r.itemChanges.some((c) => c.type === 'create' && c.item.rarity === 'epic'))
    expect(result.nextHero.counters.epicFinds).toBe(1)
    expect(result.nextHero.counters.rareFinds).toBe(1)
    expect(result.event?.summary).toMatch(/\[\[(Vampiric|Lucky|Sturdy|Thrifty) Epic /)
  })

  it('applies affix modifiers at their one place each: lucky gold, sturdy traps, vampiric heals, thrifty losses', () => {
    const { hero, inventory } = ready({ gold: 1000 })
    const lucky: ItemSnapshot[] = inventory.map((item) => (item.id === 'i000' ? { ...item, affixId: 'lucky' } : item))
    const { seed, result: plain } = first(hero, inventory, (r) => r.metrics.victories === 1)
    const withLucky = tick(hero, lucky, contentV6, seed)
    expect(withLucky.event!.deltas.gold).toBe(Math.floor((plain.event!.deltas.gold * 120) / 100))
    expect(withLucky.event!.deltas.xpEarned).toBe(plain.event!.deltas.xpEarned)
    const sturdy: ItemSnapshot[] = inventory.map((item) => (item.id === 'i001' ? { ...item, affixId: 'sturdy' } : item))
    const trap = first(hero, inventory, (r) => r.event?.detail.outcome.variant === 'trap' && !r.event.detail.outcome.avoided)
    const softened = tick(hero, sturdy, contentV6, trap.seed)
    const original = trap.result.event!.detail.outcome as { damage: number }
    expect((softened.event!.detail.outcome as { damage: number }).damage).toBe(Math.max(1, Math.floor((original.damage * 60) / 100)))
    const hurt = ready({ hp: 100 })
    const vampiric: ItemSnapshot[] = hurt.inventory.map((item) => (item.id === 'i000' ? { ...item, affixId: 'vampiric' } : item))
    const win = first(hurt.hero, hurt.inventory, (r) => r.metrics.victories === 1)
    const healed = tick(hurt.hero, vampiric, contentV6, win.seed)
    expect(healed.nextHero.hp - win.result.nextHero.hp).toBe(Math.ceil((maxHp(5) * 5) / 100))
    const thrifty: ItemSnapshot[] = inventory.map((item) => (item.id === 'i001' ? { ...item, affixId: 'thrifty' } : item))
    const retreat = first(hero, inventory, (r) => r.metrics.retreats === 1)
    expect(tick(hero, thrifty, contentV6, retreat.seed).event!.detail.goldPenalty).toBe(0)
    expect(retreat.result.event!.detail.goldPenalty).toBe(50)
  })
})

describe('effects (D80)', () => {
  it('sums modifiers from live effects and equipped affixes, ignoring unknown ids', () => {
    const { hero, inventory } = ready({ effects: [fired, { id: 'nope', untilTick: 99 }, { id: 'well_fed', untilTick: 5 }] })
    const mods = activeModifiers(contentV6, hero, inventory, 10)
    expect(mods).toMatchObject({ attackPct: 10, xpPct: 0, goldPct: 0 })
    const stats = effectiveStats(contentV6, hero, inventory, 10)
    expect(stats.attack).toBe(Math.floor((deriveStats(hero, inventory).attack * 110) / 100))
    expect(withEffect([fired, bruised, { id: 'well_fed', untilTick: 30 }], contentV6.effects![0]!, 10).map((e) => e.id)).toEqual(['bruised', 'well_fed', 'fired_up'])
    expect(withEffect([{ id: 'a', untilTick: 12 }, { id: 'b', untilTick: 14 }, { id: 'c', untilTick: 16 }], contentV6.effects![2]!, 10).map((e) => e.id)).toEqual(['b', 'c', 'well_fed'])
  })

  it('gains Bruised from a trap hit, Fired up from an elite win, drops expired effects and clears all on a knockout', () => {
    const { hero, inventory } = ready()
    const trap = first(hero, inventory, (r) => r.event?.detail.outcome.variant === 'trap' && !r.event.detail.outcome.avoided)
    expect(trap.result.nextHero.effects).toEqual([{ id: 'bruised', untilTick: 14 }])
    expect(trap.result.event?.detail.effectGained).toBe('bruised')
    expect(trap.result.event?.summary).toContain('Bruised for 4 adventures.')
    const elite = first({ ...hero, level: 8, hp: maxHp(8) }, inventory, (r) => r.metrics.elites === 1 && r.metrics.victories === 1)
    expect(elite.result.nextHero.effects).toEqual([{ id: 'fired_up', untilTick: 18 }])
    // Expiry: gone from its untilTick on, silently, in any status.
    const paused: HeroState = { ...hero, effects: [fired], status: 'paused', pausedFromStatus: 'exploring' }
    expect(tick(paused, inventory, contentV6, 1, 19).nextHero.effects).toEqual([fired])
    expect(tick(paused, inventory, contentV6, 1, 20).nextHero.effects).toBeUndefined()
    // A knockout clears every effect; revival starts clean.
    const fragile = ready({ hp: 2, effects: [fired, bruised], biomeId: 'cafeteria_depths', level: 8 })
    const death = first(fragile.hero, fragile.inventory, (r) => r.metrics.deaths === 1)
    expect(death.result.nextHero.effects).toBeUndefined()
  })

  it('cleanses banes but not boons when the hero rests', () => {
    const { hero, inventory } = ready({ status: 'resting', hp: 40, effects: [fired, bruised] })
    const rested = tick(hero, inventory, contentV6, 1)
    expect(rested.nextHero.effects).toEqual([fired])
    const low = ready({ hp: 30, effects: [bruised] }, 0)
    expect(tick(low.hero, low.inventory, contentV6, 1).nextHero.effects).toBeUndefined()
  })

  it('plays v5 heroes and gear identically under v6 whenever no epic roll, affix or effect is involved', () => {
    const { hero, inventory } = ready()
    for (let seed = 0; seed < 150; seed += 1) {
      const a = tick(hero, inventory, contentV5, seed)
      const b = tick(hero, inventory, contentV6, seed)
      const createdA = a.itemChanges.find((c) => c.type === 'create')
      const createdB = b.itemChanges.find((c) => c.type === 'create')
      if (createdA?.type === 'create' && createdB?.type === 'create' && (createdA.item.rarity !== createdB.item.rarity || createdB.item.affixId !== undefined)) continue
      if (b.event?.detail.effectGained !== undefined) continue
      expect(b.nextHero.hp).toBe(a.nextHero.hp)
      expect(b.event?.deltas).toEqual(a.event?.deltas)
    }
  })
})
