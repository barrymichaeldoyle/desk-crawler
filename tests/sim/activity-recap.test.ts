import { describe, expect, it } from 'vitest'
import { contentV4 } from '@trmnl-games/desk-crawler/content/v4'
import { activityRecap, MAX_RECAP_EVENTS, RECAP_WINDOW_MS, type ActivityEntry } from '@trmnl-games/desk-crawler/payload'
import type { OutcomeDetail } from '@trmnl-games/desk-crawler/sim/core/types'

const NOW = Date.UTC(2026, 9, 6, 8)
const loot = (patch: Partial<Extract<OutcomeDetail, { variant: 'loot' }>> = {}): OutcomeDetail => ({ variant: 'loot', found: 'gold', goldGranted: 12, jackpot: false, potionFullFallback: false, ...patch })
const entry = (outcome: OutcomeDetail, patch: Partial<ActivityEntry> = {}): ActivityEntry => ({ at: NOW - 900_000, deltas: { xpEarned: 0, gold: 0, hp: 0 }, detail: { outcome, levelsGained: 0, heldFind: false }, ...patch })
const fight: OutcomeDetail = { variant: 'combat', monsterId: 'paper_imp', elite: true, monsterHpStart: 12, monsterHpEnd: 0, rounds: [], outcome: 'victory', xpGranted: 9, goldGranted: 3, gearDropped: true }

describe('12-hour device recap', () => {
  it('summarizes gross rewards and potion finds from outcomes, independently of net inventory/HP changes', () => {
    const recap = activityRecap([
      entry(fight, { deltas: { xpEarned: 9, gold: 3, hp: 4 } }),
      entry(loot({ found: 'potion', goldGranted: 0 })),
      entry(loot({ found: 'gold', goldGranted: 5, potionFullFallback: true })),
      entry(loot({ found: 'gear', rarity: 'rare', goldGranted: 0 })),
      entry({ variant: 'rest', healing: 0, automatic: false, resultingStatus: 'exploring' }),
    ], NOW, contentV4)
    expect(recap.totals).toMatchObject({ xp: 9, gold: 8, wins: 1, gear: 2, potions: 1, breaks: 1, rareFinds: 1, elites: 1 })
    expect(recap.activity).toBe('1 fight won · 2 gear finds · 1 potion found · 1 break')
    expect(recap.gains).toBe('+9 XP · 8 gold earned')
    expect(recap.highlights).toContain('1 rare find')
  })

  it('retains older milestones even when the newest event is an uneventful break', () => {
    const logs = [
      entry({ variant: 'rest', healing: 0, automatic: false, resultingStatus: 'exploring' }),
      entry(fight, { at: NOW - 8 * 3_600_000, detail: { outcome: fight, levelsGained: 2, heldFind: false } }),
      entry(loot({ found: 'gear', rarity: 'rare', goldGranted: 0 }), { at: NOW - 10 * 3_600_000 }),
    ]
    expect(activityRecap(logs, NOW, contentV4).highlights).toBe('Gained 2 levels · 1 rare find')
    expect(activityRecap(logs, NOW + 60_000, contentV4).totals).toEqual(activityRecap(logs, NOW, contentV4).totals)
  })

  it('includes annotated rare combat drops and keeps older unannotated drops unknown', () => {
    const recap = activityRecap([entry(fight), entry({ ...fight, gearRarity: 'rare' })], NOW, contentV4)
    expect(recap.totals).toMatchObject({ gear: 2, rareFinds: 1 })
  })

  it('uses a strict rolling window across midnight and ignores future events and companion commands', () => {
    const recap = activityRecap([
      entry(loot(), { at: NOW - RECAP_WINDOW_MS }),
      entry(loot(), { at: NOW - RECAP_WINDOW_MS + 1 }),
      entry(loot(), { at: NOW }),
      entry(loot(), { at: NOW + 1 }),
      entry(loot(), { detail: { operation: 'inventory.sellMany' }, deltas: { xpEarned: 0, gold: 999, hp: 0 } }),
    ], NOW, contentV4)
    expect(recap.events).toBe(2)
    expect(recap.totals.gold).toBe(24)
    expect(recap.label).toBe('Last 12 hours')
    expect(recap.from).toBe((NOW - RECAP_WINDOW_MS) / 1000)
  })

  it('counts defeats separately from victory and keeps important historical facts ahead of rare finds', () => {
    const recap = activityRecap([
      entry({ ...fight, outcome: 'death', goldGranted: 0, gearDropped: false }),
      entry({ variant: 'revival', previousBiomeId: 'server_room', safeBiomeId: 'office_cubicles', hpGranted: 30, reviveAtTick: 8 }),
      entry(loot({ found: 'gear', rarity: 'rare', goldGranted: 0 }), { detail: { outcome: loot({ found: 'gear', rarity: 'rare', goldGranted: 0 }), levelsGained: 1, heldFind: true } }),
    ], NOW, contentV4)
    expect(recap.totals).toMatchObject({ wins: 0, knockouts: 1, revivals: 1, levels: 1 })
    expect(recap.highlights).toBe('Bag filled up · 1 knockout · 1 revival')
  })

  it('names arrivals from the catalog, and does not turn departures into arrivals', () => {
    const travel: OutcomeDetail = { variant: 'travel', phase: 'depart', fromBiomeId: 'office_cubicles', toBiomeId: 'server_room', arrivalTick: 3 }
    expect(activityRecap([entry(travel)], NOW, contentV4).highlights).toBe('')
    expect(activityRecap([entry({ ...travel, phase: 'arrive' })], NOW, contentV4).highlights).toBe('Reached Server Room')
  })

  it('labels capped results as partial and distinguishes an empty window from zero-reward adventures', () => {
    expect(activityRecap([], NOW, contentV4)).toMatchObject({ label: 'Last 12 hours', activity: 'No new adventures', compact: 'No new adventures', events: 0 })
    const cap = activityRecap(Array.from({ length: MAX_RECAP_EVENTS + 1 }, () => entry(loot())), NOW, contentV4)
    expect(cap.partial).toBe(true)
    expect(cap.label).toContain('partial')
    expect(cap.events).toBe(MAX_RECAP_EVENTS)
    expect(activityRecap([entry(loot())], NOW, contentV4, true).partial).toBe(true)
    expect(activityRecap([entry({ variant: 'trap', avoided: true, damage: 0, outcome: 'survived' })], NOW, contentV4).activity).toBe('Adventures continued')
  })
})
