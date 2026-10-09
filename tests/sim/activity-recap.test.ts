import { describe, expect, it } from 'vitest'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { activityRecap, MAX_RECAP_EVENTS, RECAP_WINDOW_MS, recapPeriod, type ActivityEntry } from '@trmnl-games/desk-crawler/payload'
import type { OutcomeDetail } from '@trmnl-games/desk-crawler/sim/core/types'

/** 08:00 UTC: with no offset, the completed period is the 07:00 stand-up covering 19:00 to 07:00. */
const NOW = Date.UTC(2026, 9, 6, 8)
const PERIOD = recapPeriod(NOW, null)
const END = Date.UTC(2026, 9, 6, 7)
const loot = (patch: Partial<Extract<OutcomeDetail, { variant: 'loot' }>> = {}): OutcomeDetail => ({ variant: 'loot', found: 'gold', goldGranted: 12, jackpot: false, potionFullFallback: false, ...patch })
const entry = (outcome: OutcomeDetail, patch: Partial<ActivityEntry> = {}): ActivityEntry => ({ at: END - 900_000, deltas: { xpEarned: 0, gold: 0, hp: 0 }, detail: { outcome, levelsGained: 0, heldFind: false }, ...patch })
const fight: OutcomeDetail = { variant: 'combat', monsterId: 'paper_imp', elite: true, monsterHpStart: 12, monsterHpEnd: 0, rounds: [], outcome: 'victory', xpGranted: 9, goldGranted: 3, gearDropped: true }

describe('recap periods (D75)', () => {
  it('reports the most recently completed stand-up or retro period in the owner\'s local time', () => {
    expect(PERIOD).toEqual({ label: 'Night recap', span: '19:00-07:00', from: END - RECAP_WINDOW_MS, to: END })
    // 06:59 UTC: the stand-up has not happened yet, so the previous evening's retro (07:00 to 19:00 yesterday) stands.
    expect(recapPeriod(Date.UTC(2026, 9, 6, 6, 59), null)).toEqual({ label: 'Day recap', span: '07:00-19:00', from: Date.UTC(2026, 9, 5, 7), to: Date.UTC(2026, 9, 5, 19) })
    expect(recapPeriod(Date.UTC(2026, 9, 6, 19), null)).toEqual({ label: 'Day recap', span: '07:00-19:00', from: Date.UTC(2026, 9, 6, 7), to: Date.UTC(2026, 9, 6, 19) })
    // Johannesburg (UTC+2) at 08:20 UTC is 10:20 local: the stand-up at 07:00 local, which is 05:00 UTC.
    expect(recapPeriod(Date.UTC(2026, 9, 4, 8, 20), 7200)).toEqual({ label: 'Night recap', span: '19:00-07:00', from: Date.UTC(2026, 9, 3, 17), to: Date.UTC(2026, 9, 4, 5) })
    // Honolulu (UTC−10) at 04:30 UTC is 18:30 the previous local day: still the stand-up of that local morning.
    expect(recapPeriod(Date.UTC(2026, 9, 6, 4, 30), -36000)).toEqual({ label: 'Night recap', span: '19:00-07:00', from: Date.UTC(2026, 9, 5, 5), to: Date.UTC(2026, 9, 5, 17) })
    expect(recapPeriod(Date.UTC(2026, 9, 6, 5), -36000).label).toBe('Day recap')
  })
})

