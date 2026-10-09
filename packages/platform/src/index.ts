/** Public platform configuration: no credentials or backend-only exports. */
export const PLATFORM_NAME = 'TRMNL Games'
export const PLATFORM_ORIGIN = 'https://trmnlgames.com'
export const DESK_CRAWLER_GAME = 'desk-crawler' as const
export const SLOW_CAST_GAME = 'slow-cast' as const
export type GameSlug = typeof DESK_CRAWLER_GAME | typeof SLOW_CAST_GAME
export const GAME_SLUGS: readonly GameSlug[] = [DESK_CRAWLER_GAME, SLOW_CAST_GAME]

/**
 * Lifecycle status (slow-cast.md "Architecture"). `hidden`: nothing lists the game and its routes
 * answer not-found for everyone but admins. `preview`: a "Coming soon" tile, routes still closed.
 * `live`: listed everywhere, every route open. The server holds the current value; `defaultStatus`
 * applies only until an admin sets one.
 */
export type GameStatus = 'hidden' | 'preview' | 'live'
export const GAME_STATUSES: readonly GameStatus[] = ['hidden', 'preview', 'live']

export interface GameEntry {
  readonly slug: GameSlug
  readonly name: string
  readonly description: string
  readonly defaultStatus: GameStatus
  readonly publicPath: string
  readonly companionPath: string
  readonly helpPath: string
  readonly installPath: string
  readonly managePath: string
  readonly clientIdEnv: string
}

export const games = {
  [DESK_CRAWLER_GAME]: {
    slug: DESK_CRAWLER_GAME,
    name: 'Desk Crawler',
    description: 'An office RPG that plays itself on your TRMNL.',
    defaultStatus: 'live',
    publicPath: '/games/desk-crawler',
    companionPath: '/app/desk-crawler',
    helpPath: '/help/desk-crawler',
    installPath: '/connect/trmnl/desk-crawler/install',
    managePath: '/connect/trmnl/desk-crawler/manage',
    clientIdEnv: 'TRMNL_CLIENT_ID',
  },
  [SLOW_CAST_GAME]: {
    slug: SLOW_CAST_GAME,
    name: 'Slow Cast',
    description: 'A fishing game that plays itself on your TRMNL.',
    defaultStatus: 'hidden',
    publicPath: '/games/slow-cast',
    companionPath: '/app/slow-cast',
    helpPath: '/help/slow-cast',
    installPath: '/connect/trmnl/slow-cast/install',
    managePath: '/connect/trmnl/slow-cast/manage',
    clientIdEnv: 'TRMNL_CLIENT_ID_SLOW_CAST',
  },
} as const satisfies Record<GameSlug, GameEntry>

export function isGameSlug(value: unknown): value is GameSlug {
  return value === DESK_CRAWLER_GAME || value === SLOW_CAST_GAME
}

export function isGameStatus(value: unknown): value is GameStatus {
  return value === 'hidden' || value === 'preview' || value === 'live'
}

/**
 * Platform achievements (slow-cast.md "Platform profile and achievements"): earned across games, shown on the shared
 * profile. `games` counts games with an active character; `collected` counts achievements earned in every game.
 */
export interface PlatformAchievement {
  readonly id: string
  readonly family: 'regular' | 'collector'
  readonly tier: number
  readonly name: string
  readonly blurb: string
  readonly kind: 'games' | 'collected'
  readonly atLeast: number
}

export const PLATFORM_ACHIEVEMENTS: readonly PlatformAchievement[] = [
  { id: 'regular_1', family: 'regular', tier: 1, name: 'Regular', blurb: 'Plays two TRMNL Games.', kind: 'games', atLeast: 2 },
  { id: 'collector_1', family: 'collector', tier: 1, name: 'Collector', blurb: '25 achievements across games.', kind: 'collected', atLeast: 25 },
  { id: 'collector_2', family: 'collector', tier: 2, name: 'Curator', blurb: '100 achievements across games.', kind: 'collected', atLeast: 100 },
  { id: 'collector_3', family: 'collector', tier: 3, name: 'Archivist', blurb: '250 achievements across games.', kind: 'collected', atLeast: 250 },
]

export function platformAchievements(stats: { games: number; collected: number }): PlatformAchievement[] {
  return PLATFORM_ACHIEVEMENTS.filter((a) => (a.kind === 'games' ? stats.games : stats.collected) >= a.atLeast)
}
