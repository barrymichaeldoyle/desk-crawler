import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { getFunctionName } from 'convex/server'
import { installCookie, sealPendingInstall } from '../../apps/web/src/server/installFlow'

const mocks = vi.hoisted(() => ({ cookies: new Map<string, string>(), auth: vi.fn(), action: vi.fn(), query: vi.fn(), setAuth: vi.fn(), deleteCookie: vi.fn() }))
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => ({ inputValidator: () => ({ handler: (fn: unknown) => fn }) }) }))
vi.mock('@tanstack/react-start/server', () => ({
  getCookie: (name: string) => mocks.cookies.get(name),
  setCookie: (name: string, value: string) => mocks.cookies.set(name, value),
  deleteCookie: (name: string) => { mocks.deleteCookie(name); mocks.cookies.delete(name) },
}))
vi.mock('@clerk/tanstack-react-start/server', () => ({ auth: mocks.auth }))
vi.mock('convex/browser', () => ({ ConvexHttpClient: class { setAuth = mocks.setAuth; action = mocks.action; query = mocks.query } }))
// Load registered server modules through Vite, like the Convex integration suite.
// Their production types are checked under the app tsconfigs, not the stricter pure-simulator config.
type ServerFunction = (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
const serverModules = import.meta.glob<Record<string, ServerFunction>>('../../apps/web/src/server/{installFns,manageFns}.ts')
const { captureInstall, finishInstall, getPendingInstall } = await serverModules['../../apps/web/src/server/installFns.ts']!() as Record<'captureInstall' | 'finishInstall' | 'getPendingInstall', ServerFunction>
const { captureManagement, getManagedInstance } = await serverModules['../../apps/web/src/server/manageFns.ts']!() as Record<'captureManagement' | 'getManagedInstance', ServerFunction>
const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const UUID = 'ae48d6ac-48f4-4aed-8464-bad68368e97c'
const CALLBACK = 'https://trmnl.com/callback?installation=example'
let keys: Awaited<ReturnType<typeof generateKeyPair>>
let jwks: object
beforeAll(async () => {
  keys = await generateKeyPair('RS256', { extractable: true })
  jwks = { keys: [{ ...await exportJWK(keys.publicKey), kid: 'handoff-proof', alg: 'RS256', use: 'sig' }] }
})
const proof = () => new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'handoff-proof' }).setSubject(UUID).setAudience('client_test').setIssuedAt().setExpirationTime('2m').sign(keys.privateKey)

// Framework/auth/transport seams are mocked; cookie crypto and signed JWT validation are real.
describe('returning-player browser handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.cookies.clear()
    vi.stubEnv('INSTALL_FLOW_KEY', KEY); vi.stubEnv('TRMNL_CLIENT_ID', 'client_test'); vi.stubEnv('VITE_CONVEX_URL', 'https://test.convex.cloud')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(jwks), { headers: { 'Content-Type': 'application/json' } })))
    mocks.auth.mockResolvedValue({ userId: 'user_returning', getToken: async () => 'signed-convex-token' })
    mocks.query.mockResolvedValue(null)
    mocks.action.mockResolvedValue({ activationState: 'pending_trmnl', heroCreated: false, reconnectionRequired: true })
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('preserves the encrypted install flow and exact callback for retry/reload until Configure', async () => {
    expect(await captureInstall({ data: { gameSlug: 'desk-crawler', code: 'provider-code', callback: CALLBACK } })).toEqual({ ok: true })
    for (let i = 0; i < 2; i++) {
      expect(await finishInstall({ data: { gameSlug: 'desk-crawler', publicAlias: 'Player', heroName: 'Hero' } })).toEqual({ ok: true, callbackUrl: CALLBACK, reconnectionRequired: true })
      expect((await getPendingInstall({ data: { gameSlug: 'desk-crawler' } })).pending).toBe(true)
    }
    expect(mocks.deleteCookie).not.toHaveBeenCalled()
    expect(mocks.setAuth).toHaveBeenCalledWith('signed-convex-token')
    mocks.query.mockResolvedValue({ id: 'owned-draft', expiresAt: Date.now() + 60_000 })
    const jwt = await proof()
    expect(await captureManagement({ data: { gameSlug: 'desk-crawler', uuid: UUID, jwt } })).toEqual({ ok: true })
    expect(getFunctionName(mocks.action.mock.calls.at(-1)![0])).toBe('trmnl:verifyReconnection')
    expect(mocks.action.mock.calls.at(-1)![1]).toEqual({ attemptId: 'owned-draft', uuid: UUID, jwt })
    expect((await getPendingInstall({ data: { gameSlug: 'desk-crawler' } })).pending).toBe(false)
    expect(await getManagedInstance({ data: { gameSlug: 'desk-crawler' } })).toEqual({ uuid: UUID })
  })

  it('keeps ordinary first-time install and management behavior without requiring reconnection', async () => {
    await captureInstall({ data: { gameSlug: 'desk-crawler', code: 'provider-code', callback: CALLBACK } })
    mocks.action.mockResolvedValue({ activationState: 'pending_trmnl', heroCreated: true })
    expect(await finishInstall({ data: { gameSlug: 'desk-crawler', publicAlias: 'Player', heroName: 'Hero' } })).toEqual({ ok: true, callbackUrl: CALLBACK })
    expect((await getPendingInstall({ data: { gameSlug: 'desk-crawler' } })).pending).toBe(false)
    mocks.action.mockClear()
    expect(await captureManagement({ data: { gameSlug: 'desk-crawler', uuid: UUID, jwt: await proof() } })).toEqual({ ok: true })
    expect(mocks.action).not.toHaveBeenCalled()
  })

  it('never records a reconnect proof while signed out; backend proof rejection cannot become a usable handoff', async () => {
    mocks.auth.mockResolvedValue({ userId: null, getToken: async () => null })
    expect(await captureManagement({ data: { gameSlug: 'desk-crawler', uuid: UUID, jwt: await proof() } })).toEqual({ ok: true })
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.action).not.toHaveBeenCalled()
    mocks.cookies.clear()
    mocks.auth.mockResolvedValue({ userId: 'user_returning', getToken: async () => 'signed-convex-token' })
    mocks.query.mockResolvedValue({ id: 'owned-draft', expiresAt: Date.now() + 60_000 })
    mocks.action.mockRejectedValue(new Error('expired or foreign proof'))
    expect(await captureManagement({ data: { gameSlug: 'desk-crawler', uuid: UUID, jwt: await proof() } })).toEqual({ ok: false })
    expect(await getManagedInstance({ data: { gameSlug: 'desk-crawler' } })).toEqual({ uuid: null })
  })

  it('refuses forged management URLs and expired or tampered install cookies before authenticated backend calls', async () => {
    expect(await captureManagement({ data: { gameSlug: 'desk-crawler', uuid: UUID, jwt: 'forged' } })).toEqual({ ok: false })
    for (const cookie of ['tampered', await sealPendingInstall({ gameSlug: 'desk-crawler', code: 'provider-code', callbackUrl: CALLBACK, expiresAt: Date.now() - 1 }, KEY)]) {
      mocks.cookies.set(installCookie('desk-crawler'), cookie)
      expect(await finishInstall({ data: { gameSlug: 'desk-crawler' } })).toMatchObject({ ok: false, code: 'INSTALL_EXPIRED' })
    }
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.action).not.toHaveBeenCalled()
  })
})