describe('12-hour device recap', () => {
  it('summarizes gross rewards and potion finds from outcomes, independently of net inventory/HP changes', () => {
    const recap = activityRecap([
      entry(fight, { deltas: { xpEarned: 9, gold: 3, hp: 4 } }),
      entry(loot({ found: 'potion', goldGranted: 0 })),
      entry(loot({ found: 'gold', goldGranted: 5, potionFullFallback: true })),
      entry(loot({ found: 'gear', rarity: 'rare', goldGranted: 0 })),
      entry({ variant: 'rest', healing: 0, automatic: false, resultingStatus: 'exploring' }),
    ], PERIOD, contentV1)
    expect(recap.totals).toMatchObject({ xp: 9, gold: 8, wins: 1, gear: 2, potions: 1, breaks: 1, rareFinds: 1, elites: 1 })
    expect(recap.activity).toBe('1 fight won · 2 gear finds · 1 potion found · 1 break')
    expect(recap.gains).toBe('+9 XP · 8 gold earned')
    expect(recap.highlights).toContain('1 rare find')
    expect(recap.span).toBe('19:00-07:00')
    // Icon-led items, most notable first, so a short line keeps the rare find and drops the break.
    expect(recap.items).toEqual([
      { k: 'achievement', t: '1 rare find' },
      { k: 'combat', t: '1 elite' },
      { k: 'xp', t: '+9 XP' },
      { k: 'coin', t: '8 gold' },
      { k: 'sword', t: '1 win' },
      { k: 'loot', t: '2 gear finds' },
      { k: 'potion', t: '1 potion' },
      { k: 'rest', t: '1 break' },
    ])
    expect(activityRecap([], PERIOD, contentV1, true)).toMatchObject({ label: 'Night recap · partial', span: '19:00-07:00', items: [{ k: 'none', t: 'No adventures in sample' }] })
  })

  it('retains older milestones even when the newest event is an uneventful break', () => {
    const logs = [
      entry({ variant: 'rest', healing: 0, automatic: false, resultingStatus: 'exploring' }),
      entry(fight, { at: END - 8 * 3_600_000, detail: { outcome: fight, levelsGained: 2, heldFind: false } }),
      entry(loot({ found: 'gear', rarity: 'rare', goldGranted: 0 }), { at: END - 10 * 3_600_000 }),
    ]
    expect(activityRecap(logs, PERIOD, contentV1).highlights).toBe('Gained 2 levels · 1 rare find')
    // The same period reads the same whenever it is asked for during the day.
    expect(activityRecap(logs, recapPeriod(NOW + 10 * 3_600_000, null), contentV1).totals).toEqual(activityRecap(logs, PERIOD, contentV1).totals)
  })

  it('includes annotated rare combat drops and keeps older unannotated drops unknown', () => {
    const recap = activityRecap([entry(fight), entry({ ...fight, gearRarity: 'rare' })], PERIOD, contentV1)
    expect(recap.totals).toMatchObject({ gear: 2, rareFinds: 1 })
  })

  it('uses a strict half-open period across midnight and ignores events after it and companion commands', () => {
    const recap = activityRecap([
      entry(loot(), { at: END - RECAP_WINDOW_MS }),
      entry(loot(), { at: END - RECAP_WINDOW_MS + 1 }),
      entry(loot(), { at: END }),
      entry(loot(), { at: END + 1 }),
      entry(loot(), { at: NOW - 60_000 }),
      entry(loot(), { detail: { operation: 'inventory.sellMany' }, deltas: { xpEarned: 0, gold: 999, hp: 0 } }),
    ], PERIOD, contentV1)
    expect(recap.events).toBe(2)
    expect(recap.totals.gold).toBe(24)
    expect(recap.label).toBe('Night recap')
    expect(recap.from).toBe((END - RECAP_WINDOW_MS) / 1000)
    expect(recap.to).toBe(END / 1000)
    expect(activityRecap([], recapPeriod(Date.UTC(2026, 9, 6, 20), null), contentV1).label).toBe('Day recap')
  })

  it('counts defeats separately from victory and keeps important historical facts ahead of rare finds', () => {
    const recap = activityRecap([
      entry({ ...fight, outcome: 'death', goldGranted: 0, gearDropped: false }),
      entry({ variant: 'revival', previousBiomeId: 'server_room', safeBiomeId: 'office_cubicles', hpGranted: 30, reviveAtTick: 8 }),
      entry(loot({ found: 'gear', rarity: 'rare', goldGranted: 0 }), { detail: { outcome: loot({ found: 'gear', rarity: 'rare', goldGranted: 0 }), levelsGained: 1, heldFind: true } }),
    ], PERIOD, contentV1)
    expect(recap.totals).toMatchObject({ wins: 0, knockouts: 1, revivals: 1, levels: 1 })
    expect(recap.highlights).toBe('Bag filled up · 1 knockout · 1 revival')
  })

  it('names arrivals from the catalog, and does not turn departures into arrivals', () => {
    const travel: OutcomeDetail = { variant: 'travel', phase: 'depart', fromBiomeId: 'office_cubicles', toBiomeId: 'server_room', arrivalTick: 3 }
    expect(activityRecap([entry(travel)], PERIOD, contentV1).highlights).toBe('')
    expect(activityRecap([entry({ ...travel, phase: 'arrive' })], PERIOD, contentV1).highlights).toBe('Reached Server Room')
  })

  it('labels capped results as partial and distinguishes an empty window from zero-reward adventures', () => {
    expect(activityRecap([], PERIOD, contentV1)).toMatchObject({ label: 'Night recap', activity: 'No new adventures', compact: 'No new adventures', events: 0 })
    const cap = activityRecap(Array.from({ length: MAX_RECAP_EVENTS + 1 }, () => entry(loot())), PERIOD, contentV1)
    expect(cap.partial).toBe(true)
    expect(cap.label).toContain('partial')
    expect(cap.events).toBe(MAX_RECAP_EVENTS)
    expect(activityRecap([entry(loot())], PERIOD, contentV1, true).partial).toBe(true)
    expect(activityRecap([entry({ variant: 'trap', avoided: true, damage: 0, outcome: 'survived' })], PERIOD, contentV1).activity).toBe('Adventures continued')
  })
})

describe('to-do recap fact (D112)', () => {
  it('counts tasks ticked off as one fact and never counts a stand-up as an adventure', () => {
    const done = (count: number): OutcomeDetail => ({ variant: 'todo', phase: 'done', tasks: Array.from({ length: count }, () => ({ templateId: 'defeat_any' as const, label: 'Win 9 fights', reward: 5 })) })
    const standup: OutcomeDetail = { variant: 'todo', phase: 'standup', tasks: [{ templateId: 'find_gear', label: 'Find a piece of gear', reward: 5 }] }
    const recap = activityRecap([entry(done(2), { deltas: { xpEarned: 0, gold: 10, hp: 0 } }), entry(done(1)), entry(standup), entry(fight)], PERIOD, contentV1)
    expect(recap.totals.tasks).toBe(3)
    expect(recap.events).toBe(1)
    expect(recap.items).toContainEqual({ k: 'todo', t: '3 tasks' })
    expect(recap.activity).toContain('3 tasks')
    // A morning with only the stand-up is still a quiet one.
    expect(activityRecap([entry(standup)], PERIOD, contentV1).activity).toBe('No new adventures')
  })
})
