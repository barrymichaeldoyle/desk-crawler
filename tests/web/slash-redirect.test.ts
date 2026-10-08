import { describe, expect, it } from 'vitest'
import { permanentSlashRedirect } from '../../apps/web/src/server/slashRedirect'

const redirect = (location: string, status = 307) => new Response(null, { status, headers: { Location: location } })

describe('trailing-slash redirects', () => {
  it.each([
    ['/help/desk-crawler/', '/help/desk-crawler'],
    ['/games/desk-crawler/', 'https://trmnlgames.com/games/desk-crawler'],
    ['/privacy/?ref=x', '/privacy?ref=x'],
  ])('makes the slash-stripping redirect from %s permanent', (path, location) => {
    const response = permanentSlashRedirect(new Request('https://trmnlgames.com' + path), redirect(location))
    expect(response.status).toBe(308)
    expect(response.headers.get('Location')).toBe(location)
  })
  it('leaves every other redirect and response alone', () => {
    const cases: Array<[string, Response]> = [
      ['/help/desk-crawler/', redirect('/support')],
      ['/connect/trmnl/desk-crawler/install/?code=secret', redirect('/connect/trmnl/desk-crawler/install')],
      ['/app/', redirect('/app', 302)],
      ['/help/desk-crawler', redirect('/help/desk-crawler')],
      ['/', redirect('/')],
      ['/help/desk-crawler/', redirect('https://evil.example/help/desk-crawler')],
      ['/help/desk-crawler/', new Response('page')],
    ]
    for (const [path, original] of cases) expect(permanentSlashRedirect(new Request('https://trmnlgames.com' + path), original)).toBe(original)
  })
})
