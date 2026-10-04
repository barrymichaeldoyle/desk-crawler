import { describe, expect, it } from 'vitest'
import { installCookie, openPendingInstall, sealJson, sealPendingInstall } from '../../apps/web/src/server/installFlow'
import { manageCookie, openManagement } from '../../apps/web/src/server/manageFlow'
import type { GameSlug } from '@trmnl-games/platform'

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const NOW = Date.UTC(2026, 9, 4, 10, 0)
const UUID = 'ae48d6ac-48f4-4aed-8464-bad68368e97c'

describe('game-scoped TRMNL handoff cookies', () => {
  it('names each cookie after its game', () => {
    expect(installCookie('desk-crawler')).toBe('tg_desk-crawler_trmnl_install')
    expect(manageCookie('desk-crawler')).toBe('tg_desk-crawler_trmnl_manage')
  })

  it('opens a pending install only for the game it was sealed for, and only until it expires', async () => {
    const sealed = await sealPendingInstall({ gameSlug: 'desk-crawler', code: 'abc', callbackUrl: 'https://trmnl.com/cb', expiresAt: NOW + 60_000 }, KEY)
    expect(await openPendingInstall(sealed, KEY, NOW, 'desk-crawler')).toMatchObject({ code: 'abc' })
    expect(await openPendingInstall(sealed, KEY, NOW + 60_001, 'desk-crawler')).toBeNull()
    expect(await openPendingInstall(sealed, KEY, NOW, 'other-game' as GameSlug)).toBeNull()

    const foreign = await sealJson({ gameSlug: 'other-game', code: 'abc', callbackUrl: 'https://trmnl.com/cb', expiresAt: NOW + 60_000 }, KEY)
    expect(await openPendingInstall(foreign, KEY, NOW, 'desk-crawler')).toBeNull()
  })

  it('opens a management handoff only for its own game', async () => {
    const sealed = await sealJson({ gameSlug: 'desk-crawler', uuid: UUID, expiresAt: NOW + 60_000 }, KEY)
    expect(await openManagement(sealed, KEY, NOW, 'desk-crawler')).toMatchObject({ uuid: UUID })
    const foreign = await sealJson({ gameSlug: 'other-game', uuid: UUID, expiresAt: NOW + 60_000 }, KEY)
    expect(await openManagement(foreign, KEY, NOW, 'desk-crawler')).toBeNull()
    expect(await openManagement(undefined, KEY, NOW, 'desk-crawler')).toBeNull()
  })
})
