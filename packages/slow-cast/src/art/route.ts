import { encodePng1Bit } from '@trmnl-games/engine/art/png'
import { qrInk } from '@trmnl-games/engine/art/qr'
import type { TimeBand, WaterId, Weather } from '../sim/types'
import { anglerPoses, type AnglerPose } from './angler'
import { Canvas } from '@trmnl-games/engine/art/canvas'
import { FISH_LARGE, FISH_TRAITS, fishSprite } from './fish'
import { FLIES } from '../content/flies'
import { composeScene, SCENE_VERSION, type SceneKey } from './scene'

/**
 * Slow Cast art paths, served by the Convex art route under `/art/sc/` (slow-cast.md "Device"):
 *   /art/sc/scene/v2/<water>/<band>/<weather>/<pose>/<fish|none>/<fly|nofly>/<scale>.png
 *   /art/sc/qr/v1/<target>/<scale>.png
 *   /art/sc/fish/v1/<species>/<scale>.png   (template v2's newest-catch panel)
 * Every part is allowlisted, so the route can never draw arbitrary text or mint arbitrary codes.
 */
const WATERS = new Set<WaterId>(['millpond', 'river_bend', 'harbour_pier'])
const BANDS = new Set<TimeBand>(['dawn', 'day', 'dusk', 'night'])
const WEATHERS = new Set<Weather>(['clear', 'overcast', 'rain', 'wind', 'fog'])
/** Whole-number scales only, so pixels stay crisp: 1 for narrow portrait columns up to 10 for the X's full view. */
export const SCENE_SCALES = new Set([1, 2, 3, 4, 5, 6, 8, 10])

export const QR_VERSION = 1
export const QR_SCALES = new Set([2, 3, 4, 5, 7])
/** `home` encodes the `/sc` short link to the dock; `cooler` opens the cooler, for a full one. */
export const QR_TARGETS = { home: '/sc', cooler: '/app/slow-cast/cooler' } as const
export type QrTarget = keyof typeof QR_TARGETS

export function sceneBase(key: SceneKey): string {
  return `/art/sc/scene/v${SCENE_VERSION}/${key.water}/${key.band}/${key.weather}/${key.pose}/${key.pose === 'holding' && key.fish ? key.fish : 'none'}/${key.fly ?? 'nofly'}`
}

export const qrBase = (target: QrTarget) => `/art/sc/qr/v${QR_VERSION}/${target}`

export const FISH_VERSION = 1
/** The large catalogue sprite (30x12) at whole-number scales: 3 for the OG's portrait panel up to 8 for the X. */
export const FISH_SCALES = new Set([2, 3, 4, 5, 6, 8])
export const fishBase = (speciesId: string) => `/art/sc/fish/v${FISH_VERSION}/${speciesId}`

export function parseScenePath(path: string): (SceneKey & { scale: number }) | null {
  const match = /^\/art\/sc\/scene\/v(\d+)\/([a-z_]+)\/([a-z]+)\/([a-z]+)\/([a-z]+)\/([a-z_]+)\/([a-z_]+)\/(\d+)\.png$/.exec(path)
  if (!match || Number(match[1]) !== SCENE_VERSION) return null
  const [, , water, band, weather, pose, fish, fly, scaleText] = match
  if (fly !== 'nofly' && !FLIES.some((f) => f.id === fly)) return null
  const scale = Number(scaleText)
  if (!WATERS.has(water as WaterId) || !BANDS.has(band as TimeBand) || !WEATHERS.has(weather as Weather) || !(pose! in anglerPoses) || !SCENE_SCALES.has(scale)) return null
  if (fish !== 'none' && !(fish! in FISH_TRAITS)) return null
  if ((pose === 'holding') !== (fish !== 'none') && fish !== 'none') return null
  return { water: water as WaterId, band: band as TimeBand, weather: weather as Weather, pose: pose as AnglerPose, fish: fish === 'none' ? null : fish!, fly: fly === 'nofly' ? null : fly!, scale }
}

export function renderSlowCastArt(path: string, origin: string): { png: Uint8Array; immutable: boolean } | null {
  const qr = /^\/art\/sc\/qr\/v(\d+)\/([a-z]+)\/(\d)\.png$/.exec(path)
  if (qr) {
    const target = qr[2] as QrTarget
    const scale = Number(qr[3])
    if (Number(qr[1]) !== QR_VERSION || !(target in QR_TARGETS) || !QR_SCALES.has(scale)) return null
    const { size, ink } = qrInk(`${origin}${QR_TARGETS[target]}`, scale)
    return { png: encodePng1Bit(size, size, ink), immutable: false }
  }
  const fish = /^\/art\/sc\/fish\/v(\d+)\/([a-z_]+)\/(\d)\.png$/.exec(path)
  if (fish) {
    const scale = Number(fish[3])
    if (Number(fish[1]) !== FISH_VERSION || !(fish[2]! in FISH_TRAITS) || !FISH_SCALES.has(scale)) return null
    const canvas = new Canvas(FISH_LARGE.width, FISH_LARGE.height)
    canvas.draw(fishSprite(fish[2]!, FISH_LARGE.width, FISH_LARGE.height), 0, 0)
    const { width, height, ink } = canvas.scaled(scale)
    return { png: encodePng1Bit(width, height, ink), immutable: true }
  }
  const parsed = parseScenePath(path)
  if (!parsed) return null
  const { width, height, ink } = composeScene(parsed).scaled(parsed.scale)
  return { png: encodePng1Bit(width, height, ink), immutable: true }
}
