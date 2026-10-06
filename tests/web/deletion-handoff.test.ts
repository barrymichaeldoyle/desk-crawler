import { describe, expect, it } from 'vitest'
import { openDeletionLink } from '../../apps/web/src/server/deletionFlow'
import { sealJson } from '../../apps/web/src/server/installFlow'

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const NOW = Date.UTC(2026, 9, 6, 12)

describe('sealed deletion email proof', () => {
  it('opens only a valid, unexpired deletion proof and refuses tampered cookies', async () => {
    const value = { token: 'a'.repeat(64), expiresAt: NOW + 60_000 }
    const sealed = await sealJson(value, KEY)
    expect(await openDeletionLink(sealed, KEY, NOW)).toEqual(value)
    expect(await openDeletionLink(sealed, KEY, NOW + 60_000)).toBeNull()
    expect(await openDeletionLink(undefined, KEY, NOW)).toBeNull()
    expect(await openDeletionLink(sealed.slice(0, 25) + 'bad', KEY, NOW)).toBeNull()
    for (const invalid of [null, { token: 'bad', expiresAt: NOW + 60_000 }, { token: value.token, expiresAt: 'later' }, { code: value.token, expiresAt: NOW + 60_000 }]) {
      expect(await openDeletionLink(await sealJson(invalid, KEY), KEY, NOW)).toBeNull()
    }
  })
})
