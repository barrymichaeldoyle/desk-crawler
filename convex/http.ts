import { httpRouter } from 'convex/server'
import { internal } from './_generated/api'
import { httpAction } from './_generated/server'
import { sha256Hex } from './lib/hash'
import { screenMarkup } from './templates/screen'

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
    return json(200, { ...screenMarkup, merge_variables: result.payload })
  }),
})

export default http
