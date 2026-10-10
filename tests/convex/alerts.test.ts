// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import type { SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'
import { SLOT_MS } from '../../apps/backend/convex/sim/runs/tick'
import { ALERTS, inQuietHours, localDay, merchantDeal, queueAlerts, quietEndsAt } from '../../apps/backend/convex/lib/alerts'
import { purgeAlertRows } from '../../apps/backend/convex/alerts'
import { runTick, seedHero, seedWorld, type T } from './helpers'

// The real library needs Node's crypto; the sender's outcome is what these tests check.
const sent: Array<{ endpoint: string; payload: string }> = []
let pushStatus: number | null = null
vi.mock('../../apps/backend/node_modules/web-push/src/index.js', () => ({
  default: {
    sendNotification: async (subscription: { endpoint: string }, payload: string) => {
      if (pushStatus !== null) throw Object.assign(new Error('push failed'), { statusCode: pushStatus })
      sent.push({ endpoint: subscription.endpoint, payload })
      return { statusCode: 201 }
    },
  },
}))

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
// 10:00 UTC on a Wednesday, outside the default 21:00 to 08:00 quiet hours.
const SLOT = Date.UTC(2026, 9, 7, 10, 0, 2)
let op = 0
const opId = () => `alert-op-${String(++op).padStart(6, '0')}`
const as = (t: T, alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })
const KEYS = { p256dh: 'BOr8m7Qx1y0w4n-_example_p256dh_key_material_0123456789abcdefghijklmnopqrstuvwxyz', auth: 'auth_secret_0123456' }
const endpoint = (n: number) => `https://push.example.com/send/${n}`

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return (error as { data?: { code?: string } }).data?.code
  }
}

async function subscribe(t: T, alias: string, n: number, label = 'Chrome on Android') {
  return await as(t, alias).mutation(api.alerts.subscribe, { operationId: opId(), endpoint: endpoint(n), label, ...KEYS })
}

async function enable(t: T, alias: string, prefs: Partial<{ asleep: boolean; merchant: boolean; quietStart: number; quietEnd: number; timezone: string }> = {}) {
  return await as(t, alias).mutation(api.alerts.setPreferences, { operationId: opId(), asleep: true, merchant: true, quietStart: 21, quietEnd: 8, timezone: 'UTC', ...prefs })
}

const userOf = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => (await ctx.db.get((await ctx.db.get(heroId))!.userId))!)
const outbox = (t: T) => t.run(async (ctx) => await ctx.db.query('alertOutbox').collect())

/** A tick result shaped like the core's, with only what the alert rules read. */
function result(next: { status: string; gold: number }, offers?: Array<{ id: 'potions' | 'bag' | 'pouch'; name: string; price: number }>): SimulationResult {
  return {
    nextHero: next,
    ...(offers === undefined ? {} : { event: { kind: 'merchant', summary: '', deltas: { xpEarned: 0, gold: 0, hp: 0 }, detail: { outcome: { variant: 'merchant', offers: offers.map((offer) => ({ ...offer, quantity: 1 })), expiresAtTick: 14 } } } }),
  } as unknown as SimulationResult
}

describe('alert rules (P33)', () => {
  it('fires the merchant alert only for a bag or pouch the hero can afford', () => {
    expect(merchantDeal(result({ status: 'exploring', gold: 999 }, [{ id: 'potions', name: '3 healing potions', price: 30 }]))).toBeUndefined()
    expect(merchantDeal(result({ status: 'exploring', gold: 100 }, [{ id: 'potions', name: 'Healing potion', price: 10 }, { id: 'bag', name: 'Messenger Bag', price: 150 }]))).toBeUndefined()
    expect(merchantDeal(result({ status: 'exploring', gold: 150 }, [{ id: 'bag', name: 'Messenger Bag', price: 150 }]))).toEqual({ id: 'bag', name: 'Messenger Bag' })
    expect(merchantDeal(result({ status: 'exploring', gold: 200 }, [{ id: 'pouch', name: 'Lunchbox', price: 120 }, { id: 'bag', name: 'Rolling Suitcase', price: 2000 }]))).toEqual({ id: 'pouch', name: 'Lunchbox' })
    expect(merchantDeal(result({ status: 'exploring', gold: 999 }))).toBeUndefined()
  })

  it('reads quiet hours in the browser timezone, across midnight and DST', () => {
    const prefs = { quietStart: 21, quietEnd: 8 }
    expect(inQuietHours(Date.UTC(2026, 9, 7, 22, 0), 'UTC', prefs)).toBe(true)
    expect(inQuietHours(Date.UTC(2026, 9, 7, 7, 59), 'UTC', prefs)).toBe(true)
    expect(inQuietHours(Date.UTC(2026, 9, 7, 8, 0), 'UTC', prefs)).toBe(false)
    // 10:00 UTC is 21:00 in Sydney (UTC+11 in October).
    expect(inQuietHours(Date.UTC(2026, 9, 7, 10, 0), 'Australia/Sydney', prefs)).toBe(true)
    expect(quietEndsAt(Date.UTC(2026, 9, 7, 22, 10), 'UTC', prefs)).toBe(Date.UTC(2026, 9, 8, 8, 0))
    // India is UTC+5:30, so its 08:00 is 02:30 UTC.
    expect(quietEndsAt(Date.UTC(2026, 9, 7, 20, 0), 'Asia/Kolkata', prefs)).toBe(Date.UTC(2026, 9, 8, 2, 30))
    // New York leaves DST on 1 November 2026: 08:00 that morning is 13:00 UTC, not 12:00.
    expect(quietEndsAt(Date.UTC(2026, 10, 1, 4, 0), 'America/New_York', prefs)).toBe(Date.UTC(2026, 10, 1, 13, 0))
    // A window inside one day.
    expect(inQuietHours(Date.UTC(2026, 9, 7, 13, 0), 'UTC', { quietStart: 12, quietEnd: 14 })).toBe(true)
    expect(localDay(Date.UTC(2026, 9, 7, 23, 0), 'Asia/Tokyo')).toBe('2026-10-08')
  })
})

