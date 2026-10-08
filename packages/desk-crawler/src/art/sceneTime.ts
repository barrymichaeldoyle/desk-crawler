import { DAY_START_HOUR, NIGHT_START_HOUR } from '../lib/activityRecap'

/** Bump whenever scene art changes: each image URL is immutable. */
export const SCENE_VERSION = 4
export type SceneTime = 'day' | 'night'

/**
 * Cosmetic clock only, on the recap's day/night hours (D84). Offset is seconds east of UTC; a missing or invalid offset
 * reads UTC, as `recapPeriod` does, so the sky and the recap still turn together (D106).
 */
export function sceneTimeAt(now: number, utcOffset: number | null): SceneTime {
  if (!Number.isFinite(now)) return 'day'
  const offset = utcOffset !== null && Number.isInteger(utcOffset) && Math.abs(utcOffset) <= 14 * 3600 ? utcOffset : 0
  const hour = new Date(now + offset * 1000).getUTCHours()
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'day' : 'night'
}

/** Select the sky without changing the encounter, scale or asset origin. Older URLs stay intact. */
export function sceneUrlAt(url: string, time: SceneTime): string {
  return url.replace(new RegExp(`(/art/scene/v${SCENE_VERSION}/[a-z_]+/)(day|night)(/)`), `$1${time}$3`)
}

interface SceneUrls {
  readonly scene_url: string
  readonly scene_url_small: string
  readonly scene_url_large: string
  readonly scene_url_medium: string
}

export function sceneUrlsAt<T extends SceneUrls>(payload: T, now: number, utcOffset: number | null): T {
  const time = sceneTimeAt(now, utcOffset)
  return {
    ...payload,
    scene_url: sceneUrlAt(payload.scene_url, time),
    scene_url_small: sceneUrlAt(payload.scene_url_small, time),
    scene_url_large: sceneUrlAt(payload.scene_url_large, time),
    scene_url_medium: sceneUrlAt(payload.scene_url_medium, time),
  }
}
