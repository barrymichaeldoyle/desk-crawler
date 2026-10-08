import { heroPoses, type HeroPose } from './hero'
import { monsterArt } from './monsters'
import { encodePng1Bit, encodePngPalette } from './png'
import { propArt, type PropId } from './props'
import { composeScene, FULL_SCALE, LARGE_SCALE, MEDIUM_SCALE, SCENE_VERSION, scenePlacements, SMALL_SCALE, type BiomeArt, type Subject } from './scene'
import { BWRY_PALETTE, bwryInk, BwryInk, sceneColours } from './sceneColour'
import type { SceneTime } from './sceneTime'

const BIOMES = new Set<BiomeArt>(['office_cubicles', 'server_room', 'cafeteria_depths'])
const SCALES = new Set([FULL_SCALE, SMALL_SCALE, LARGE_SCALE, MEDIUM_SCALE])

/**
 * Strict v4 day/night paths plus frozen v3 night paths for cached screens and rolling releases. A `-bwry` scale suffix
 * (v4 only) asks for the four-ink image (D94).
 */
export function parseScenePath(path: string): { biome: BiomeArt; pose: HeroPose; subject: Subject; scale: number; time: SceneTime; bwry: boolean } | null {
  const match = /^\/art\/scene\/v(\d+)\/([a-z_]+)\/(?:(day|night)\/)?([a-z_]+)\/([a-z_-]+)\/(\d)(-bwry)?\.png$/.exec(path)
  if (!match) return null
  const [, versionText, biome, timeText, pose, segment, scaleText, bwrySuffix] = match
  if (!biome || !pose || !segment || !scaleText) return null
  const version = Number(versionText)
  if (!((version === SCENE_VERSION && timeText) || (version === 3 && !timeText && !bwrySuffix))) return null
  const scale = Number(scaleText)
  if (!BIOMES.has(biome as BiomeArt) || !(pose in heroPoses) || !SCALES.has(scale)) return null
  let subject: Subject
  if (segment === 'none') subject = { kind: 'none' }
  else if (segment.startsWith('monster-') || segment.startsWith('elite-')) {
    const id = segment.slice(segment.indexOf('-') + 1)
    if (!(id in monsterArt)) return null
    subject = { kind: 'monster', id: id as keyof typeof monsterArt, elite: segment.startsWith('elite-') }
  } else if (segment.startsWith('prop-')) {
    const id = segment.slice(5)
    if (!(id in propArt)) return null
    subject = { kind: 'prop', id: id as PropId }
  } else return null
  return { biome: biome as BiomeArt, pose: pose as HeroPose, subject, scale, time: (timeText ?? 'night') as SceneTime, bwry: bwrySuffix !== undefined }
}

export function renderScenePng(path: string): Uint8Array | null {
  const parsed = parseScenePath(path)
  if (!parsed) return null
  const { width, height, ink } = composeScene(parsed.biome, parsed.pose, parsed.subject, parsed.time).scaled(parsed.scale)
  if (!parsed.bwry) return encodePng1Bit(width, height, ink)
  // Ink stays ink; paper inside a sprite takes the companion's fill reduced to the panel's inks, and the rest is clear.
  const fills = sceneColours(parsed.pose, scenePlacements(parsed.pose, parsed.subject))
  const index = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    const row = fills[Math.floor(y / parsed.scale)]!
    for (let x = 0; x < width; x += 1) {
      const fill = row[Math.floor(x / parsed.scale)]
      index[y * width + x] = ink[y * width + x] ? BwryInk.Black : fill ? bwryInk(fill) : BwryInk.White
    }
  }
  return encodePngPalette(width, height, index, BWRY_PALETTE, BwryInk.White)
}