describe('alerts backend (P33)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    vi.stubEnv('VAPID_PUBLIC_KEY', 'BPublicKeyForTests')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'private-key-for-tests')
    sent.length = 0
    pushStatus = null
    t = convexTest(schema, modules)
    await seedWorld(t, { currentTick: 10 })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('starts off, needs a device before a kind turns on, and lists devices without their endpoints', async () => {
    await seedHero(t, {}, 'Ana')
    expect(await as(t, 'Ana').query(api.alerts.mine, {})).toMatchObject({ asleep: false, merchant: false, quietStart: 21, quietEnd: 8, devices: [], vapidPublicKey: 'BPublicKeyForTests' })
    expect(await errorCode(enable(t, 'Ana'))).toBe('INVALID_STATE')
    expect(await errorCode(enable(t, 'Ana', { asleep: false, merchant: false, quietStart: 9, quietEnd: 9 }))).toBe('INVALID_INPUT')
    await subscribe(t, 'Ana', 1)
    expect(await enable(t, 'Ana', { merchant: false, timezone: 'Europe/Dublin' })).toMatchObject({ changed: true })
    const mine = await as(t, 'Ana').query(api.alerts.mine, {})
    expect(mine).toMatchObject({ asleep: true, merchant: false, timezone: 'Europe/Dublin', devices: [{ label: 'Chrome on Android' }] })
    expect(JSON.stringify(mine)).not.toContain('push.example.com')
  })

  it('keeps at most five devices and moves an endpoint to the account that saved it last', async () => {
    await seedHero(t, {}, 'Bo')
    await seedHero(t, {}, 'Cy')
    for (let n = 1; n <= 6; n += 1) {
      vi.setSystemTime(SLOT + n * 1000)
      await subscribe(t, 'Bo', n, `Device ${n}`)
    }
    const bo = await as(t, 'Bo').query(api.alerts.mine, {})
    expect(bo!.devices.map((device) => device.label).sort()).toEqual(['Device 2', 'Device 3', 'Device 4', 'Device 5', 'Device 6'])
    await subscribe(t, 'Cy', 6)
    expect((await as(t, 'Bo').query(api.alerts.mine, {}))!.devices).toHaveLength(4)
    expect((await as(t, 'Cy').query(api.alerts.mine, {}))!.devices).toHaveLength(1)
  })

  it('removing the last device turns every kind off', async () => {
    await seedHero(t, {}, 'Di')
    await subscribe(t, 'Di', 1)
    await enable(t, 'Di')
    const [device] = (await as(t, 'Di').query(api.alerts.mine, {}))!.devices
    await as(t, 'Di').mutation(api.alerts.removeDevice, { operationId: opId(), deviceId: device!.id })
    expect(await as(t, 'Di').query(api.alerts.mine, {})).toMatchObject({ asleep: false, merchant: false, offReason: null, devices: [] })
  })

  it('a retried tick inserts each alert once, and a potion-only or unaffordable visit inserts nothing', async () => {
    const heroId = await seedHero(t, { gold: 100 }, 'Ed')
    await subscribe(t, 'Ed', 1)
    await enable(t, 'Ed')
    const owner = await userOf(t, heroId)
    await t.run(async (ctx) => {
      const hero = (await ctx.db.get(heroId))!
      const now = Date.now()
      await queueAlerts(ctx, { owner, hero, result: result({ status: 'exploring', gold: 100 }, [{ id: 'potions', name: 'Healing potion', price: 10 }]), tick: 11, now })
      await queueAlerts(ctx, { owner, hero, result: result({ status: 'exploring', gold: 100 }, [{ id: 'bag', name: 'Messenger Bag', price: 150 }]), tick: 12, now })
      const asleep = result({ status: 'sleeping', gold: 100 })
      await queueAlerts(ctx, { owner, hero, result: asleep, tick: 13, now })
      await queueAlerts(ctx, { owner, hero, result: asleep, tick: 13, now })
    })
    const rows = await outbox(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'asleep', eventTick: 13, state: 'pending', notBefore: SLOT + ALERTS.asleepDelayMs })
  })

  it('writes the asleep alert from a real tick and pushes it after the 30-minute wait', { timeout: 30_000 }, async () => {
    const heroId = await seedHero(t, {}, 'Flo')
    // A full six-slot bag, so the next gear find sends the hero to sleep.
    await t.run(async (ctx) => {
      for (let i = 0; i < 6; i += 1) await ctx.db.insert('items', { ...starterKit(contentV1).weapon, heroId, createdAt: Date.now() })
    })
    await subscribe(t, 'Flo', 1)
    await enable(t, 'Flo', { merchant: false })
    let slot = 0
    let hero = await t.run(async (ctx) => (await ctx.db.get(heroId))!)
    for (; slot < 300 && hero.status !== 'sleeping'; slot += 1) {
      vi.setSystemTime(SLOT + slot * SLOT_MS)
      await runTick(t)
      hero = await t.run(async (ctx) => (await ctx.db.get(heroId))!)
    }
    expect(hero.status).toBe('sleeping')
    // runTick finishes every scheduled function, the sender included, so the wait has run out by now.
    const rows = await outbox(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'asleep', eventTick: hero.lastTick, state: 'sent', attempts: 1 })
    expect(sent).toHaveLength(1)
    expect(JSON.parse(sent[0]!.payload)).toMatchObject({ body: "Baz's bag is full, so they've stopped for a nap. Make room to send them back out.", url: '/app/desk-crawler/inventory?alert=asleep' })
  })

  /** Insert an outbox row due now for the hero. */
  async function queued(heroId: Id<'heroes'>, kind: 'asleep' | 'merchant', eventTick: number, extra: Record<string, unknown> = {}) {
    return await t.run(async (ctx) => {
      const hero = (await ctx.db.get(heroId))!
      return await ctx.db.insert('alertOutbox', { userId: hero.userId, heroId, kind, key: `${heroId}:${kind}:${eventTick}`, eventTick, state: 'pending', attempts: 0, notBefore: Date.now(), createdAt: Date.now(), updatedAt: Date.now(), ...extra })
    })
  }
  const row = (id: Id<'alertOutbox'>) => t.run(async (ctx) => (await ctx.db.get(id))!)
  const deliver = async () => {
    await t.action(internal.alertsPush.deliver, {})
  }

  it('rechecks before sending: a woken hero and a bought offer are skipped', async () => {
    const heroId = await seedHero(t, { status: 'exploring', gold: 500, merchant: { offers: [{ id: 'potions', name: 'Healing potion', quantity: 1, price: 10 }], expiresAtTick: 14, biomeId: 'office' } }, 'Gus')
    await subscribe(t, 'Gus', 1)
    await enable(t, 'Gus')
    const asleep = await queued(heroId, 'asleep', 9)
    const merchant = await queued(heroId, 'merchant', 10, { offerId: 'bag', offerName: 'Messenger Bag' })
    await deliver()
    expect(await row(asleep)).toMatchObject({ state: 'skipped', reason: 'woke' })
    expect(await row(merchant)).toMatchObject({ state: 'skipped', reason: 'offer_gone' })
    expect(sent).toHaveLength(0)
  })

  it('holds a nap alert until quiet hours end, drops a merchant alert, and caps two a day with one merchant', async () => {
    const offers = [{ id: 'bag' as const, name: 'Messenger Bag', quantity: 1, price: 150, tierId: 'messenger' }]
    const heroId = await seedHero(t, { status: 'sleeping', gold: 500, merchant: { offers, expiresAtTick: 14, biomeId: 'office' } }, 'Hal')
    await subscribe(t, 'Hal', 1)
    // 22:00 UTC: inside the default quiet hours.
    vi.setSystemTime(Date.UTC(2026, 9, 7, 22, 0))
    await enable(t, 'Hal')
    const nap = await queued(heroId, 'asleep', 9)
    const deal = await queued(heroId, 'merchant', 10, { offerId: 'bag', offerName: 'Messenger Bag' })
    await deliver()
    expect(await row(nap)).toMatchObject({ state: 'pending', notBefore: Date.UTC(2026, 9, 8, 8, 0) })
    expect(await row(deal)).toMatchObject({ state: 'skipped', reason: 'quiet_hours' })

    vi.setSystemTime(Date.UTC(2026, 9, 8, 8, 0))
    await deliver()
    expect(await row(nap)).toMatchObject({ state: 'sent', localDay: '2026-10-08' })
    const first = await queued(heroId, 'merchant', 11, { offerId: 'bag', offerName: 'Messenger Bag' })
    await deliver()
    expect(await row(first)).toMatchObject({ state: 'sent' })
    expect(JSON.parse(sent.at(-1)!.payload).body).toBe('A merchant is selling Baz a Messenger Bag, and they have the gold. The offer lasts about an hour.')
    // Two pushes today already: the third is skipped, not queued.
    const third = await queued(heroId, 'asleep', 12)
    await deliver()
    expect(await row(third)).toMatchObject({ state: 'skipped', reason: 'daily_cap' })
    expect(sent).toHaveLength(2)
  })

  it('a revoked permission removes the device, and the last one turns alerts off with a reason', async () => {
    const heroId = await seedHero(t, { status: 'sleeping' }, 'Ivy')
    await subscribe(t, 'Ivy', 1)
    await enable(t, 'Ivy')
    const nap = await queued(heroId, 'asleep', 9)
    pushStatus = 410
    await deliver()
    expect(await row(nap)).toMatchObject({ state: 'skipped', reason: 'no_devices' })
    expect(await as(t, 'Ivy').query(api.alerts.mine, {})).toMatchObject({ asleep: false, merchant: false, offReason: 'no_devices', devices: [] })
    // Allowing a device again clears the reason.
    await subscribe(t, 'Ivy', 2)
    expect(await as(t, 'Ivy').query(api.alerts.mine, {})).toMatchObject({ offReason: null })
  })

  it('retries a failed push twice with backoff, then stops', async () => {
    const heroId = await seedHero(t, { status: 'sleeping' }, 'Jo')
    await subscribe(t, 'Jo', 1)
    await enable(t, 'Jo')
    const nap = await queued(heroId, 'asleep', 9)
    pushStatus = 500
    await deliver()
    expect(await row(nap)).toMatchObject({ state: 'pending', attempts: 1, notBefore: SLOT + ALERTS.retryMs })
    vi.setSystemTime(SLOT + ALERTS.retryMs)
    await deliver()
    expect(await row(nap)).toMatchObject({ state: 'pending', attempts: 2, notBefore: SLOT + 3 * ALERTS.retryMs })
    vi.setSystemTime(SLOT + 3 * ALERTS.retryMs)
    await deliver()
    expect(await row(nap)).toMatchObject({ state: 'failed', attempts: 3, reason: 'push_failed' })
  })

  it('Desk Crawler removal deletes preferences, devices and outbox rows', async () => {
    const heroId = await seedHero(t, { status: 'sleeping' }, 'Kit')
    await subscribe(t, 'Kit', 1)
    await enable(t, 'Kit')
    await queued(heroId, 'asleep', 9)
    await as(t, 'Kit').mutation(api.deletion.requestGameDeletion, { operationId: opId(), confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const left = await t.run(async (ctx) => ({
      outbox: (await ctx.db.query('alertOutbox').collect()).length,
      devices: (await ctx.db.query('pushSubscriptions').collect()).length,
      prefs: (await ctx.db.query('users').collect()).map((user) => user.alerts ?? null),
    }))
    expect(left).toEqual({ outbox: 0, devices: 0, prefs: [null] })
    expect(await t.run(async (ctx) => await purgeAlertRows(ctx, (await ctx.db.query('users').first())!._id, 10))).toBe(0)
  })

  it('cleans outbox rows after seven days', async () => {
    const heroId = await seedHero(t, {}, 'Lu')
    await queued(heroId, 'asleep', 9, { state: 'sent', createdAt: SLOT - ALERTS.retentionMs - 1 })
    await queued(heroId, 'asleep', 10, { state: 'skipped' })
    await t.mutation(internal.maintenance.cleanup, { job: 'alerts' })
    expect((await outbox(t)).map((entry) => entry.eventTick)).toEqual([10])
  })
})
