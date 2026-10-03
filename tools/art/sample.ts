/** Render one scene for review: pnpm tsx tools/art/sample.ts <biome> <pose> <subject-kind> <subject-id> <out.png> [elite] */
import { writeFileSync } from 'node:fs'
import { encodePng1Bit } from '../../convex/art/png'
import { composeScene, FULL_SCALE, type BiomeArt, type Subject } from '../../convex/art/scene'
import type { HeroPose } from '../../convex/art/hero'

const [, , biome, pose, kind, id, out, elite] = process.argv
const subject = (kind === 'monster' ? { kind, id, elite: elite === 'elite' } : kind === 'prop' ? { kind, id } : { kind: 'none' }) as Subject
const { width, height, ink } = composeScene(biome as BiomeArt, pose as HeroPose, subject).scaled(FULL_SCALE)
writeFileSync(out!, encodePng1Bit(width, height, ink))
console.log(`wrote ${out}`)
