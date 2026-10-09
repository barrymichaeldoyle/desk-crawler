import { describe, expect, it } from 'vitest'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { contentV3 } from '@trmnl-games/desk-crawler/content/v3'
import { aboutDuration, buildPayload, celebrationFor, MAX_LOGS, TOP_ROWS, type PayloadInput } from '@trmnl-games/desk-crawler/payload'

const NOW = Date.UTC(2026, 9, 4, 8, 20)
const input: PayloadInput = {
  now: NOW,
  world: { currentTick: 1, lastCompletedTick: 1, lastCompletedAt: NOW - 60_000, createdAt: NOW - 3_600_000, ticksPaused: false, maintenanceMode: false },
  ownerAlias: 'Ana',
  timezone: 'UTC',
  hero: { name: 'Baz', level: 1, xp: 0, hp: 60, gold: 0, status: 'exploring', biomeId: 'office_cubicles', lastTick: 0, quarantined: false },
  weaponName: null,
  armorName: null,
  weaponAttack: 0,
  armorDefense: 0,
  potions: 3,
  bagUsed: 0,
  bagCapacity: 30,
  heldItemName: null,
  logs: [],
  instanceName: 'Desk Crawler',
  content: contentV1,
  spriteBaseUrl: null,
  artBaseUrl: 'https://art.test',
  latestEvent: null,
  ranking: null,
}
const pick = (p: unknown) => p as { first_run: boolean; qr_base: string; qr_label: string; companion_qr_base: string; status: string }

describe('merchant notice (D78)', () => {
  const notice = (p: unknown) => (p as { notice: string | null; attention: string | null }).notice
  it('announces an open visit, and stays quiet once it expired or when an attention line is showing', () => {
    expect(notice(buildPayload(input))).toBeNull()
    expect(notice(buildPayload({ ...input, hero: { ...input.hero!, merchantExpiresAtTick: 5 } }))).toBe('Merchant visiting. Shop in the companion soon.')
    expect(notice(buildPayload({ ...input, world: { ...input.world!, currentTick: 5 }, hero: { ...input.hero!, merchantExpiresAtTick: 5 } }))).toBeNull()
    expect(notice(buildPayload({ ...input, hero: { ...input.hero!, status: 'dead', hp: 0, reviveAtTick: 9, merchantExpiresAtTick: 5 } }))).toBeNull()
    // D79: a waiting decision outranks the merchant.
    expect(notice(buildPayload({ ...input, hero: { ...input.hero!, merchantExpiresAtTick: 5, choiceExpiresAtTick: 90 } }))).toBe('A decision is waiting in the companion.')
    expect(notice(buildPayload({ ...input, world: { ...input.world!, currentTick: 90 }, hero: { ...input.hero!, choiceExpiresAtTick: 90 } }))).toBeNull()
  })
})

describe('derived combat stats', () => {
  it('adds the equipped gear bonus to the level base, and is null when unlinked', () => {
    const stats = (p: unknown) => p as { attack: number | null; defense: number | null }
    expect(stats(buildPayload(input))).toMatchObject({ attack: 10, defense: 4 })
    expect(stats(buildPayload({ ...input, hero: { ...input.hero!, level: 5 }, weaponAttack: 5, armorDefense: 2 }))).toMatchObject({ attack: 23, defense: 9 })
    expect(stats(buildPayload({ ...input, hero: null }))).toMatchObject({ attack: null, defense: null })
  })
})

