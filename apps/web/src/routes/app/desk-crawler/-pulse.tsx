import { useEffect, useState } from 'react'
import { nextSlotAfter, slotEta, wallSlotFor, SLOT_MS } from '@trmnl-games/desk-crawler/sim/schedule'

const STATUS_GLYPH: Record<string, string> = { exploring: 'combat', resting: 'rest', travelling: 'travel', dead: 'death', paused: 'system', sleeping: 'loot' }

export type PulseHero = {
  status: string
  simulationState: string
  biomeName: string
  targetName: string
  arriveAtTick: number | null
  reviveAtTick: number | null
  wakeAtTick: number | null
  world: { currentTick: number; lastCompletedTick: number | null; lastCompletedAt: number | null; lastStartedWallSlot: number | null; paused: boolean } | null
}

/** Ticking clock, null until mounted so SSR and hydration agree. */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') setNow(Date.now()) }, intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

const clock = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

function sentence(hero: PulseHero): string {
  switch (hero.status) {
    case 'exploring':
      return `Exploring the ${hero.biomeName}`
    case 'resting':
      return `Resting in the ${hero.biomeName}`
    case 'travelling':
      return `Travelling to the ${hero.targetName}`
    case 'dead':
      return 'Knocked out'
    case 'paused':
      return 'Paused by you'
    case 'sleeping':
      return hero.wakeAtTick !== null ? 'Ready to resume' : 'Adventures stopped for your bag'
    default:
      return 'Adventuring'
  }
}

/**
 * What the hero is doing and when the next adventure lands. Calm by design: no
 * urgency, and delays are explained without blaming the player (PRODUCT.md).
 */
export function usePulse(hero: PulseHero): { glyph: string; sentence: string; detail: string | null; countdown: string | null } {
  const now = useNow()
  const world = hero.world
  let detail: string | null = null
  // The HUD's next-adventure box is reserved whenever adventures are scheduled, so it never
  // appears or vanishes on hydration: the server render shows a blank clock in its place.
  const scheduled = hero.simulationState !== 'quarantined' && !world?.paused && world !== null && hero.status !== 'paused' && hero.status !== 'sleeping'
  let next: string | null = scheduled ? '--:--' : null
  if (hero.simulationState === 'quarantined') detail = 'Paused for a service check.'
  else if (world?.paused) detail = 'Paused for maintenance.'
  else if (now !== null && world) {
    const slot = wallSlotFor(now)
    const running = world.lastCompletedTick !== world.currentTick || (world.lastStartedWallSlot ?? 0) < slot
    const late = world.lastCompletedAt !== null && now - world.lastCompletedAt > 2 * SLOT_MS
    const ticksTo = (tick: number | null) => (tick === null ? null : Math.max(1, tick - world.currentTick))
    if (late) detail = 'Running late. Your hero joins the next adventure.'
    else if (hero.status === 'paused') detail = 'No adventures until you resume.'
    else if (hero.status === 'sleeping') detail = hero.wakeAtTick !== null ? 'Resume is scheduled for the next adventure.' : 'Manage your bag, then choose Resume.'
    else if (running && now - slot < 5 * 60_000) detail = 'Adventuring now…'
    else if (hero.status === 'travelling' && ticksTo(hero.arriveAtTick)) detail = `Arrives about ${clock(slotEta(now, ticksTo(hero.arriveAtTick)!))}`
    else if (hero.status === 'dead' && ticksTo(hero.reviveAtTick)) detail = `Back on their feet about ${clock(slotEta(now, ticksTo(hero.reviveAtTick)!))}`
    if (scheduled) next = running && now - slot < 5 * 60_000 ? 'Now' : countdown(nextSlotAfter(now) - now)
  }
  return { glyph: STATUS_GLYPH[hero.status] ?? 'system', sentence: sentence(hero), detail, countdown: next }
}
