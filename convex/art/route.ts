import { heroPoses, type HeroPose } from './hero'
import { monsterArt } from './monsters'
import { encodePng1Bit } from './png'
import { propArt, type PropId } from './props'
import { composeScene, FULL_SCALE, SCENE_VERSION, SMALL_SCALE, type BiomeArt, type Subject } from './scene'

const BIOMES = new Set<BiomeArt>(['office_cubicles', 'server_room', 'cafeteria_depths'])
const SCALES = new Set([FULL_SCALE, SMALL_SCALE])

/** Parse `/art/scene/v1/<biome>/<pose>/<subject>/<scale>.png` against strict allowlists. */
export function parseScenePath(path: string): { biome: BiomeArt; pose: HeroPose; subject: Subject; scale: number } | null {
  const match = /^\/art\/scene\/v(\d+)\/([a-z_]+)\/([a-z_]+)\/([a-z_-]+)\/(\d)\.png$/.exec(path)
  if (!match || Number(match[1]) !== SCENE_VERSION) return null
  const [, , biome, pose, segment, scaleText] = match as unknown as [string, string, string, string, string, string]
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
  return { biome: biome as BiomeArt, pose: pose as HeroPose, subject, scale }
}

export function renderScenePng(path: string): Uint8Array | null {
  const parsed = parseScenePath(path)
  if (!parsed) return null
  const { width, height, ink } = composeScene(parsed.biome, parsed.pose, parsed.subject).scaled(parsed.scale)
  return encodePng1Bit(width, height, ink)
}
