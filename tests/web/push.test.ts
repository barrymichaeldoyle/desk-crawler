import { afterEach, describe, expect, it, vi } from 'vitest'
import { activeRegistration, subscribePush } from '../../apps/web/src/lib/push'

/** A fake service worker that moves through the states it is given, one per tick. */
function fakeWorker(states: string[]) {
  const listeners: Array<() => void> = []
  const worker = { state: states[0]!, addEventListener: (_: string, fn: () => void) => listeners.push(fn) }
  let i = 0
  const advance = () => {
    i += 1
    if (i >= states.length) return
    worker.state = states[i]!
    listeners.forEach((fn) => fn())
    setTimeout(advance, 10)
  }
  setTimeout(advance, 10)
  return worker
}

const subscription = { endpoint: 'https://push.example/x', getKey: () => new Uint8Array([1, 2, 3]).buffer }

function container(worker: ReturnType<typeof fakeWorker> | null, subscribe = async () => subscription) {
  return { register: async () => ({ active: null, installing: worker, waiting: null, pushManager: { getSubscription: async () => null, subscribe } }) } as unknown as ServiceWorkerContainer
}

describe('push subscription setup (Settings → Allow on this device)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("waits for the registration's own worker to activate, without navigator.serviceWorker.ready", async () => {
    const registration = await activeRegistration(container(fakeWorker(['installing', 'installed', 'activating', 'activated'])))
    expect(registration).toBeDefined()
  })

  it('fails instead of hanging when the worker never activates or a step never settles', async () => {
    vi.stubGlobal('Notification', { requestPermission: async () => 'granted' })
    expect(await subscribePush('AQAB', container(fakeWorker(['installing'])), 50)).toBe('failed')
    expect(await subscribePush('AQAB', container(fakeWorker(['installing', 'redundant'])), 1000)).toBe('failed')
    expect(await subscribePush('AQAB', container(fakeWorker(['installing', 'activated']), () => new Promise(() => {})), 50)).toBe('failed')
  })

  it('returns the subscription once the worker is active', async () => {
    vi.stubGlobal('Notification', { requestPermission: async () => 'granted' })
    expect(await subscribePush('AQAB', container(fakeWorker(['installing', 'activated'])), 1000)).toMatchObject({ endpoint: 'https://push.example/x', p256dh: 'AQID', auth: 'AQID' })
  })
})
