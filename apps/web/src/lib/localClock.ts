import { useEffect, useState } from 'react'
import { sceneTimeAt, sceneUrlAt } from '@trmnl-games/desk-crawler/art/sceneTime'

/** Minute-rounded clock so queries stay cacheable and labels refresh like the device's. Null until hydrated. */
export function useMinute(): number | null {
  const [minute, setMinute] = useState<number | null>(null)
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') setMinute(Math.floor(Date.now() / 60_000) * 60_000) }
    update()
    const timer = window.setInterval(update, 15_000)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [])
  return minute
}

/** The browser's offset in seconds east of UTC, standing in for the owner's TRMNL timezone. */
export const browserUtcOffset = (now: number | null) => now === null ? null : -new Date(now).getTimezoneOffset() * 60

/** A scene URL with the sky for the viewer's local time; daylight until the clock hydrates. */
export function localSceneUrl(url: string, now: number | null): string {
  return sceneUrlAt(url, sceneTimeAt(now ?? 0, browserUtcOffset(now)))
}