describe('first-run and companion QR fields', () => {
  it('welcomes a brand-new hero with a QR to the companion', () => {
    expect(pick(buildPayload(input))).toMatchObject({ first_run: true, qr_base: 'https://art.test/art/qr/v3/app', qr_label: 'Scan to open your companion' })
  })

  it('drops the welcome once the first adventure is logged', () => {
    const p = pick(buildPayload({ ...input, logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Beat a Paper Imp. +8 XP, +3 gold.' }] }))
    expect(p).toMatchObject({ first_run: false, qr_base: '' })
  })

  it('points a full bag at the bag, and setup at the companion', () => {
    expect(pick(buildPayload({ ...input, hero: { ...input.hero!, status: 'sleeping' }, heldItemName: 'Rare Mace' })).qr_base).toBe('https://art.test/art/qr/v3/bag')
    expect(pick(buildPayload({ ...input, hero: null }))).toMatchObject({ status: 'unlinked', first_run: false, qr_base: 'https://art.test/art/qr/v3/app' })
  })

  it('always links an active hero to the bag, with nothing needing doing', () => {
    const p = pick(buildPayload({ ...input, logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Beat a Paper Imp. +8 XP, +3 gold.' }] }))
    expect(p).toMatchObject({ qr_base: '', companion_qr_base: 'https://art.test/art/qr/v3/bag' })
    expect(pick(buildPayload({ ...input, hero: null })).companion_qr_base).toBe('')
    expect(pick(buildPayload({ ...input, artBaseUrl: null })).companion_qr_base).toBe('')
    // D88: the full layout's corner code goes to the companion home; unlinked payloads and missing art carry none.
    const home = (p: unknown) => (p as { home_qr_base: string }).home_qr_base
    expect(home(buildPayload(input))).toBe('https://art.test/art/qr/v3/home')
    expect(home(buildPayload({ ...input, hero: null }))).toBe('')
    expect(home(buildPayload({ ...input, artBaseUrl: null }))).toBe('')
    // D108: the OG landscape's corner-cut twin of the same short link.
    const corner = (p: unknown) => (p as { corner_qr_base: string }).corner_qr_base
    expect(corner(buildPayload(input))).toBe('https://art.test/art/qr/v3/corner')
    expect(corner(buildPayload({ ...input, hero: null }))).toBe('')
    expect(corner(buildPayload({ ...input, artBaseUrl: null }))).toBe('')
  })
})

describe('board rows (D89)', () => {
  it('sends the first ten rows as top10 and keeps top5 as the first five', () => {
    const top = Array.from({ length: 12 }, (_, i) => ({ rank: i + 1, name: `P${i + 1}`, hero_name: `H${i + 1}`, level: 5, score: 1000 - i }))
    const ranking = { rank: 3, rankDelta: null, status: 'ranked' as const, cohortKey: '4-7', cohortLabel: 'Levels 4-7', score: 998, scoreAt: NOW, asOfTick: 1, builtAt: NOW, windowStart: NOW - 7 * 86_400_000, totalPlayers: 12, globalTotalPlayers: 12, top }
    const p = buildPayload({ ...input, ranking }) as unknown as { top5: Array<{ rank: number }>; top10: Array<{ rank: number; class: string }> }
    expect(TOP_ROWS).toBe(10)
    expect(p.top10.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(p.top5.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5])
    expect(p.top10[0]!.class).toBe('warrior')
    const empty = buildPayload({ ...input, ranking: null }) as unknown as { top5: unknown[]; top10: unknown[] }
    expect([empty.top5, empty.top10]).toEqual([[], []])
  })
})

describe('log lines and celebrations (D44)', () => {
  const played = { ...input, logs: Array.from({ length: 12 }, (_, i) => ({ at: NOW - (i + 1) * 900_000, kind: 'combat', summary: `Fight ${i}.` })) }

  it('carries up to twenty logs with UTC seconds for the HH:MM label', () => {
    const log = (buildPayload({ ...played, logs: Array.from({ length: 24 }, (_, i) => ({ at: NOW - (i + 1) * 900_000, kind: 'combat', summary: `Fight ${i}.` })) }) as unknown as { log: Array<{ u: number; s: string }> }).log
    expect(MAX_LOGS).toBe(20)
    expect(log).toHaveLength(20)
    expect(log[0]).toMatchObject({ u: (NOW - 900_000) / 1000, s: 'Fight 0.' })
  })

  it('adds separate story and stat fields while preserving the legacy summary', () => {
    const summary = 'Unplugged a [[Cable Serpent]]. +14 XP, +5 gold.'
    const p = buildPayload({ ...input, logs: [{ at: NOW, kind: 'combat', summary, deltas: { xpEarned: 14, gold: 5, hp: -12 } }] })
    expect(p.log[0]).toMatchObject({ s: 'Unplugged a [[Cable Serpent]]. +14 XP, +5 gold.', n: 'Unplugged a [[Cable Serpent]].', d: '+14 XP · +5 gold · −12 HP' })
  })

  it('cheers the big moments only', () => {
    expect(celebrationFor({ kind: 'levelup' }, 6)).toBe('Level up! Now level 6')
    expect(celebrationFor({ kind: 'combat', outcome: { variant: 'combat', elite: true, outcome: 'victory' } }, 6)).toBe('Elite defeated!')
    expect(celebrationFor({ kind: 'combat', outcome: { variant: 'combat', elite: true, outcome: 'retreat' } }, 6)).toBeNull()
    expect(celebrationFor({ kind: 'loot', outcome: { variant: 'loot', found: 'gold', jackpot: true } }, 6)).toBe('Jackpot!')
    expect(celebrationFor({ kind: 'loot', outcome: { variant: 'loot', found: 'gear', rarity: 'rare', jackpot: false } }, 6)).toBe('Rare find!')
    expect(celebrationFor({ kind: 'loot', outcome: { variant: 'loot', found: 'gear', rarity: 'uncommon', jackpot: false } }, 6)).toBeNull()
    expect(celebrationFor(null, 6)).toBeNull()
  })

  it('stays quiet behind an attention message', () => {
    const celebration = (p: unknown) => (p as { celebration: string | null }).celebration
    expect(celebration(buildPayload({ ...played, latestEvent: { kind: 'levelup' } }))).toBe('Level up! Now level 1')
    expect(celebration(buildPayload({ ...played, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear', rarity: 'epic' } } }))).toBe('Epic find!')
    expect(celebration(buildPayload({ ...played, latestEvent: { kind: 'levelup' }, world: { ...input.world!, maintenanceMode: true } }))).toBeNull()
  })
})

describe('status times (D45)', () => {
  const status = (p: unknown) => p as { status_label: string; status_eta_at: number | null; status_eta_label: string }

  it('gives a knocked-out hero a real return time and a tick-free fallback', () => {
    const p = status(buildPayload({ ...input, hero: { ...input.hero!, status: 'dead', hp: 0, lastTick: 1, reviveAtTick: 6 } }))
    expect(p).toMatchObject({ status_label: 'Knocked out. Back in about 1 h 15 min', status_eta_label: 'Knocked out, back at' })
    expect(p.status_eta_at).toBe(Date.UTC(2026, 9, 4, 9, 30) / 1000)
  })

  it('names areas in bold and has no time while exploring', () => {
    expect(status(buildPayload(input))).toMatchObject({ status_label: 'Exploring the [[Office Cubicles]]', status_eta_at: null, status_eta_label: '' })
    const travelling = status(buildPayload({ ...input, hero: { ...input.hero!, status: 'travelling', lastTick: 1, targetBiomeId: 'server_room', arriveAtTick: 2 } }))
    expect(travelling).toMatchObject({ status_eta_label: 'To the [[Server Room]], arriving', status_eta_at: Date.UTC(2026, 9, 4, 8, 30) / 1000 })
  })

  it('carries the stance for the HUD under a catalog that has stances, and leaves the status alone (D103)', () => {
    const withStances = { ...input, content: contentV3 }
    expect(buildPayload(withStances)).toMatchObject({ stance: 'balanced', stance_name: 'Balanced', status_label: 'Exploring the [[Office Cubicles]]' })
    expect(buildPayload({ ...withStances, hero: { ...input.hero!, status: 'paused', stance: 'bold' } })).toMatchObject({ stance: 'bold', stance_name: 'Bold' })
    expect(buildPayload(input)).toMatchObject({ stance: '', stance_name: '' })
    expect(buildPayload({ ...input, hero: null })).toMatchObject({ stance: '', stance_name: '' })
  })

  it('leads the story list with the destination and arrival while travelling', () => {
    const logs = Array.from({ length: MAX_LOGS }, (_, i) => ({ at: NOW - (i + 1) * 60_000, kind: 'system', summary: `Story ${i}.` }))
    const travelling = { ...input, logs, latestEvent: { kind: 'levelup' }, hero: { ...input.hero!, status: 'travelling' as const, lastTick: 1, targetBiomeId: 'server_room', arriveAtTick: 2 } }
    const withOffset = buildPayload({ ...travelling, utcOffset: 7200 }) as unknown as { log: Array<{ k: string; n: string; u: number; d: string; live?: boolean }>; celebration: string | null }
    // D91: the owner-local arrival (08:30 UTC + 2 h) is part of the story, and `live` keeps the time column empty.
    expect(withOffset.log[0]).toMatchObject({ k: 'travel', n: 'Off to the [[Server Room]], arriving 10:30.', u: Date.UTC(2026, 9, 4, 8, 30) / 1000, d: '', live: true })
    expect(withOffset.log[1]!.live).toBeUndefined()
    expect(withOffset.log).toHaveLength(MAX_LOGS)
    expect(withOffset.log[1]!.n).toBe('Story 0.')
    expect(withOffset.celebration).toBeNull()
    const noOffset = buildPayload(travelling) as unknown as { log: Array<{ n: string }> }
    expect(noOffset.log[0]!.n).toBe('Off to the [[Server Room]].')
    const pending = buildPayload({ ...travelling, hero: { ...travelling.hero, lastTick: 2 } }) as unknown as { log: Array<{ n: string }> }
    expect(pending.log[0]!.n).toBe('Story 0.')
  })

  it('formats fallback durations', () => {
    expect([1, 3, 4, 5, 8].map(aboutDuration)).toEqual(['15 min', '45 min', '1 h', '1 h 15 min', '2 h'])
  })
})

describe('next tick time (D42)', () => {
  const next = (p: unknown) => (p as { next_tick_at: number | null }).next_tick_at
  it('gives the next quarter-hour slot in UTC seconds while the hero adventures', () => {
    expect(next(buildPayload(input))).toBe(Date.UTC(2026, 9, 4, 8, 30) / 1000)
    expect(next(buildPayload({ ...input, hero: { ...input.hero!, status: 'travelling', targetBiomeId: 'server_room', arriveAtTick: 2 } }))).toBe(Date.UTC(2026, 9, 4, 8, 30) / 1000)
  })

  it('promises nothing when the hero is stopped or the service is behind', () => {
    for (const status of ['paused', 'sleeping', 'dead'] as const) expect(next(buildPayload({ ...input, hero: { ...input.hero!, status } }))).toBeNull()
    expect(next(buildPayload({ ...input, world: { ...input.world!, lastCompletedAt: NOW - 3_600_000 } }))).toBeNull()
    expect(next(buildPayload({ ...input, world: { ...input.world!, maintenanceMode: true } }))).toBeNull()
    expect(next(buildPayload({ ...input, hero: null }))).toBeNull()
  })
})

describe('device recap privacy and compatibility', () => {
  it('omits a recap when no separate window was read, and never exposes one for an unlinked hero', () => {
    expect(buildPayload(input).recap).toBeNull()
    expect(buildPayload({ ...input, hero: null, activity: { entries: [], truncated: false } }).recap).toBeNull()
    // 08:20 UTC with no offset is the morning stand-up; with Johannesburg's offset too; at 20:00 local it is the retro (D75).
    expect(buildPayload({ ...input, activity: { entries: [], truncated: false } }).recap).toMatchObject({ label: 'Night recap', activity: 'No new adventures', from: Date.UTC(2026, 9, 3, 19) / 1000, to: Date.UTC(2026, 9, 4, 7) / 1000 })
    expect(buildPayload({ ...input, utcOffset: 7200, activity: { entries: [], truncated: false } }).recap).toMatchObject({ label: 'Night recap', to: Date.UTC(2026, 9, 4, 5) / 1000 })
    expect(buildPayload({ ...input, now: Date.UTC(2026, 9, 4, 18), utcOffset: 7200, activity: { entries: [], truncated: false } }).recap).toMatchObject({ label: 'Day recap', from: Date.UTC(2026, 9, 4, 5) / 1000, to: Date.UTC(2026, 9, 4, 17) / 1000 })
    expect(JSON.stringify(buildPayload({ ...input, activity: { entries: [], truncated: false } }).recap)).not.toContain('Last 12 hours')
  })
})

describe('to-do lines (D112)', () => {
  it('carry their count form only when one is given, and keep the label numbers', () => {
    const payload = buildPayload({ ...input, logs: [
      { at: NOW - 60_000, kind: 'todo', summary: 'Stand-up: Defeat 5 [[Leftovers Hydras]]. Earn 260 gold adventuring. Dodge 2 traps.', compact: 'Stand-up: 3 new tasks.', deltas: { xpEarned: 0, gold: 0, hp: 0 } },
      { at: NOW - 60_000, kind: 'todo', summary: 'Ticked off: Earn 50 gold adventuring.', deltas: { xpEarned: 0, gold: 16, hp: 0 } },
    ] }) as unknown as { log: Array<{ k: string; n: string; d: string; c?: string }> }
    expect(payload.log[0]).toMatchObject({ k: 'todo', c: 'Stand-up: 3 new tasks.', d: '' })
    expect(payload.log[1]).toMatchObject({ k: 'todo', n: 'Ticked off: Earn 50 gold adventuring.', d: '+16 gold' })
    expect(payload.log[1]).not.toHaveProperty('c')
  })
})
