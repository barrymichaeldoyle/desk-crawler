import { heroPoses, type HeroPose } from './hero'
import { monsterArt } from './monsters'
import { encodePng1Bit } from './png'
import { propArt, type PropId } from './props'
import { composeScene, FULL_SCALE, LARGE_SCALE, MEDIUM_SCALE, SCENE_VERSION, SMALL_SCALE, type BiomeArt, type Subject } from './scene'
import type { SceneTime } from './sceneTime'

const BIOMES = new Set<BiomeArt>(['office_cubicles', 'server_room', 'cafeteria_depths'])
const SCALES = new Set([FULL_SCALE, SMALL_SCALE, LARGE_SCALE, MEDIUM_SCALE])

/** Strict v4 day/night paths plus frozen v3 night paths for cached screens and rolling releases. */
export function parseScenePath(path: string): { biome: BiomeArt; pose: HeroPose; subject: Subject; scale: number; time: SceneTime } | null {
  const match = /^\/art\/scene\/v(\d+)\/([a-z_]+)\/(?:(day|night)\/)?([a-z_]+)\/([a-z_-]+)\/(\d)\.png$/.exec(path)
  if (!match) return null
  const [, versionText, biome, timeText, pose, segment, scaleText] = match
  if (!biome || !pose || !segment || !scaleText) return null
  const version = Number(versionText)
  if (!((version === SCENE_VERSION && timeText) || (version === 3 && !timeText))) return null
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
  return { biome: biome as BiomeArt, pose: pose as HeroPose, subject, scale, time: (timeText ?? 'night') as SceneTime }
}

export function renderScenePng(path: string): Uint8Array | null {
  const parsed = parseScenePath(path)
  if (!parsed) return null
  const { width, height, ink } = composeScene(parsed.biome, parsed.pose, parsed.subject, parsed.time).scaled(parsed.scale)
  return encodePng1Bit(width, height, ink)
}
