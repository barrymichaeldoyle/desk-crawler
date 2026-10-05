import type { HeroPose } from './hero'
import { SCENE_VERSION, type SceneTime } from './sceneTime'

/**
 * Pure mapping from hero state + latest gameplay event to the scene shown on
 * the device (revision 12). The key is part of an immutable image URL.
 */
export type SceneSubject =
  | { kind: 'monster'; id: string; elite: boolean }
  | { kind: 'prop'; id: 'chest' | 'gold' | 'potion' | 'gear' | 'trap' | 'campfire' | 'level_up' | 'full_bag' | 'signpost' }
  | { kind: 'none' }

export interface LatestEvent {
  readonly kind: string
  readonly outcome?: { readonly variant: string; readonly [key: string]: unknown }
}

export function sceneFor(status: string, hasWake: boolean, latest: LatestEvent | null): { pose: HeroPose; subject: SceneSubject } {
  const outcome = latest?.outcome
  const monster = outcome?.variant === 'combat' ? { kind: 'monster' as const, id: String(outcome.monsterId), elite: outcome.elite === true } : null
  switch (status) {
    case 'dead':
      return { pose: 'knocked_out', subject: monster ?? { kind: 'prop', id: 'trap' } }
    case 'sleeping':
      return hasWake ? { pose: 'walk', subject: { kind: 'prop', id: 'signpost' } } : { pose: 'sleep', subject: { kind: 'prop', id: 'full_bag' } }
    case 'paused':
    case 'resting':
      return { pose: 'rest', subject: { kind: 'prop', id: 'campfire' } }
    case 'travelling':
      return { pose: 'walk', subject: { kind: 'prop', id: 'signpost' } }
  }
  if (latest?.kind === 'levelup') return { pose: 'idle', subject: { kind: 'prop', id: 'level_up' } }
  if (monster) return { pose: 'fight', subject: monster }
  if (outcome?.variant === 'loot') {
    if (outcome.found === 'gear') return { pose: 'idle', subject: { kind: 'prop', id: 'gear' } }
    if (outcome.found === 'potion') return { pose: 'idle', subject: { kind: 'prop', id: 'potion' } }
    return { pose: 'idle', subject: { kind: 'prop', id: outcome.jackpot === true ? 'gold' : 'chest' } }
  }
  if (outcome?.variant === 'trap') return { pose: 'idle', subject: { kind: 'prop', id: 'trap' } }
  if (outcome?.variant === 'rest') return { pose: 'rest', subject: { kind: 'prop', id: 'campfire' } }
  return { pose: 'idle', subject: { kind: 'none' } }
}

/** URL path segment for a subject: `monster-<id>`, `elite-<id>`, `prop-<id>` or `none`. */
export function subjectSegment(subject: SceneSubject): string {
  if (subject.kind === 'monster') return `${subject.elite ? 'elite' : 'monster'}-${subject.id}`
  if (subject.kind === 'prop') return `prop-${subject.id}`
  return 'none'
}

export const scenePath = (biomeId: string, pose: HeroPose, subject: SceneSubject, scale: number, time: SceneTime = 'day') =>
  `/art/scene/v${SCENE_VERSION}/${biomeId}/${time}/${pose}/${subjectSegment(subject)}/${scale}.png`
