import { describe, expect, it } from 'vitest'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'
import { contentV3 } from '@trmnl-games/desk-crawler/content/v3'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { maxHp } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, StanceId } from '@trmnl-games/desk-crawler/sim/core/types'
import { baseState, seeds } from './helpers'

const level = 5
const max = maxHp(level)
const at = (pct: number) => Math.floor((max * pct) / 100)
const tick = (hero: HeroState, inventory: ReturnType<typeof baseState>['inventory'], content: ContentCatalog, seed = 1) =>
  simulateHero({ hero, inventory, tick: 10, content, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })

describe('stances (D76)', () => {
  it('ships three ordered stances in v3, with balanced mirroring the constants, and validates', () => {
    expect(validateCatalog(contentV3)).toEqual([])
    const { cautious, balanced, bold } = contentV3.stances!
    expect(balanced).toMatchObject({ autoPotionBelowPct: contentV2.constants.autoPotionBelowPct, restBelowPct: contentV2.constants.restBelowPct, resumeExploringAtPct: contentV2.constants.resumeExploringAtPct })
    expect(cautious.restBelowPct).toBeGreaterThan(balanced.restBelowPct)
    expect(bold.restBelowPct).toBeLessThan(balanced.restBelowPct)
    const broken: ContentCatalog = { ...contentV3, stances: { ...contentV3.stances!, bold: { ...bold, restBelowPct: 40 } } }
    expect(validateCatalog(broken)).toContain('stance bold thresholds must satisfy rest < potion < resume')
  })

  it('drinks and rests at the stance thresholds, and treats no stance as balanced', () => {
    // 42%: balanced (50/35) drinks but does not rest; bold (35/20) does neither; cautious (65/50) drinks, then rests only if still under 50%.
    for (const [stance, drinks] of [[undefined, true], ['balanced', true], ['bold', false], ['cautious', true]] as const) {
      const { hero, inventory } = baseState({ level, hp: at(42), biomeId: 'server_room', ...(stance ? { stance } : {}) })
      const result = tick(hero, inventory, contentV3)
      expect(result.metrics.potionsUsed, String(stance)).toBe(drinks ? 1 : 0)
      expect(result.disposition, String(stance)).not.toBe('rested')
    }
    // 30%, no potions: balanced and cautious rest; bold keeps exploring.
    for (const [stance, rests] of [['balanced', true], ['cautious', true], ['bold', false]] as const) {
      const { hero, inventory } = baseState({ level, hp: at(30), biomeId: 'server_room', stance }, 0)
      expect(tick(hero, inventory, contentV3).disposition === 'rested', stance).toBe(rests)
    }
  })

  it('leaves rest at the stance resume threshold', () => {
    // 70% while resting: balanced (75) keeps resting after the heal only if still under 75; bold (60) is out at once; cautious (90) stays.
    const results = (['cautious', 'balanced', 'bold'] as StanceId[]).map((stance) => {
      const { hero, inventory } = baseState({ level, hp: at(52), status: 'resting', stance }, 0)
      return [stance, tick(hero, inventory, contentV3).nextHero.status] as const
    })
    expect(Object.fromEntries(results)).toEqual({ cautious: 'resting', balanced: 'resting', bold: 'exploring' })
  })

  it('plays identically under a catalog without stances and for a balanced hero, whatever the seed', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const plain = baseState({ level, hp: at(42), biomeId: 'server_room' })
      const balanced = baseState({ level, hp: at(42), biomeId: 'server_room', stance: 'balanced' })
      const bold = baseState({ level, hp: at(42), biomeId: 'server_room', stance: 'bold' })
      const reference = tick(plain.hero, plain.inventory, contentV2, seed)
      const { stance: _s, ...balancedNext } = tick(balanced.hero, balanced.inventory, contentV3, seed).nextHero
      expect(balancedNext).toEqual(reference.nextHero)
      // Under v2 the stance is carried but ignored.
      const { stance: _b, ...boldUnderV2 } = tick(bold.hero, bold.inventory, contentV2, seed).nextHero
      expect(boldUnderV2).toEqual(reference.nextHero)
    }
  })

  it('scales victory XP by the stance after the ordinary roll, never below one point', () => {
    const atFull = (stance: StanceId) => baseState({ level, hp: max, biomeId: 'server_room', stance })
    let compared = 0
    for (let seed = 0; seed < 400 && compared < 25; seed += 1) {
      const balanced = tick(atFull('balanced').hero, atFull('balanced').inventory, contentV3, seed)
      if (!balanced.metrics.victories) continue
      const xp = balanced.event!.deltas.xpEarned
      expect(tick(atFull('bold').hero, atFull('bold').inventory, contentV3, seed).event!.deltas.xpEarned).toBe(Math.max(1, Math.floor((xp * 115) / 100)))
      expect(tick(atFull('cautious').hero, atFull('cautious').inventory, contentV3, seed).event!.deltas.xpEarned).toBe(Math.max(1, Math.floor((xp * 90) / 100)))
      // Gold and every other reward draw are untouched.
      expect(tick(atFull('bold').hero, atFull('bold').inventory, contentV3, seed).event!.deltas.gold).toBe(balanced.event!.deltas.gold)
      compared += 1
    }
    expect(compared).toBe(25)
  })

  it('rejects an unknown stance before writing anything', () => {
    const { hero, inventory } = baseState({ level, hp: at(42), stance: 'reckless' as StanceId })
    expect(() => tick(hero, inventory, contentV3)).toThrow(/unknown stance/)
  })
})
