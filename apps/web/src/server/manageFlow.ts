import { isGameSlug, type GameSlug } from '@trmnl-games/platform'
import { openJson } from './installFlow'

export const manageCookie = (gameSlug: GameSlug) => `tg_${gameSlug}_trmnl_manage`
export const MANAGE_HANDOFF_SECONDS = 10 * 60
export const INSTANCE_UUID = /^[0-9a-fA-F-]{8,64}$/
export interface ManagementHandoff { gameSlug: GameSlug; uuid: string; expiresAt: number }

export async function openManagement(cookie: string | undefined, secret: string, now: number, gameSlug: GameSlug): Promise<ManagementHandoff | null> {
  const value = await openJson(cookie, secret) as Partial<ManagementHandoff> | null
  if (!isGameSlug(gameSlug) || !value || value.gameSlug !== gameSlug || typeof value.uuid !== 'string' || !INSTANCE_UUID.test(value.uuid) || typeof value.expiresAt !== 'number' || value.expiresAt <= now) return null
  return value as ManagementHandoff
}
