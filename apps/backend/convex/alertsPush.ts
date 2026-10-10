'use node'

import webpush from 'web-push'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalAction } from './_generated/server'

/**
 * P33 sender: claim due alerts, push each to every device of its account as Web Push (VAPID, aes128gcm) and record
 * the outcome. Runs only while the outbox has due rows; the claim and record transactions schedule the next run.
 */
function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  return publicKey && privateKey ? { subject: process.env.VAPID_SUBJECT ?? 'https://trmnlgames.com/support', publicKey, privateKey } : null
}

/** Push one payload to one device: 'sent', 'gone' for 404/410 (permission revoked or subscription expired), else 'failed'. */
async function push(device: { endpoint: string; p256dh: string; auth: string }, payload: string, ttlSeconds: number, vapidDetails: NonNullable<ReturnType<typeof vapid>>): Promise<'sent' | 'gone' | 'failed'> {
  try {
    await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, { vapidDetails, TTL: ttlSeconds, urgency: 'normal', contentEncoding: 'aes128gcm', timeout: 10_000 })
    return 'sent'
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'gone'
    console.warn(`alert push failed with status ${status ?? 'none'}`)
    return 'failed'
  }
}

export const deliver = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sends = await ctx.runMutation(internal.alerts.claimDue, {})
    if (sends.length === 0) return null
    const vapidDetails = vapid()
    if (vapidDetails === null) console.warn('alert push skipped: VAPID keys are not configured')
    const results: Array<{ outboxId: Id<'alertOutbox'>; delivered: number; gone: Array<Id<'pushSubscriptions'>> }> = []
    for (const send of sends) {
      let delivered = 0
      const gone: Array<Id<'pushSubscriptions'>> = []
      if (vapidDetails !== null) {
        for (const device of send.subscriptions) {
          const outcome = await push(device, send.payload, send.ttlSeconds, vapidDetails)
          if (outcome === 'sent') delivered += 1
          // The browser revoked the permission or the subscription expired: forget this device.
          if (outcome === 'gone') gone.push(device.id)
        }
      }
      results.push({ outboxId: send.outboxId, delivered, gone })
    }
    await ctx.runMutation(internal.alerts.recordResults, { results })
    return null
  },
})

/**
 * Operator check: push a plainly labelled test alert to every device of one account, outside the outbox, its caps and
 * quiet hours. Run from the dashboard or `npx convex run alertsPush:sendTest`.
 */
export const sendTest = internalAction({
  args: { tokenIdentifier: v.string() },
  returns: v.object({ devices: v.number(), sent: v.number(), gone: v.number() }),
  handler: async (ctx, { tokenIdentifier }): Promise<{ devices: number; sent: number; gone: number }> => {
    const vapidDetails = vapid()
    const devices: Array<{ endpoint: string; p256dh: string; auth: string }> = await ctx.runQuery(internal.alerts.devicesForTest, { tokenIdentifier })
    if (vapidDetails === null) return { devices: devices.length, sent: 0, gone: 0 }
    const payload = JSON.stringify({ title: 'Desk Crawler test alert', body: 'Alerts work on this device.', url: '/app/desk-crawler/settings', tag: 'test' })
    let sent = 0
    let gone = 0
    for (const device of devices) {
      const outcome = await push(device, payload, 600, vapidDetails)
      if (outcome === 'sent') sent += 1
      if (outcome === 'gone') gone += 1
    }
    return { devices: devices.length, sent, gone }
  },
})
