import { describe, expect, it } from 'vitest'
import { contentV4 } from '@trmnl-games/desk-crawler/content/v4'
import { contentV5 } from '@trmnl-games/desk-crawler/content/v5'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { eventById, optionOf, resolveEffect } from '@trmnl-games/desk-crawler/sim/core/choice'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { maxHp } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'
import { baseState, seeds } from './helpers'

const tick = (hero: HeroState, inventory: ReturnType<typeof baseState>['inventory'], content: ContentCatalog, seed = 1, at = 10) =>
  simulateHero({ hero, inventory, tick: at, content, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })
const first = (hero: HeroState, inventory: ReturnType<typeof baseState>['inventory'], predicate: (r: SimulationResult) => boolean) => {
  for (let seed = 0; seed < 4000; seed += 1) {
    const result = tick(hero, inventory, contentV5, seed)
    if (predicate(result)) return { seed, result }
  }
  throw new Error('no seed matched')
}
const ready = () => baseState({ level: 5, hp: maxHp(5), biomeId: 'server_room', potionCap: 20, bagCapacity: 13 })

describe('narrative choices (D79)', () => {
  it('ships six validated events, each with a default among its options', () => {
    expect(validateCatalog(contentV5)).toEqual([])
    expect(contentV5.choices!.events).toHaveLength(6)
    for (const event of contentV5.choices!.events) expect(optionOf(event, event.defaultOptionId)).toBeDefined()
    const broken: ContentCatalog = { ...contentV5, choices: { ...contentV5.choices!, events: [{ ...contentV5.choices!.events[0]!, defaultOptionId: 'nope' }] } }
    expect(validateCatalog(broken)).toContain('event misfiled_expense default is not one of its options')
  })

  it('resolves effects deterministically within the hero\'s limits', () => {
    const hero = { level: 5, hp: 10, gold: 5, potionCap: 20 }
    expect(resolveEffect(contentV5, hero, 19, { gold: -15, hpPct: 15, potions: 3 }, 2)).toEqual({ gold: -5, hp: 23, potions: 1 })
    expect(resolveEffect(contentV5, hero, 0, { goldPerTier: 12, hpPct: -50 }, 3)).toEqual({ gold: 36, hp: -9, potions: 0 })
    expect(resolveEffect(contentV5, { ...hero, hp: maxHp(5) }, 0, { hpPct: 15 }, 1)).toEqual({ gold: 0, hp: 0, potions: 0 })
  })

  it('offers a choice on an event draw, keeps one pending at a time, and never under v4', () => {
    const { hero, inventory } = ready()
    const { result, seed } = first(hero, inventory, (r) => r.event?.kind === 'choice')
    const pending = result.nextHero.choice!
    expect(pending).toMatchObject({ offeredAtTick: 10, expiresAtTick: 106, biomeTier: 2 })
    expect(eventById(contentV5, pending.eventId)).toBeDefined()
    expect(result.event?.detail.outcome).toMatchObject({ variant: 'choice', phase: 'offered', eventId: pending.eventId })
    expect(result.event?.summary).toBe(eventById(contentV5, pending.eventId)!.prompt)
    expect(result.event?.deltas).toEqual({ xpEarned: 0, gold: 0, hp: 0 })
    expect(result.metrics.choicesOffered).toBe(1)
    // The same seed with a choice already pending falls through to ordinary gold loot.
    const busy = tick({ ...hero, choice: pending }, inventory, contentV5, seed)
    expect(busy.event?.detail.outcome).toMatchObject({ variant: 'loot', found: 'gold' })
    expect(busy.nextHero.choice).toEqual(pending)
    for (let s = 0; s < 300; s += 1) expect(tick(hero, inventory, contentV4, s).nextHero.choice).toBeUndefined()
  })

  it('resolves an expired choice by its default as the whole tick, only while exploring or resting', () => {
    const { hero, inventory } = ready()
    const pending = { eventId: 'lost_wallet', offeredAtTick: 10, expiresAtTick: 106, biomeTier: 2 }
    const open = tick({ ...hero, choice: pending }, inventory, contentV5, 1, 105)
    expect(open.nextHero.choice).toEqual(pending)
    const resolved = tick({ ...hero, choice: pending }, inventory, contentV5, 1, 106)
    expect(resolved.nextHero.choice).toBeUndefined()
    expect(resolved.metrics.encounter).toBe('none')
    expect(resolved.event?.kind).toBe('choice')
    expect(resolved.event?.detail.outcome).toMatchObject({ variant: 'choice', phase: 'defaulted', eventId: 'lost_wallet', optionId: 'hand_in' })
    expect(resolved.event?.summary).toContain('thank-you potion')
    expect(resolved.itemChanges).toEqual([{ type: 'potion_increment', itemId: 'i999' }])
    expect(resolved.nextHero.counters.choicesDefaulted).toBe(1)
    expect(resolved.event?.deltas).toEqual({ xpEarned: 0, gold: 0, hp: 0 })
    // A dead hero keeps it until revived; a paused hero keeps it untouched.
    const dead: HeroState = { ...hero, choice: pending, status: 'dead', hp: 0, reviveAtTick: 120 }
    expect(tick(dead, inventory, contentV5, 1, 110).nextHero.choice).toEqual(pending)
    const paused: HeroState = { ...hero, choice: pending, status: 'paused', pausedFromStatus: 'exploring' }
    expect(tick(paused, inventory, contentV5, 1, 110).nextHero.choice).toEqual(pending)
    // A default with a cost applies it: the overtime default is clocking out, so nothing changes; the cake default passes.
    const cake = tick({ ...hero, gold: 100, choice: { ...pending, eventId: 'break_room_cake' } }, inventory, contentV5, 1, 106)
    expect(cake.nextHero.gold).toBe(100)
    expect(cake.event?.summary).toContain('Walked past')
  })

  it('rejects a pending choice for an unknown event', () => {
    const { hero, inventory } = ready()
    expect(() => tick({ ...hero, choice: { eventId: 'nope', offeredAtTick: 1, expiresAtTick: 97, biomeTier: 1 } }, inventory, contentV5)).toThrow(/unknown event/)
  })
})
