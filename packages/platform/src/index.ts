/** Public platform configuration: no credentials or backend-only exports. */
export const PLATFORM_NAME = 'TRMNL Games'
export const PLATFORM_ORIGIN = 'https://trmnlgames.com'
export const DESK_CRAWLER_GAME = 'desk-crawler' as const
export type GameSlug = typeof DESK_CRAWLER_GAME
export const games = {
  [DESK_CRAWLER_GAME]: {
    slug: DESK_CRAWLER_GAME,
    name: 'Desk Crawler',
    description: 'An office RPG that plays itself on your TRMNL.',
    publicPath: '/games/desk-crawler',
    companionPath: '/app/desk-crawler',
    helpPath: '/help/desk-crawler',
    installPath: '/connect/trmnl/desk-crawler/install',
    managePath: '/connect/trmnl/desk-crawler/manage',
    clientIdEnv: 'TRMNL_CLIENT_ID',
  },
} as const
export function isGameSlug(value: unknown): value is GameSlug {
  return value === DESK_CRAWLER_GAME
}
