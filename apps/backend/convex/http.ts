import { httpRouter } from 'convex/server'
import { internal } from './_generated/api'
import { httpAction } from './_generated/server'
import { sha256Hex } from './lib/hash'
import { verifySvix } from './lib/svix'
import { renderScenePng } from '@trmnl-games/desk-crawler/art/route'
import { sceneUrlsAt } from '@trmnl-games/desk-crawler/art/sceneTime'
import { DEFAULT_COMPANION_ORIGIN, renderQrPng } from '@trmnl-games/desk-crawler/art/qr'
import { parseUtcOffset, screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'

/**
 * TRMNL lifecycle and screen routes (trmnl.md). Every route authenticates the
 * installation bearer token first; unknown credentials, instances and owner
 * mismatches all answer the same generic 404. No bearer value is ever logged.
 */
const http = httpRouter()

const MAX_BODY_BYTES = 32 * 1024
const MAX_FORM_FIELDS = 64
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } })
const notFound = () => json(404, { error: 'not_found' })

function bearerHash(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? ''
  const match = /^Bearer ([\w.~+/=-]{8,512})$/.exec(header)
  return match ? sha256Hex(match[1]!) : null
}

async function readBoundedText(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0')
  if (declared > MAX_BODY_BYTES) return null
  const text = await request.text()
  return new TextEncoder().encode(text).length > MAX_BODY_BYTES ? null : text
}

const UUID = /^[0-9a-fA-F-]{8,64}$/

http.route({
  path: '/trmnl/install/success',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const tokenHash = bearerHash(request)
    if (tokenHash === null) return notFound()
    const text = await readBoundedText(request)
    if (text === null) return json(413, { error: 'too_large' })
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return json(400, { error: 'invalid_json' })
    }
    const user = typeof body === 'object' && body !== null && 'user' in body ? (body as { user: unknown }).user : null
    const uuid = typeof user === 'object' && user !== null && 'uuid' in user ? String((user as { uuid: unknown }).uuid) : ''
    const settingRaw = typeof user === 'object' && user !== null && 'plugin_setting_id' in user ? (user as { plugin_setting_id: unknown }).plugin_setting_id : undefined
    if (!UUID.test(uuid)) return json(400, { error: 'invalid_body' })
    // Only uuid and plugin_setting_id are kept; name/email/profile fields are ignored.
    const pluginSettingId = typeof settingRaw === 'number' || typeof settingRaw === 'string' ? String(settingRaw).slice(0, 64) : undefined
    const result = await ctx.runMutation(internal.trmnl.confirmInstance, {
      tokenHash,
      uuid,
      ...(pluginSettingId === undefined ? {} : { pluginSettingId }),
      confirmedBy: 'success_callback',
    })
    if (result.reason === 'unknown_grant' || result.reason === 'foreign_instance') return notFound()
    return json(200, { ok: true })
  }),
})

http.route({
  path: '/trmnl/uninstall',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const tokenHash = bearerHash(request)
    if (tokenHash === null) return notFound()
    const text = await readBoundedText(request)
    if (text === null) return json(413, { error: 'too_large' })
    let uuid = ''
    try {
      const body = JSON.parse(text) as { user_uuid?: unknown }
      uuid = String(body.user_uuid ?? '')
    } catch {
      return json(400, { error: 'invalid_json' })
    }
    if (!UUID.test(uuid)) return json(400, { error: 'invalid_body' })
    const found = await ctx.runMutation(internal.trmnl.uninstallInstance, { tokenHash, uuid })
    return found ? json(200, { ok: true }) : notFound()
  }),
})

http.route({
  path: '/trmnl/v1/screen',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const tokenHash = bearerHash(request)
    if (tokenHash === null) return notFound()
    if (!(request.headers.get('Content-Type') ?? '').startsWith('application/x-www-form-urlencoded')) return json(415, { error: 'unsupported_media_type' })
    const text = await readBoundedText(request)
    if (text === null) return json(413, { error: 'too_large' })
    const form = new URLSearchParams(text)
    if ([...form.keys()].length > MAX_FORM_FIELDS || form.getAll('user_uuid').length !== 1) return json(400, { error: 'invalid_body' })
    const uuid = form.get('user_uuid') ?? ''
    if (!UUID.test(uuid)) return json(400, { error: 'invalid_body' })
    const instanceName = form.get('trmnl[plugin_settings][instance_name]')

    const now = Date.now()
    const args = { tokenHash, uuid, now, instanceName: instanceName === null ? null : instanceName.slice(0, 200) }
    let result = await ctx.runQuery(internal.trmnlPayload.forInstance, args)
    if (result?.outcome === 'recoverable') {
      // Lost success callback: confirm a new instance only under a current pending attempt (V06).
      await ctx.runMutation(internal.trmnl.confirmInstance, { tokenHash, uuid, confirmedBy: 'screen_request' })
      result = await ctx.runQuery(internal.trmnlPayload.forInstance, args)
    }
    if (result === null || result.outcome !== 'payload') return notFound()
    // TRMNL does not expose its `trmnl` metadata to third-party Liquid, so pass the owner's offset through (D42).
    const utcOffset = parseUtcOffset(form.get('trmnl[user][utc_offset]'))
    return json(200, { ...screenMarkup, merge_variables: { ...sceneUrlsAt(result.payload, now, utcOffset), desk_keepsake_code: result.keepsakeCode, utc_offset: utcOffset } })
  }),
})

/**
 * Public, deterministic art for TRMNL screens. Scenes are immutable per URL
 * (versioned path); QR codes depend on COMPANION_ORIGIN, so they cache for a day.
 */
http.route({
  pathPrefix: '/art/',
  method: 'GET',
  handler: httpAction(async (_ctx, request) => {
    const path = new URL(request.url).pathname
    const isQr = path.startsWith('/art/qr/')
    const png = isQr ? renderQrPng(path, process.env.COMPANION_ORIGIN ?? DEFAULT_COMPANION_ORIGIN) : renderScenePng(path)
    if (png === null) return new Response('Not found', { status: 404 })
    const cache = isQr ? 'public, max-age=86400' : 'public, max-age=31536000, immutable'
    return new Response(new Blob([png.slice().buffer as ArrayBuffer], { type: 'image/png' }), { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': cache } })
  }),
})

/**
 * Clerk user.deleted reconciliation (api.md, V09). Signed with the endpoint's
 * Svix secret; anything unsigned, stale or oversized is refused before a
 * mutation runs. Other event types are acknowledged and ignored.
 */
http.route({
  path: '/auth/clerk/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) return json(503, { error: 'not_configured' })
    const text = await readBoundedText(request)
    if (text === null) return json(413, { error: 'too_large' })
    const headers = { id: request.headers.get('svix-id'), timestamp: request.headers.get('svix-timestamp'), signature: request.headers.get('svix-signature') }
    if (!(await verifySvix(secret, headers, text, Date.now()))) return json(401, { error: 'invalid_signature' })
    let event: { type?: unknown; data?: { id?: unknown } }
    try {
      event = JSON.parse(text) as typeof event
    } catch {
      return json(400, { error: 'invalid_json' })
    }
    if (event.type !== 'user.deleted') return json(200, { ok: true, ignored: true })
    const clerkUserId = typeof event.data?.id === 'string' ? event.data.id : ''
    if (!/^user_[A-Za-z0-9]{8,64}$/.test(clerkUserId)) return json(400, { error: 'invalid_body' })
    await ctx.runMutation(internal.deletion.providerDeleted, { clerkUserId })
    return json(200, { ok: true })
  }),
})

export default http
